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

module.exports = router;
