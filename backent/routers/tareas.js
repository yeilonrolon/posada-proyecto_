const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/listar-usuarios', async (req, res) => {
    try {
        
        const query = `
            SELECT id, nombre, usuario
            FROM usuarios
            WHERE activo = true
              AND TRIM(rol) = 'mantenimiento'
            ORDER BY id DESC;
        `;
        const resultado = await pool.query(query);
        
    
        res.json({ success: true, datos: resultado.rows || [] });
    } catch (error) {
        console.error("❌ ERROR REAL EN EL BACKEND:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/asignar-tarea', async (req, res) => {
    const { lugar, tarea, responsable, asignado_por } = req.body;

    try {
        
        const query = `
            INSERT INTO tareas (lugar, tarea,  fecha_asignacion, asignado_por, responsable)
            VALUES ($1, $2,  NOW(), $3, $4)
            RETURNING id_tarea, lugar, tarea,  fecha_asignacion;
        `;

        const valores = [lugar, tarea, asignado_por, responsable];
        const resultado = await pool.query(query, valores);

        res.status(201).json({
            success: true,
            mensaje: 'Tarea asignada con éxito.',
            datos: resultado.rows[0]
        });
    } catch (error) {
        console.error("❌ Error al insertar en tabla tareas:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


router.put('/editar-tarea/:id_tarea', async (req, res) => {
    const { id_tarea } = req.params;
    const { lugar, tarea, responsable, asignado_por } = req.body;

    try {
        const query = `
            UPDATE tareas 
            SET lugar = $1, 
                tarea = $2, 
                responsable = $3, 
                asignado_por = $4
            WHERE id_tarea = $5
            RETURNING *;
        `;

        const valores = [lugar, tarea, responsable, asignado_por, id_tarea];
        const resultado = await pool.query(query, valores);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'La tarea no existe.' });
        }

        res.json({
            success: true,
            mensaje: 'Tarea actualizada con éxito.',
            datos: resultado.rows[0]
        });
    } catch (error) {
        console.error("❌ Error al actualizar la tarea:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
    });



router.get('/listar-tareas', async (req, res) => {
    try {
        const query = `
            SELECT 
                t.id_tarea,
                t.lugar,
                t.tarea,
                t.estado,
                t.asignado_por,
                t.responsable,
                TO_CHAR(t.fecha_asignacion, 'DD/MM/YYYY HH:MI AM') AS fecha_asignacion_formateada,
                u1.nombre AS nombre_asignador,
                u2.nombre AS nombre_responsable,
                t.nota_cierre,
                TO_CHAR(t.fecha_finalizacion, 'DD/MM/YYYY HH:MI AM')AS fecha_finalizada_formateada
            FROM tareas t
            LEFT JOIN usuarios u1 ON t.asignado_por = u1.id
            LEFT JOIN usuarios u2 ON t.responsable = u2.id
            ORDER BY t.id_tarea DESC;
        `;

        const resultado = await pool.query(query);

        res.json({
            success: true,
            tareas: resultado.rows || []
        });
    } catch (error) {
        console.error("❌ Error al obtener el listado de tareas:", error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});    
router.delete('/eliminar-tarea/:id_tarea', async (req, res) => {
    const { id_tarea } = req.params;

    try {
        
        const query = `
            DELETE FROM tareas 
            WHERE id_tarea = $1 
            AND TRIM(LOWER(estado)) = 'pendiente'
            RETURNING id_tarea;
        `;

        const resultado = await pool.query(query, [id_tarea]);

        if (resultado.rows.length === 0) {
            return res.status(400).json({
                success: false,
                mensaje: 'No se pudo eliminar la tarea. Esto ocurre si la tarea ya no existe o si su estado ya cambió a "En proceso" o "Finalizado".'
            });
        }
        res.json({
            success: true,
            mensaje: 'Tarea pendiente eliminada correctamente.'
        });

    } catch (error) {
        console.error("❌ Error al intentar eliminar la tarea:", error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});
router.get('/mis-tareas/:id_usuario', async (req, res) => {
    const { id_usuario } = req.params;

    try {
        // Consulta estructurada de lectura (SELECT)
        const query = `
            SELECT 
                t.id_tarea,
                t.lugar,
                t.tarea,
                t.estado,
                t.asignado_por,
                t.responsable,
                u.nombre AS nombre_asignador,
                TO_CHAR(t.fecha_asignacion, 'DD/MM/YYYY hh:mi AM') AS fecha_asignacion_formateada
            FROM public.tareas t
            INNER JOIN public.usuarios u ON t.asignado_por = u.id
            WHERE t.responsable = $1 AND t.estado != 'Finalizado'
            ORDER BY t.id_tarea DESC;
        `;

        const resultado = await pool.query(query, [id_usuario]);
        
        // Retorna la respuesta exitosa con las filas obtenidas de la base de datos
        return res.status(200).json({ 
            success: true, 
            tareas: resultado.rows 
        });

    } catch (error) {
        console.error('❌ Error detallado al obtener tareas del empleado:', error.message);
        return res.status(500).json({ 
            success: false, 
            error: error.message,
            mensaje: 'Ocurrió un error interno en el servidor al intentar consultar las tareas.' 
        });
    }
});
router.put('/cambiar-estado-tarea/:id_tarea', async (req, res) => {
    const { id_tarea } = req.params;
    const { nuevoEstado, nota_cierre } = req.body;

    try {
        let query;
        let parametros;

        if (nuevoEstado.trim().toLowerCase() === 'finalizado') {
            
             query = `
                UPDATE public.tareas 
                SET estado = 'Finalizado', 
                    nota_cierre = $1,
                    fecha_finalizacion = NOW()
                WHERE id_tarea = $2
                RETURNING *;
            `;
            parametros = [nota_cierre, id_tarea];

        } else {
           
            query = `
                UPDATE public.tareas 
                SET estado = $1
                WHERE id_tarea = $2
                RETURNING *;
            `;
            parametros = [nuevoEstado, id_tarea];
        }

        const resultado = await pool.query(query, parametros);

        
        if (resultado.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                mensaje: 'La tarea especificada no pudo ser encontrada en la base de datos.' 
            });
        }

        
        return res.status(200).json({ 
            success: true, 
            mensaje: `El estado de la tarea ha sido modificado exitosamente a: ${nuevoEstado}`,
            tarea: resultado.rows[0] 
        });

    } catch (error) {
        console.error('❌ Error detallado al cambiar el estado de la tarea:', error.message);
        return res.status(500).json({ 
            success: false, 
            error: error.message,
            mensaje: 'Error interno al procesar la actualización del estado en la base de datos.' 
        });
    }
});

router.get('/verificar-pendientes/:id_usuario', async (req, res) => {
    const { id_usuario } = req.params;

    try {
        // se cuentan cuantas tareas tien penientes el usuario
        const query = `
            SELECT COUNT(*)::INTEGER AS total_pendientes
            FROM public.tareas
            WHERE responsable = $1 AND TRIM(LOWER(estado)) = 'pendiente';
        `;

        const resultado = await pool.query(query, [id_usuario]);
        const tienePendientes = resultado.rows[0].total_pendientes > 0;

        return res.status(200).json({
            success: true,
            tienePendientes,
            cantidad: resultado.rows[0].total_pendientes
        });

    } catch (error) {
        console.error('❌ Error al verificar tareas pendientes:', error.message);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;