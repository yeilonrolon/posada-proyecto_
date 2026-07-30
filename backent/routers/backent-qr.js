const express = require('express');
const router = express.Router();
const pool = require('../db'); // Reutiliza la conexión existente a PostgreSQL

// ============================================================================
// ENDPOINT 1: ACTUALIZAR REVISIÓN Y GUARDAR EN HISTORIAL
// ============================================================================
router.put('/:id/revision', async (req, res) => {
    const { id } = req.params;
    const { nueva_fecha, detalle, nombre_tecnico, nombre, nombreUsuario } = req.body; 

    if (!nueva_fecha || !detalle || !detalle.trim()) {
        return res.status(400).json({ success: false, error: 'La fecha y el detalle son obligatorios.' });
    }

    const idEquipo = parseInt(id, 10);
    if (isNaN(idEquipo)) {
        return res.status(400).json({ success: false, error: 'El ID del equipo proporcionado no es válido.' });
    }

    try {
        let nombreResponsable = 'Operario Técnico';
        const nombreRecibido = nombre_tecnico || nombre || nombreUsuario;
        if (nombreRecibido && String(nombreRecibido).trim() !== '') {
            nombreResponsable = String(nombreRecibido).trim();
        }

        console.log('📥 Cuerpo recibido en /revision:', { id, nueva_fecha, detalle: detalle?.trim(), nombreRecibido });

        // 1. Actualizar fecha de última revisión
        const queryText = `
            UPDATE equipos_qr 
            SET ultima_revision = $1::date 
            WHERE id = $2 
            RETURNING *;
        `;
        await pool.query(queryText, [nueva_fecha, idEquipo]);

        // 2. Insertar registro en historial
        const queryHistorial = `
            INSERT INTO historial_qr (equipo_id, responsable, fecha, detalle)
            VALUES ($1, $2, $3::date, $4);
        `;
        await pool.query(queryHistorial, [
            idEquipo,
            nombreResponsable,
            nueva_fecha,
            detalle.trim()
        ]);

        res.json({ success: true, mensaje: 'Mantenimiento registrado con éxito 🎉' });
    } catch (error) {
        console.error('❌ Error en PUT /:id/revision:', error.message);
        res.status(500).json({ success: false, error: 'Error interno al procesar la revisión.' });
    }
});

