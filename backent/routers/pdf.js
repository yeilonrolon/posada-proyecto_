const express = require('express');
const router = express.Router();
const pool = require('../db');
const { generatePdfBuffer } = require('../pdfService');

const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const getMesNombre = (mes) => monthNames[mes - 1] || 'Mes desconocido';

const obtenerLecturasMes = async (tipo, mes, anio) => {
    const queryFinal = `
        SELECT lectura_valor FROM consumos_recursos
        WHERE tipo = $1
          AND EXTRACT(MONTH FROM fecha_registro) = $2
          AND EXTRACT(YEAR FROM fecha_registro) = $3
        ORDER BY fecha_registro DESC LIMIT 1`;

    const queryInicial = `
        SELECT lectura_valor FROM consumos_recursos
        WHERE tipo = $1
          AND fecha_registro < MAKE_DATE($3, $2, 1)
        ORDER BY fecha_registro DESC LIMIT 1`;

    const resFinal = await pool.query(queryFinal, [tipo, Number(mes), Number(anio)]);
    if (resFinal.rows.length === 0) {
        return null;
    }

    const resInicial = await pool.query(queryInicial, [tipo, Number(mes), Number(anio)]);
    const lecturaFinal = parseFloat(resFinal.rows[0].lectura_valor);
    const lecturaInicial = resInicial.rows.length > 0 ? parseFloat(resInicial.rows[0].lectura_valor) : 0;
    const consumo = Number((lecturaFinal - lecturaInicial).toFixed(2));

    if (consumo < 0) {
        return null;
    }

    return {
        lecturaInicial,
        lecturaFinal,
        consumo,
        mesNombre: getMesNombre(Number(mes)),
        anio: Number(anio),
    };
};

const buildTemplateData = async (report, params = {}) => {
    if (report === 'factura') {
        const { tipo, mes, anio } = params;
        if (!tipo || !mes || !anio) {
            throw new Error('Parámetros faltantes para factura: tipo, mes, anio');
        }
        const lecturas = await obtenerLecturasMes(tipo, mes, anio);
        if (!lecturas) {
            throw new Error('No se encontraron lecturas válidas para la factura solicitada.');
        }

        return {
            tipo,
            mes: Number(mes),
            anio: Number(anio),
            lectura_inicial: lecturas.lecturaInicial,
            lectura_final: lecturas.lecturaFinal,
            consumo: lecturas.consumo,
            unidad: tipo === 'Agua' ? 'M3' : 'KWH',
            mesNombre: lecturas.mesNombre,
            fechaGenerado: new Date().toLocaleDateString('es-VE'),
            cliente: 'Posada Villa Montaña',
            numeroFactura: `FAC-${tipo.substring(0, 3).toUpperCase()}-${anio}${mes}`
        };
    }

    if (report === 'historial') {
        const query = `
            SELECT nombre_usuario, TO_CHAR(fecha_hora, 'DD/MM/YYYY HH12:MI AM') AS fecha_formateada
            FROM registros_acceso
            ORDER BY fecha_hora DESC
            LIMIT 100`;
        const resultado = await pool.query(query);
        return {
            accesos: resultado.rows,
            fechaGenerado: new Date().toLocaleDateString('es-VE'),
            titulo: 'Historial de Accesos'
        };
    }

    if (report === 'usuarios') {
        const query = `
            SELECT nombre, usuario, rol
            FROM usuarios
            WHERE activo = true
            ORDER BY id DESC`;
        const resultado = await pool.query(query);
        return {
            usuarios: resultado.rows,
            fechaGenerado: new Date().toLocaleDateString('es-VE'),
            titulo: 'Listado de Usuarios Activos'
        };
    }

    if (report === 'costos') {
        const { mes, anio } = params;
        if (!mes || !anio) {
            throw new Error('Parámetros faltantes para costos: mes, anio');
        }

        const query = `
            SELECT c.ubicacion,
                   c.servicio,
                   c.cedula,
                   c.nombre AS nombre_contratado,
                   c.telefono,
                   c.materiales,
                   c.costo_final,
                   c.moneda,
                   u.nombre AS registrado_por,
                   TO_CHAR(c.fecha_registro, 'DD/MM/YYYY HH12:MI AM') AS fecha_lista
            FROM costo_manterimiento c
            LEFT JOIN usuarios u ON c.revisado_por = u.id
            WHERE EXTRACT(MONTH FROM c.fecha_registro) = $1
              AND EXTRACT(YEAR FROM c.fecha_registro) = $2
            ORDER BY c.fecha_registro ASC`;

        const resultado = await pool.query(query, [Number(mes), Number(anio)]);
        if (resultado.rows.length === 0) {
            throw new Error('No hay registros de costos para el mes y año seleccionados.');
        }

        const total = resultado.rows.reduce((sum, row) => sum + Number(row.costo_final || 0), 0).toFixed(2);
        return {
            costos: resultado.rows,
            total,
            fechaGenerado: new Date().toLocaleDateString('es-VE'),
            titulo: 'Reporte de Costos de Reparación',
            mesNombre: getMesNombre(Number(mes)),
            anio: Number(anio)
        };
    }

    if (report === 'gastos') {
        const query = `
            SELECT c.tipo,
                   c.lectura_valor,
                   TO_CHAR(c.fecha_registro, 'DD/MM/YYYY HH12:MI AM') AS fecha_lista,
                   u.nombre
            FROM consumos_recursos c
            LEFT JOIN usuarios u ON c.registrado_por = u.id
            ORDER BY c.fecha_registro DESC
            LIMIT 100`;

        const resultado = await pool.query(query);
        if (resultado.rows.length === 0) {
            throw new Error('No hay registros de gastos para generar el PDF.');
        }

        return {
            gastos: resultado.rows.map(row => ({
                tipo: row.tipo,
                lectura_valor: row.lectura_valor,
                unidad: row.tipo === 'Agua' ? 'M3' : 'KWH',
                fecha_lista: row.fecha_lista,
                registrado_por: row.nombre || 'Desconocido'
            })),
            fechaGenerado: new Date().toLocaleDateString('es-VE'),
            titulo: 'Reporte de Registros de Gastos',
            totalRegistros: resultado.rows.length
        };
    }

    throw new Error('Reporte no válido. Usa factura, historial, usuarios, costos o gastos.');
};

router.get('/generate', async (req, res) => {
    const report = (req.query.report || '').toLowerCase();
    try {
        const templateData = await buildTemplateData(report, req.query);
        const pdfBuffer = await generatePdfBuffer(report, templateData);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${report}.pdf"`,
        });
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error en /pdf/generate:', error);
        const statusCode = error.message.includes('faltantes') || error.message.includes('no válido') ? 400 : 404;
        res.status(statusCode).json({ success: false, error: error.message });
    }
});

router.post('/send', async (req, res) => {
    const { report, to, subject, message } = req.body;
    try {
        if (!report || !to) {
            return res.status(400).json({ success: false, mensaje: 'Tipo de reporte y destinatario son obligatorios.' });
        }

        const templateData = await buildTemplateData(report.toLowerCase(), req.body);
        const pdfBuffer = await generatePdfBuffer(report.toLowerCase(), templateData);

        res.json({ success: true, mensaje: 'PDF generado correctamente.' });
    } catch (error) {
        console.error('Error en /pdf/send:', error);
        const statusCode = error.message.includes('faltantes') || error.message.includes('no válido') ? 400 : 500;
        res.status(statusCode).json({ success: false, error: error.message });
    }
});

module.exports = router;
