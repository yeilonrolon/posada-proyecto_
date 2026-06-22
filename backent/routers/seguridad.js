const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/login', async (req, res) => {
    const { usuario, clave } = req.body;
    
    if (!usuario || !clave) {
        return res.json({ success: false, mensaje: "Usuario y contraseña requeridos." });
    }

    const usuarioKey = usuario.trim().toLowerCase();

    try {
        const queryUsuario = 'SELECT id, nombre, rol, activo, clave, intentos, bloqueado FROM usuarios WHERE LOWER(usuario) = $1';
        const resUsuario = await pool.query(queryUsuario, [usuarioKey]);

        if (resUsuario.rows.length === 0) {
            return res.json({ success: false, mensaje: "Usuario o contraseña incorrectos." });
        }

        const user = resUsuario.rows[0];

        if (user.bloqueado || !user.activo) {
            return res.json({ 
                success: false, 
                bloqueado: true,
                mensaje: "Usuario bloqueado. Has agotado tus intentos permitidos. Utiliza la opción de recuperar contraseña para restablecer tu cuenta." 
            });
        }

        if (user.clave === clave) {
            if (user.intentos > 0) {
                await pool.query('UPDATE usuarios SET intentos = 0 WHERE id = $1', [user.id]);
            }

            const queryLog = `INSERT INTO registros_acceso (usuario_id, nombre_usuario) VALUES ($1, $2)`;
            await pool.query(queryLog, [user.id, user.nombre]);

            return res.json({
                success: true,
                id_usuario: user.id,
                rol: user.rol,
                nombre: user.nombre
            });
            
        } else {
            const nuevosIntentos = user.intentos + 1;

            if (nuevosIntentos >= 3) {
                const queryBloqueoTotal = `
                    UPDATE usuarios 
                    SET intentos = $1, bloqueado = true, activo = false 
                    WHERE id = $2
                `;
                await pool.query(queryBloqueoTotal, [nuevosIntentos, user.id]);

                return res.json({
                    success: false,
                    bloqueado: true,
                    mensaje: "Usuario bloqueado. Has agotado tus 3 intentos. Utiliza la opción de recuperar contraseña."
                });
            } else {
                await pool.query('UPDATE usuarios SET intentos = $1 WHERE id = $2', [nuevosIntentos, user.id]);

                const visualIntentosRestantes = 3 - nuevosIntentos;

                return res.json({
                    success: false,
                    intentosRestantes: visualIntentosRestantes,
                    mensaje: `Contraseña incorrecta. Te quedan ${visualIntentosRestantes} ${visualIntentosRestantes === 1 ? 'intento' : 'intentos'}.`
                });
            }
        }
    } catch (err) {
        console.error("Error en módulo de Login/Seguridad:", err.message);
        res.status(500).json({ success: false, error: "Error interno del servidor en el inicio de sesión." });
    }
});

router.get('/historial-accesos', async (req, res) => {
    try {
        const query = `
            SELECT 
                id,
                usuario_id,
                nombre_usuario,
                TO_CHAR(fecha_hora, 'DD/MM/YYYY HH12:MI AM') as fecha_formateada
            FROM registros_acceso
            ORDER BY fecha_hora DESC
            LIMIT 50
        `;
        const resultado = await pool.query(query);
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        console.error("Error en /historial-accesos:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