// ===================================================
// ENDPOINT 2: REGISTRAR UN NUEVO EQUIPO (INSERT)
// ===================================================
router.post('/', async (req, res) => {
    let { nombre_equipo, ubicacion, frecuencia_mantenimiento, registrado_por } = req.body;

    nombre_equipo = nombre_equipo ? nombre_equipo.trim() : '';
    ubicacion = ubicacion ? ubicacion.trim() : '';

    if (!nombre_equipo || !ubicacion) {
        return res.status(400).json({ 
            success: false, 
            error: 'El nombre del equipo y la ubicación son campos obligatorios.' 
        });
    }

    try {
        const diasFrecuencia = parseInt(frecuencia_mantenimiento, 10);
        const frecuenciaFinal = isNaN(diasFrecuencia) ? 90 : diasFrecuencia;
        const asignadoA = registrado_por ? parseInt(registrado_por, 10) : null;

        const queryText = `
            INSERT INTO equipos_qr (nombre_equipo, ubicacion, frecuencia_mantenimiento, revisado_por)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [nombre_equipo, ubicacion, frecuenciaFinal, isNaN(asignadoA) ? null : asignadoA];
        const resultado = await pool.query(queryText, values);
        
        res.status(201).json({
            success: true,
            mensaje: 'Equipo registrado con éxito',
            equipo: resultado.rows[0]
        });
    } catch (error) {
        console.error('❌ Error detallado en Postgres:', error);
        res.status(500).json({ success: false, error: error.message || 'Error interno al guardar el equipo' });
    }
});

// ===================================================
// ENDPOINT 3: OBTENER TODOS LOS EQUIPOS (SELECT)
// ===================================================
router.get('/', async (req, res) => {
    try {
        const consultaSQL = `
            SELECT 
                e.*, 
                u.nombre AS nombre_usuario
            FROM equipos_qr e
            LEFT JOIN usuarios u ON e.revisado_por = u.id
            ORDER BY e.id DESC;
        `;
        const resultado = await pool.query(consultaSQL);
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        console.error('❌ Error al obtener los equipos:', error.message);
        res.status(500).json({ success: false, error: 'Error interno del servidor al consultar el inventario' });
    }
});

// ===================================================
// ENDPOINT 4: OBTENER UN EQUIPO POR ID + SU HISTORIAL
// ===================================================
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const idEquipo = parseInt(id, 10);

    if (isNaN(idEquipo)) {
        return res.status(400).json({ success: false, error: 'Identificador numérico inválido.' });
    }

    try {
        const consultaSQL = `
            SELECT 
                e.*, 
                u.nombre AS nombre_usuario
            FROM equipos_qr e
            LEFT JOIN usuarios u ON e.revisado_por = u.id
            WHERE e.id = $1;
        `;
        const resultado = await pool.query(consultaSQL, [idEquipo]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Equipo no encontrado en el sistema.' });
        }

        const consultaHistorial = `
            SELECT 
                id,
                responsable,
                TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
                detalle
            FROM historial_qr
            WHERE equipo_id = $1
            ORDER BY fecha DESC, id DESC;
        `;
        const resultadoHistorial = await pool.query(consultaHistorial, [idEquipo]);

        res.json({ 
            success: true, 
            datos: {
                ...resultado.rows[0],
                historial: resultadoHistorial.rows
            }
        });
    } catch (error) {
        console.error('❌ Error al obtener equipo e historial por ID:', error.message);
        res.status(500).json({ success: false, error: 'Error interno al consultar el activo.' });
    }
});

// ===================================================
// ENDPOINT 5: EDITAR DATOS GENERALES COMPLETO (UPDATE)
// ===================================================
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre_equipo, ubicacion, frecuencia_mantenimiento, registrado_por } = req.body;
    const idEquipo = parseInt(id, 10);

    if (isNaN(idEquipo)) {
        return res.status(400).json({ success: false, error: 'Identificador numérico inválido.' });
    }

    try {
        const revisadoPorInt = registrado_por ? parseInt(registrado_por, 10) : null;

        const queryText = `
            UPDATE equipos_qr 
            SET nombre_equipo = $1, 
                ubicacion = $2, 
                frecuencia_mantenimiento = $3, 
                revisado_por = $4
            WHERE id = $5
            RETURNING *;
        `;
        const resultado = await pool.query(queryText, [
            nombre_equipo ? nombre_equipo.trim() : '', 
            ubicacion ? ubicacion.trim() : '', 
            parseInt(frecuencia_mantenimiento, 10) || 90, 
            isNaN(revisadoPorInt) ? null : revisadoPorInt,
            idEquipo 
        ]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Equipo no encontrado.' });
        }

        res.json({ success: true, mensaje: 'Equipo actualizado con éxito', equipo: resultado.rows[0] });
    } catch (error) {
        console.error('❌ Error al editar equipo:', error.message);
        res.status(500).json({ success: false, error: 'Error interno del servidor al actualizar los datos generales' });
    }
});

// ===================================================
// ENDPOINT 6: ELIMINAR UN EQUIPO (DELETE)
// ===================================================
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const idEquipo = parseInt(id, 10);

    if (isNaN(idEquipo)) {
        return res.status(400).json({ success: false, error: 'Identificador numérico inválido.' });
    }

    try {
        const resultado = await pool.query('DELETE FROM equipos_qr WHERE id = $1 RETURNING *;', [idEquipo]);
        if (resultado.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'El equipo que intentas eliminar no existe.' });
        }
        res.json({ success: true, mensaje: 'Equipo eliminado físicamente con éxito' });
    } catch (error) {
        console.error('❌ Error al eliminar equipo:', error.message);
        res.status(500).json({ success: false, error: 'Error interno del servidor al eliminar el activo' });
    }
});

// Middleware para capturar cualquier ruta no encontrada dentro de este router y devolver JSON
router.use((req, res) => {
    res.status(404).json({ success: false, error: 'Ruta no encontrada en la API.' });
});

module.exports = router;