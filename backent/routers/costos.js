const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/listar-habitaciones-inactivas', async (req, res) =>{
    try {
        const query = "select id_habitacion from habitacion where estado = 'Inactivo'  order by id_habitacion asc   ";
        const resultado = await pool.query(query);
        res.json({
            success: true,
            habitacion: resultado.rows,
        });
    } catch(error){
        console.error("Error listar habitaciones:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/registro-costo', async(req,res) =>{
    try{
        const {ubicacion,servicio,cedula,nombre,telefono,costo,materiales,costoFinal,moneda,registrado_por} = req.body;
        const query = `insert into costo_manterimiento(ubicacion, servicio, cedula,nombre, telefono, costo, materiales, fecha_registro, costo_final,moneda, revisado_por) 
        values ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9,$10)`;
        await pool.query(query,[ubicacion,servicio,cedula || null,nombre || null,telefono || null ,costo || null,materiales,costoFinal,moneda,registrado_por]);
        res.status(201).json({ success: true, mensaje: 'Reporte guardado correctamente.' });
    } catch(error){
        console.error("--- ERROR EN POSTGRESQL ---");
        console.error(error); 
        console.error("---------------------------");
        res.status(500).json({ 
            success: false, 
            error: error.detail || error.message || "Error interno del servidor" 
        });
    }
});

router.delete('/eliminar-costo/:id_costo', async (req, res) => {
    const { id_costo } = req.params;
    try {
        
        const query = `
            DELETE FROM public.costo_manterimiento 
            WHERE id_costo = $1 
            RETURNING *;
        `;
        const resultado = await pool.query(query, [id_costo]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                mensaje: 'El registro ya no se encuentra disponible (pudo ser eliminado por otro usuario).' 
            });
        }

       
        return res.status(200).json({ 
            success: true, 
            mensaje: 'Registro de costo eliminado correctamente.'
        });

    } catch (error) {
        console.error('❌ Error al borrar el registro:', error.message);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});
router.get('/listar-costo-reparacion', async (req, res) =>{
    try{
        const query = `
            SELECT 
                c.id_costo, 
                c.ubicacion, 
                c.servicio, 
                c.cedula, 
                c.nombre as nombre_contratado, 
                c.telefono, 
                c.costo, 
                c.materiales, 
                TO_CHAR(c.fecha_registro, 'DD/MM/YYYY hh:mi AM') as fecha_lista,
                c.costo_final, 
                c.moneda,
                u.nombre as registrado_por
            FROM costo_manterimiento c
            JOIN usuarios u ON c.revisado_por = u.id
            ORDER BY c.fecha_registro DESC 
            LIMIT 30
        `;
        const resultado = await pool.query(query);
        res.json({
            success: true,
            habitacion: resultado.rows,
        });
    } catch(error){
        console.error("--- ERROR EN POSTGRESQL ---");
        console.error(error); 
        console.error("---------------------------");
        res.status(500).json({ 
            success: false, 
            error: error.detail || error.message || "Error interno del servidor" 
        });
    }
});

router.get('/costos-meses-disponibles', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT
                EXTRACT(YEAR FROM fecha_registro) AS anio,
                EXTRACT(MONTH FROM fecha_registro) AS mes
            FROM costo_manterimiento
            ORDER BY anio DESC, mes DESC`;

        const resultado = await pool.query(query);
        res.json({ success: true, meses: resultado.rows.map(row => ({ anio: Number(row.anio), mes: Number(row.mes) })) });
    } catch (error) {
        console.error('Error al obtener meses de costos:', error.message);
        res.status(500).json({ success: false, error: error.detail || error.message || 'Error interno del servidor' });
    }
});

router.put('/editar-costo/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        const { ubicacion, servicio, cedula, nombre, telefono, costo, materiales, costoFinal, moneda, registrado_por } = req.body;

        const query = `
            UPDATE costo_manterimiento 
            SET 
                ubicacion = $1, servicio = $2, cedula = $3, nombre = $4, telefono = $5, 
                costo = $6, materiales = $7, costo_final = $8, moneda = $9, revisado_por = $10
            WHERE id_costo = $11
        `;

        await pool.query(query, [ubicacion, servicio, cedula || null, nombre || null, telefono || null, costo || null, materiales, costoFinal, moneda, registrado_por, id]);

        res.status(200).json({ success: true, mensaje: 'Reporte actualizado correctamente.' });
    } catch (error) {
        console.error("Error al editar:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
