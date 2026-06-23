const express = require('express');
const router = express.Router();
const pool = require('../db'); // Reutiliza la conexión existente a PostgreSQL

// ===================================================
// ENDPOINT 1: REGISTRAR UN NUEVO EQUIPO (INSERT) - OPTIMIZADO
// ===================================================
router.post('/', async (req, res) => {
    let { nombre_equipo, ubicacion, frecuencia_mantenimiento, registrado_por } = req.body;

    // Asegurar que no sean undefined y limpiar espacios fantasmas
    nombre_equipo = nombre_equipo ? nombre_equipo.trim() : '';
    ubicacion = ubicacion ? ubicacion.trim() : '';

    // Validación estricta en Backend
    if (!nombre_equipo || !ubicacion) {
        return res.status(400).json({ 
            success: false, 
            error: 'El nombre del equipo y la ubicación son campos obligatorios.' 
        });
    }

    try {
        // Validar que la frecuencia sea un número válido, si no, por defecto 90
        const diasFrecuencia = parseInt(frecuencia_mantenimiento, 10);
        const frecuenciaFinal = isNaN(diasFrecuencia) ? 90 : diasFrecuencia;

        const queryText = `
            INSERT INTO equipos_qr (nombre_equipo, ubicacion, frecuencia_mantenimiento,revisado_por)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [nombre_equipo, ubicacion, frecuenciaFinal, registrado_por];
        const resultado = await pool.query(queryText, values);
        
        res.status(201).json({
            success: true,
            mensaje: 'Equipo registrado con éxito',
            equipo: resultado.rows[0]
        });
    } catch (error) {
        // Esto te dirá exactamente qué columna falló en tu consola si hay otro problema
        console.error('❌ Error detallado en Postgres:', error);
        res.status(500).json({ success: false, error: error.message || 'Error interno al guardar el equipo' });
    }
});

// ===================================================
// ENDPOINT 2: OBTENER TODOS LOS EQUIPOS (SELECT)
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
// ENDPOINT 3: ACTUALIZAR REVISIÓN DINÁMICA DESDE LA CÁMARA (UPDATE)
// ===================================================
router.put('/:id/revision', async (req, res) => {
    const { id } = req.params;
    const { nueva_fecha } = req.body;

    if (!nueva_fecha) {
        return res.status(400).json({ success: false, error: 'La fecha de revisión es obligatoria.' });
    }

    try {
        const queryText = `
            UPDATE equipos_qr 
            SET ultima_revision = $1::date 
            WHERE id = $2 
            RETURNING *;
        `;
        const resultado = await pool.query(queryText, [nueva_fecha, parseInt(id, 10)]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'El equipo escaneado no existe en la base de datos.' });
        }

        res.json({
            success: true,
            mensaje: 'Mantenimiento registrado con éxito',
            equipo: resultado.rows[0]
        });
    } catch (error) {
        console.error('❌ Error al actualizar revisión:', error.message);
        res.status(500).json({ success: false, error: 'Error interno del servidor al actualizar la revisión' });
    }
});

// ===================================================
// ENDPOINT 4: EDITAR DATOS GENERALES COMPLETO (UPDATE) - CORREGIDO
// ===================================================
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre_equipo, ubicacion, frecuencia_mantenimiento, registrado_por } = req.body;

    try {
        const queryText = `
            UPDATE equipos_qr 
            SET nombre_equipo = $1, 
                ubicacion = $2, 
                frecuencia_mantenimiento = $3, 
                revisado_por = $4
            WHERE id = $5
            RETURNING *;
        `;
        
        // CORRECCIÓN: Pasamos los 5 parámetros en el orden exacto que requiere el SQL
        const resultado = await pool.query(queryText, [
            nombre_equipo ? nombre_equipo.trim() : '', 
            ubicacion ? ubicacion.trim() : '', 
            parseInt(frecuencia_mantenimiento, 10) || 90, 
            registrado_por ? parseInt(registrado_por, 10) : null, // $4 mapped a revisado_por
            parseInt(id, 10)                                      // $5 mapped a WHERE id
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
// ENDPOINT 5: ELIMINAR UN EQUIPO (DELETE)
// ===================================================
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const resultado = await pool.query('DELETE FROM equipos_qr WHERE id = $1 RETURNING *;', [parseInt(id, 10)]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'El equipo que intentas eliminar no existe.' });
        }

        res.json({ success: true, mensaje: 'Equipo eliminado físicamente de la base de datos con éxito' });
    } catch (error) {
        console.error('❌ Error al eliminar equipo:', error.message);
        res.status(500).json({ success: false, error: 'Error interno del servidor al eliminar el activo' });
    }
});

module.exports = router;
