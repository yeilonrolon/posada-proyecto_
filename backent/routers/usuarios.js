const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/crearusuario', async (req, res) => {
    const { nombre, usuario, clave, rol, pregunta1, respuesta1, pregunta2, respuesta2 } = req.body;
    
    try {
        const existeUser = await pool.query('SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER($1)', [usuario.trim()]);
        if (existeUser.rows.length > 0) {
            return res.json({ success: false, mensaje: "El nombre de usuario ya existe." });
        }

        const query = `
            INSERT INTO usuarios (
                nombre, usuario, clave, rol, 
                pregunta1, respuesta1, 
                pregunta2, respuesta2, 
                activo, intentos, bloqueado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 0, false)
        `;
        
        await pool.query(query, [
            nombre.trim(), 
            usuario.trim().toLowerCase(), 
            clave, 
            rol, 
            pregunta1 ? pregunta1.trim().toLowerCase() : null, 
            respuesta1 ? respuesta1.trim().toLowerCase() : null, 
            pregunta2 ? pregunta2.trim().toLowerCase() : null, 
            respuesta2 ? respuesta2.trim().toLowerCase() : null
        ]);

        res.status(201).json({ success: true, mensaje: "Usuario creado exitosamente con preguntas de texto libre." });
        
    } catch (err) {
        console.error("Error al crear usuario:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/listausuarios', async (req, res) => {
    try {
        const query = `
            SELECT id, nombre, usuario, rol, 
            pregunta1, respuesta1, 
            pregunta2, respuesta2 
            FROM usuarios 
            WHERE activo = true 
            ORDER BY id DESC
        `;
        const resultado = await pool.query(query);
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/recuperar-preguntas', async (req, res) => {
    const { usuario } = req.body;
    try {
        const query = `
            SELECT pregunta1, respuesta1, pregunta2, respuesta2
            FROM usuarios 
            WHERE LOWER(usuario) = LOWER($1) AND activo = true
        `;
        const resultado = await pool.query(query, [usuario.trim()]);

        if (resultado.rows.length > 0) {
            res.json({ 
                success: true, 
                pregunta1: resultado.rows[0].pregunta1,
                respuesta1: resultado.rows[0].respuesta1,
                pregunta2: resultado.rows[0].pregunta2,
                respuesta2: resultado.rows[0].respuesta2
            });
        } else {
            res.json({ success: false, mensaje: "El usuario no existe o está inactivo." });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/usuariosinactivos', async (req, res) => {
    try {
        const query = 'SELECT id, nombre, usuario, rol FROM usuarios WHERE activo = false ORDER BY id DESC';
        const resultado = await pool.query(query);
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/actualizarusuario', async (req,res) =>{
    try {
        const { id, nombre, rol, pregunta1, respuesta1, pregunta2, respuesta2 } = req.body;
        const query = `UPDATE usuarios SET nombre = $2, rol = $3, pregunta1 = $4, respuesta1 = $5, pregunta2 = $6, respuesta2 = $7 WHERE id = $1`;
        await pool.query(query, [
            id,
            nombre,
            rol,
            pregunta1 ? pregunta1.trim().toLowerCase() : null,
            respuesta1 ? respuesta1.trim().toLowerCase() : null,
            pregunta2 ? pregunta2.trim().toLowerCase() : null,
            respuesta2 ? respuesta2.trim().toLowerCase() : null
        ]);
        res.json({success: true, mensaje: 'Datos actualizados.'})
    } catch (error) {
        res.status(500).json({success: false, error: error.message})
    }
});

router.put('/reactivarusuario', async (req, res) => {
    try {
        const { id } = req.body;
        const query = 'UPDATE usuarios SET activo = true, bloqueado = false, intentos = 0 WHERE id = $1';
        await pool.query(query, [id]);
        res.json({ success: true, mensaje: 'Usuario reactivado y desbloqueado correctamente.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/eliminarusuario', async(req,res) =>{
    try{
        const {id} = req.body;
        const query = 'UPDATE usuarios SET activo = false WHERE id = $1';
        await pool.query(query, [id]);
        res.json({success: true, mensaje: 'Usuario desactivado del sistema.'})
    } catch (error) {
        res.status(500).json({success: false, error: error.message})
    }
});
// ============================================================================
// ENDPOINTS PARA LA RECUPERACIÓN DE CONTRASEÑA (FLUJO EN 3 PASOS)
// ============================================================================

// PASO 1: Verificar usuario y retornar el ID junto con las preguntas de seguridad
router.post('/verificar-usuario-recuperacion', async (req, res) => {
    const { usuario } = req.body;
    
    if (!usuario) {
        return res.json({ success: false, mensaje: "El campo usuario es obligatorio." });
    }

    try {
        const query = `
            SELECT id, pregunta1, pregunta2 
            FROM usuarios 
            WHERE LOWER(usuario) = LOWER($1) AND activo = true
        `;
        const resultado = await pool.query(query, [usuario.trim()]);

        if (resultado.rows.length > 0) {
            res.json({ 
                success: true, 
                datos: {
                    id: resultado.rows[0].id,
                    pregunta1: resultado.rows[0].pregunta1,
                    pregunta2: resultado.rows[0].pregunta2
                }
            });
        } else {
            res.json({ success: false, mensaje: "El usuario no existe o se encuentra inactivo." });
        }
    } catch (error) {
        console.error("Error en /verificar-usuario-recuperacion:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PASO 2: Verificar si las respuestas ingresadas coinciden con la BD
router.post('/verificar-respuestas', async (req, res) => {
    const { id, respuesta1, respuesta2 } = req.body;

    try {
        const query = `
            SELECT respuesta1, respuesta2 
            FROM usuarios 
            WHERE id = $1 AND activo = true
        `;
        const resultado = await pool.query(query, [id]);

        if (resultado.rows.length > 0) {
            const user = resultado.rows[0];
            
            // Validamos que ambas respuestas coincidan limpiando espacios y minúsculas
            const r1Correcta = user.respuesta1 === (respuesta1 ? respuesta1.trim().toLowerCase() : '');
            const r2Correcta = user.respuesta2 === (respuesta2 ? respuesta2.trim().toLowerCase() : '');

            if (r1Correcta && r2Correcta) {
                res.json({ success: true, mensaje: "Respuestas validadas correctamente." });
            } else {
                res.json({ success: false, mensaje: "Las respuestas de seguridad son incorrectas." });
            }
        } else {
            res.json({ success: false, mensaje: "Usuario no encontrado." });
        }
    } catch (error) {
        console.error("Error en /verificar-respuestas:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PASO 3: Actualizar la contraseña del usuario y resetear intentos/bloqueos
router.post('/actualizar-clave-recuperacion', async (req, res) => {
    const { id, nuevaClave } = req.body;

    try {
        // Actualizamos la clave y de paso limpiamos el contador de intentos por seguridad
        const query = `
            UPDATE usuarios 
            SET clave = $1, intentos = 0, bloqueado = false 
            WHERE id = $2 AND activo = true
        `;
        await pool.query(query, [nuevaClave, id]);

        res.json({ success: true, mensaje: "Contraseña reestablecida exitosamente." });
    } catch (error) {
        console.error("Error en /actualizar-clave-recuperacion:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = router;
