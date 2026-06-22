const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/estado-bano', async(req,res) =>{
    try{
        const {habitacion,estado,observacion,registrado_por} = req.body;
        const query = `insert into estado_banos(num_habitacion, estado, observaciones, fecha_inspeccion, revisado_por) 
        values ($1, $2, $3, NOW(), $4)`;
        await pool.query(query,[habitacion,estado,observacion,registrado_por]);
        res.status(201).json({ success: true, mensaje: 'Reporte guardado correctamente.' });
    } catch(error){
        res.status(500).json({success: false, error: error.message});
    }
});

router.put('/editar-estado/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        const { habitacion, estado, observacion, registrado_por } = req.body;
        const query = `UPDATE estado_banos SET num_habitacion = $1, estado = $2, observaciones = $3, fecha_inspeccion = NOW(), revisado_por = $4 WHERE id_estado = $5 `;

        const resultado = await pool.query(query, [habitacion, estado, observacion, registrado_por, id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                mensaje: 'No se encontró el reporte de baño para actualizar.' 
            });
        }
        res.status(200).json({ 
            success: true, 
            mensaje: 'Reporte de baño actualizado correctamente.' 
        });

    } catch (error) {
        console.error('Error al modificar el estado del baño:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

router.put('/estado-habitacion', async(req,res) =>{
    try{
        const{estado,habitacion} = req.body;
        const query = 'UPDATE habitacion set estado = $1 where id_habitacion = $2';
        await pool.query(query,[estado,habitacion]);
        res.status(200).json({ success: true, mensaje: 'Cambio realizado correctamente.' });
    }
    catch(error){
        res.status(500).json({success: false, error: error.message});
    }
});

router.get('/listabano', async (req, res) => {
    try {
        const query = `
            SELECT 
                e.id_estado, e.num_habitacion, e.estado,e.observaciones,
                TO_CHAR(e.fecha_inspeccion, 'DD/MM/YYYY HH:MI AM') as fecha_lista,
                u.nombre 
            FROM estado_banos e
            JOIN usuarios u ON e.revisado_por = u.id
            ORDER BY e.fecha_inspeccion DESC LIMIT 30
        `;
        const resultado = await pool.query(query);
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/verificar-fecha-bano', async (req, res) => {
    try {
        const query = `
            SELECT num_habitacion, MAX(fecha_inspeccion) as ultima_fecha
            FROM estado_banos
            group by num_habitacion
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

router.get('/listar-habitaciones', async (req, res) =>{
    try{
        const query = 'select id_habitacion, estado from habitacion order by id_habitacion asc';
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

router.post('/registrar-habitacion', async (req,res) =>{
    try{
        const {tipo,estado} = req.body;
        const query = 'insert into habitaciones(tipo,estdao) values($1, $2)';
        await pool.query(query,[tipo,estado]);
        res.status(201).json({ success: true, mensaje: 'Habitacion nueva agregada.' });
    }catch (error) {
        res.status(500).json({success: false, error: error.message});
    }
});

module.exports = router;
