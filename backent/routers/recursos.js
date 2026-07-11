const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/calcular-consumo', async (req, res) => {
    const { tipo, mes, anio } = req.query;
    try {
        const qFinal = `
            SELECT lectura_valor FROM consumos_recursos 
            WHERE tipo = $1 
            AND EXTRACT(MONTH FROM fecha_registro) = $2 
            AND EXTRACT(YEAR FROM fecha_registro) = $3
            ORDER BY fecha_registro DESC LIMIT 1`;
        const qInicial = `
            SELECT lectura_valor FROM consumos_recursos 
            WHERE tipo = $1 
            AND fecha_registro < MAKE_DATE($3, $2, 1)
            ORDER BY fecha_registro DESC LIMIT 1`;

        const resFinal = await pool.query(qFinal, [tipo, mes, anio]);
        const resInicial = await pool.query(qInicial, [tipo, mes, anio]);

        if (resFinal.rows.length > 0) {
            const final = parseFloat(resFinal.rows[0].lectura_valor);
            const inicial = resInicial.rows.length > 0 ? parseFloat(resInicial.rows[0].lectura_valor) : 0;
            const consumo = Number((final - inicial).toFixed(2));

            if (consumo < 0) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'El cálculo del mes seleccionado da un consumo negativo. Verifica las lecturas y la secuencia de meses.'
                });
            }

            res.json({
                success: true,
                lectura_inicial: inicial,
                lectura_final: final,
                consumo: consumo
            });
        } else {
            res.json({ success: false, mensaje: "No hay registros de lectura para este mes." });
        }
    } catch (e) {
        console.error("Error en módulo de cálculo:", e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Consumo acumulado: calcula consumo desde una fecha de inicio opcional hasta el mes/anio solicitados
router.get('/consumo-acumulado', async (req, res) => {
    const { tipo, mes, anio, desde_mes, desde_anio } = req.query;
    if (!tipo || !mes || !anio) return res.status(400).json({ success: false, mensaje: 'Faltan parámetros: tipo, mes, anio' });

    const inicioMes = desde_mes ? Number(desde_mes) : 1;
    const inicioAnio = desde_anio ? Number(desde_anio) : Number(anio);
    const finalMes = Number(mes);
    const finalAnio = Number(anio);

    const inicioIndex = inicioAnio * 12 + inicioMes;
    const finalIndex = finalAnio * 12 + finalMes;
    if (inicioIndex > finalIndex) {
        return res.status(400).json({
            success: false,
            mensaje: 'El mes de inicio debe ser anterior o igual al mes final para evitar consumos negativos.'
        });
    }

    try {
        const qFinal = `
            SELECT lectura_valor, fecha_registro FROM consumos_recursos
            WHERE tipo = $1
            AND EXTRACT(MONTH FROM fecha_registro) = $2
            AND EXTRACT(YEAR FROM fecha_registro) = $3
            ORDER BY fecha_registro DESC LIMIT 1`;

        const qInicial = `
            SELECT lectura_valor, fecha_registro FROM consumos_recursos
            WHERE tipo = $1
            AND fecha_registro < MAKE_DATE($2, $3, 1)
            ORDER BY fecha_registro DESC LIMIT 1`;

        const resFinal = await pool.query(qFinal, [tipo, finalMes, finalAnio]);
        const resInicial = await pool.query(qInicial, [tipo, inicioAnio, inicioMes]);

        if (resFinal.rows.length === 0) {
            return res.json({ success: false, mensaje: 'No hay lecturas para el mes final solicitado.' });
        }

        const final = parseFloat(resFinal.rows[0].lectura_valor);
        const inicial = resInicial.rows.length > 0 ? parseFloat(resInicial.rows[0].lectura_valor) : 0;
        const consumo = Number((final - inicial).toFixed(2));

        if (consumo < 0) {
            return res.status(400).json({
                success: false,
                mensaje: 'El rango seleccionado produce un consumo negativo. Verifica que los meses estén en orden y que no falten lecturas intermedias.'
            });
        }

        res.json({
            success: true,
            lectura_inicial: inicial,
            lectura_final: final,
            consumo: consumo,
            desde: { mes: inicioMes, anio: inicioAnio },
            hasta: { mes: finalMes, anio: finalAnio }
        });
    } catch (e) {
        console.error('Error en consumo-acumulado:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/registrogasto', async (req, res) => {
    try {
        const { tipo, lectura_valor, registrado_por } = req.body;
        const query = `
            INSERT INTO consumos_recursos (tipo, lectura_valor, fecha_registro, registrado_por) 
            VALUES ($1, $2, NOW(), $3)
        `;
        await pool.query(query, [tipo, lectura_valor, registrado_por]);
        res.status(201).json({ success: true, mensaje: 'Lectura guardada correctamente.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/verificarfecha', async (req, res) => {
    try {
        const query = `
            SELECT tipo, MAX(fecha_registro) as ultima_fecha
            FROM consumos_recursos
            GROUP BY tipo
        `;
        const resultado = await pool.query(query);
        res.json({ 
            success: true, 
            datos: resultado.rows 
        });
    } catch (error) {
        console.error("Error en VerificarFecha:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/ultimo-consumo/:tipo', async (req, res) => {
    const { tipo } = req.params;

    try {
        const query = `
            SELECT lectura_valor 
            FROM consumos_recursos 
            WHERE tipo = $1 
            ORDER BY fecha_registro DESC 
            LIMIT 1
        `;
        const resultado = await pool.query(query, [tipo]);

        if (resultado.rows.length > 0) {
            res.json({ 
                success: true, 
                ultimoValor: parseFloat(resultado.rows[0].lectura_valor) 
            });
        } else {
            res.json({ success: true, ultimoValor: 0 });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al consultar" });
    }
});

router.get('/listagastos', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id, c.tipo, c.lectura_valor, 
                TO_CHAR(c.fecha_registro, 'DD/MM/YYYY HH:MI AM') as fecha_lista,
                u.nombre 
            FROM consumos_recursos c
            JOIN usuarios u ON c.registrado_por = u.id
            ORDER BY c.fecha_registro DESC LIMIT 30
        `;
        const resultado = await pool.query(query);
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/consumo-todos-meses', async (req, res) => {
    const { tipo } = req.query;
    if (!tipo) {
        return res.status(400).json({ success: false, mensaje: 'Falta el tipo de recurso.' });
    }

    try {
        const query = `
            SELECT lectura_valor, fecha_registro
            FROM consumos_recursos
            WHERE tipo = $1
            ORDER BY fecha_registro ASC
        `;
        const resultado = await pool.query(query, [tipo]);

        if (resultado.rows.length === 0) {
            return res.json({ success: false, mensaje: 'No hay registros de consumo para este recurso.' });
        }

        const lecturasPorMes = {};
        resultado.rows.forEach((item) => {
            const fecha = new Date(item.fecha_registro);
            const mes = fecha.getMonth() + 1;
            const anio = fecha.getFullYear();
            const key = `${String(mes).padStart(2, '0')}/${anio}`;
            const lectura = parseFloat(item.lectura_valor);
            if (isNaN(lectura)) return;
            if (!lecturasPorMes[key] || lectura > lecturasPorMes[key].lectura) {
                lecturasPorMes[key] = { mes, anio, lectura };
            }
        });

        const mesesOrdenados = Object.values(lecturasPorMes).sort((a, b) => {
            return a.anio === b.anio ? a.mes - b.mes : a.anio - b.anio;
        });

        let anterior = null;
        const consumos = mesesOrdenados.map((item) => {
            const consumo = anterior !== null ? Number((item.lectura - anterior).toFixed(2)) : 0;
            anterior = item.lectura;
            return {
                mes: item.mes,
                anio: item.anio,
                total: consumo < 0 ? 0 : consumo
            };
        });

        res.json({ success: true, meses: consumos });
    } catch (error) {
        console.error('Error en consumo-todos-meses:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
