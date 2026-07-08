const express = require('express');
const router = express.Router();
const pool = require('../db');

// ============================================================================
// GESTIÓN DE USUARIOS (CRUD TRADICIONAL)
// ============================================================================

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
        const query = 'UPDATE usuarios SET activo = true, bloqueado = false, intentos = 0, intentos_recuperacion = 0, bloqueo_recuperacion_hasta = NULL WHERE id = $1';
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
// ENDPOINTS PARA LA RECUPERACIÓN DE CONTRASEÑA (CON BLOQUEO EXPONENCIAL)
// ============================================================================

// PASO 1: Verificar usuario y retornar el ID junto con las preguntas de seguridad (Frena si está penalizado)
router.post('/verificar-usuario-recuperacion', async (req, res) => {
    const { usuario } = req.body;
    
    if (!usuario) {
        return res.json({ success: false, mensaje: "El campo usuario es obligatorio." });
    }

    try {
        const query = `
            SELECT id, pregunta1, pregunta2, bloqueo_recuperacion_hasta 
            FROM usuarios 
            WHERE LOWER(usuario) = LOWER($1) AND activo = true
        `;
        const resultado = await pool.query(query, [usuario.trim()]);

        if (resultado.rows.length > 0) {
            const datosUsuario = resultado.rows[0];
            const ahora = new Date();

            // Verificar si tiene una penalización activa por tiempo
            if (datosUsuario.bloqueo_recuperacion_hasta) {
                const tiempoBloqueo = new Date(datosUsuario.bloqueo_recuperacion_hasta);
                
                if (ahora < tiempoBloqueo) {
                    const segundosRestantes = Math.ceil((tiempoBloqueo - ahora) / 1000);
                    const minutosRestantes = Math.ceil(segundosRestantes / 60);

                    return res.json({ 
                        success: false, 
                        mensaje: `Módulo restringido temporalmente por seguridad. Intente de nuevo en ${minutosRestantes} minuto(s) o ${segundosRestantes} segundos.` 
                    });
                }
            }

            res.json({ 
                success: true, 
                datos: {
                    id: datosUsuario.id,
                    pregunta1: datosUsuario.pregunta1,
                    pregunta2: datosUsuario.pregunta2
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

// PASO 2: Verificar si las respuestas coinciden con lógica exponencial ante fallos
router.post('/verificar-respuestas', async (req, res) => {
    const { id, respuesta1, respuesta2 } = req.body;

    try {
        const query = `
            SELECT respuesta1, respuesta2, intentos_recuperacion, bloqueo_recuperacion_hasta 
            FROM usuarios 
            WHERE id = $1 AND activo = true
        `;
        const resultado = await pool.query(query, [id]);

        if (resultado.rows.length > 0) {
            const user = resultado.rows[0];
            const ahora = new Date();
            
            // Doble control: Validar que no intente saltarse el bloqueo enviando peticiones HTTP directas
            if (user.bloqueo_recuperacion_hasta) {
                const tiempoBloqueo = new Date(user.bloqueo_recuperacion_hasta);
                if (ahora < tiempoBloqueo) {
                    const segundosRestantes = Math.ceil((tiempoBloqueo - ahora) / 1000);
                    return res.json({ 
                        success: false, 
                        mensaje: `Límite superado. Intente de nuevo en ${segundosRestantes} segundos.` 
                    });
                }
            }

            // Validamos que ambas respuestas coincidan limpiando espacios y minúsculas
            const r1Correcta = user.respuesta1 === (respuesta1 ? respuesta1.trim().toLowerCase() : '');
            const r2Correcta = user.respuesta2 === (respuesta2 ? respuesta2.trim().toLowerCase() : '');

            if (r1Correcta && r2Correcta) {
                // ÉXITO: Limpiamos por completo sus contadores de fallos de recuperación
                await pool.query(
                    'UPDATE usuarios SET intentos_recuperacion = 0, bloqueo_recuperacion_hasta = NULL WHERE id = $1', 
                    [id]
                );
                res.json({ success: true, mensaje: "Respuestas validadas correctamente." });
            } else {
                // FALLO: Incrementamos el contador de fallos específicos de recuperación
                const nuevosIntentos = (user.intentos_recuperacion || 0) + 1;
                let minutosDeCastigo = 0;

                // Estructura Exponencial de Penalización
                if (nuevosIntentos === 3) {
                    minutosDeCastigo = 1;   // 3er fallo: Bloqueo de 1 minuto
                } else if (nuevosIntentos === 4) {
                    minutosDeCastigo = 5;   // 4to fallo: Bloqueo de 5 minutos
                } else if (nuevosIntentos === 5) {
                    minutosDeCastigo = 15;  // 5to fallo: Bloqueo de 15 minutos
                } else if (nuevosIntentos > 5) {
                    minutosDeCastigo = 60;  // Más de 5 fallos: Bloqueo de 1 hora
                }

                if (minutosDeCastigo > 0) {
                    const fechaDesbloqueo = new Date(ahora.getTime() + minutosDeCastigo * 60000);
                    
                    await pool.query(
                        'UPDATE usuarios SET intentos_recuperacion = $1, bloqueo_recuperacion_hasta = $2 WHERE id = $3',
                        [nuevosIntentos, fechaDesbloqueo, id]
                    );

                    res.json({ 
                        success: false, 
                        mensaje: `Respuestas incorrectas. Límite superado. El módulo se ha bloqueado por ${minutosDeCastigo} minuto(s).` 
                    });
                } else {
                    // Fallos menores (1 y 2), no bloquean pero se guarda el contador
                    await pool.query(
                        'UPDATE usuarios SET intentos_recuperacion = $1 WHERE id = $2',
                        [nuevosIntentos, id]
                    );

                    const intentosRestantes = 3 - nuevosIntentos;
                    res.json({ 
                        success: false, 
                        mensaje: `Las respuestas de seguridad son incorrectas. Te quedan ${intentosRestantes} intento(s) antes del bloqueo temporal.` 
                    });
                }
            }
        } else {
            res.json({ success: false, mensaje: "Usuario no encontrado." });
        }
    } catch (error) {
        console.error("Error en /verificar-respuestas:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PASO 3: Actualizar la contraseña del usuario y resetear intentos/bloqueos generales
router.post('/actualizar-clave-recuperacion', async (req, res) => {
    const { id, nuevaClave } = req.body;

    try {
        // Al cambiar de contraseña exitosamente, se limpian TODOS los bloqueos (Login y Recuperación)
        const query = `
            UPDATE usuarios 
            SET clave = $1, intentos = 0, bloqueado = false, intentos_recuperacion = 0, bloqueo_recuperacion_hasta = NULL 
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

