/**
 * SISTEMA DE GESTIÓN - POSADA VILLA MONTAÑA
 * Backend Principal (Node.js + Express + PostgreSQL)
 * Desarrollado por: Yeilon Rolón
 */

const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Conexión a la base de datos PostgreSQL

const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARES ---
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

/**
 * SEGURIDAD Y ESTABILIDAD:
 * Manejo de errores globales para que el servidor no se detenga si ocurre un fallo inesperado.
 */
process.on('uncaughtException', (err) => {
    console.error('❌ Error Crítico (uncaughtException):', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Promesa no manejada (unhandledRejection):', reason);
});

// ============================================================
// 1. MÓDULO DE RECURSOS (AGUA Y LUZ)
// ============================================================

app.get('/calcular-consumo', async (req, res) => {
    const { tipo, mes, anio } = req.query; 
    try {
        const qFinal = `
            SELECT lectura_valor FROM consumos_recursos 
            WHERE tipo = $1 
            AND EXTRACT(MONTH FROM fecha_registro) = $2 
            AND EXTRACT(YEAR FROM fecha_registro) = $3
            ORDER BY fecha_registro DESC LIMIT 1`;
        
        const qInicial = `
            SELECT lectura_valor FROM consumos_recursos 
            WHERE tipo = $1 
            AND fecha_registro < MAKE_DATE($3, $2, 1)
            ORDER BY fecha_registro DESC LIMIT 1`;

        const resFinal = await pool.query(qFinal, [tipo, mes, anio]);
        const resInicial = await pool.query(qInicial, [tipo, mes, anio]);

        if (resFinal.rows.length > 0) {
            const final = parseFloat(resFinal.rows[0].lectura_valor);
            const inicial = resInicial.rows.length > 0 ? parseFloat(resInicial.rows[0].lectura_valor) : 0;
            const consumo = (final - inicial).toFixed(2);

            res.json({
                success: true,
                lectura_inicial: inicial,
                lectura_final: final,
                consumo: consumo
            });
        } else {
            res.json({ success: false, mensaje: "No hay registros de lectura para este mes." });
        }
    } catch (e) {
        console.error("Error en módulo de cálculo:", e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/registrogasto', async (req, res) => {
    try {
        const { tipo, lectura_valor, registrado_por } = req.body;
        const query = `
            INSERT INTO consumos_recursos (tipo, lectura_valor, fecha_registro, registrado_por) 
            VALUES ($1, $2, NOW(), $3)
        `;
        await pool.query(query, [tipo, lectura_valor, registrado_por]);
        res.status(201).json({ success: true, mensaje: 'Lectura guardada correctamente.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/verificarfecha', async (req, res) => {
    try {
        const query = `
            SELECT tipo, MAX(fecha_registro) as ultima_fecha
            FROM consumos_recursos
            GROUP BY tipo
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

app.get('/ultimo-consumo/:tipo', async (req, res) => {
    const { tipo } = req.params; 

    try {
        const query = `
            SELECT lectura_valor 
            FROM consumos_recursos 
            WHERE tipo = $1 
            ORDER BY fecha_registro DESC 
            LIMIT 1
        `;
        const resultado = await pool.query(query, [tipo]);

        if (resultado.rows.length > 0) {
            res.json({ 
                success: true, 
                ultimoValor: parseFloat(resultado.rows[0].lectura_valor) 
            });
        } else {
            res.json({ success: true, ultimoValor: 0 });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al consultar" });
    }
});

app.get('/listagastos', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id, c.tipo, c.lectura_valor, 
                TO_CHAR(c.fecha_registro, 'DD/MM/YYYY HH:MI AM') as fecha_lista,
                u.nombre 
            FROM consumos_recursos c
            JOIN usuarios u ON c.registrado_por = u.id
            ORDER BY c.fecha_registro DESC LIMIT 30
        `;
        const resultado = await pool.query(query);
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// 2. MÓDULO DE USUARIOS Y SEGURIDAD
// ============================================================

app.post('/login', async (req, res) => {
    const { usuario, clave } = req.body;
    try {
        // Forzamos la búsqueda en minúscula para evitar problemas de tipeo
        const queryBusqueda = 'SELECT * FROM usuarios WHERE LOWER(usuario) = LOWER($1) AND clave = $2 AND activo = true';
        const resultado = await pool.query(queryBusqueda, [usuario.trim(), clave]);

        if (resultado.rows.length > 0) {
            const user = resultado.rows[0];
            const queryLog = `INSERT INTO registros_acceso (usuario_id, nombre_usuario) VALUES ($1, $2)`;
            await pool.query(queryLog, [user.id, user.nombre]);

            res.json({
                success: true,
                id_usuario: user.id,
                rol: user.rol,
                nombre: user.nombre
            });
        } else {
            res.json({ success: false, mensaje: "Credenciales inválidas o usuario desactivado." });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/historial-accesos', async (req, res) => {
    try {
        const query = `
            SELECT id, nombre_usuario, TO_CHAR(fecha_hora, 'DD/MM/YYYY HH:MI:SS AM') as fecha_formateada
            FROM registros_acceso 
            ORDER BY fecha_hora DESC LIMIT 20
        `;
        const resultado = await pool.query(query);
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// 3. MÓDULO ADMINISTRATIVO (CRUD USUARIOS + TEXT PLANO)
// ============================================================

app.post('/crearusuario', async (req, res) => {
    const { nombre, usuario, clave, rol, pregunta1, respuesta1, pregunta2, respuesta2 } = req.body;
    
    try {
        const existeUser = await pool.query('SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER($1)', [usuario.trim()]);
        if (existeUser.rows.length > 0) {
            return res.json({ success: false, mensaje: "El nombre de usuario ya existe." });
        }

        // Estructura limpia adaptada a VARCHAR(250)
        const query = `
            INSERT INTO usuarios (
                nombre, usuario, clave, rol, 
                pregunta1, respuesta1, 
                pregunta2, respuesta2, 
                activo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
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

app.get('/listausuarios', async (req, res) => {
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

/**
 * RUTA ADAPTADA: Obtener preguntas de seguridad en texto plano
 * Envía directamente los strings guardados para la recuperación
 */
app.post('/recuperar-preguntas', async (req, res) => {
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

app.get('/usuariosinactivos', async (req, res) => {
    try {
        const query = 'SELECT id, nombre, usuario, rol FROM usuarios WHERE activo = false ORDER BY id DESC';
        const resultado = await pool.query(query);
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/actualizarusuario', async (req,res) =>{
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

app.put('/reactivarusuario', async (req, res) => {
    try {
        const { id } = req.body;
        const query = 'UPDATE usuarios SET activo = true WHERE id = $1';
        await pool.query(query, [id]);
        res.json({ success: true, mensaje: 'Usuario reactivado correctamente.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/eliminarusuario', async(req,res) =>{
    try{
        const {id} = req.body;
        const query = 'UPDATE usuarios SET activo = false WHERE id = $1';
        await pool.query(query, [id]);
        res.json({success: true, mensaje: 'Usuario desactivado del sistema.'})
    } catch (error) {
        res.status(500).json({success: false, error: error.message})
    }
});

// ============================================================
// 4. MÓDULO DE ESTADOS
// ============================================================

app.post('/estado-bano', async(req,res) =>{
    try{
        const {habitacion,estado,observacion,registrado_por} = req.body
        const query = `insert into estado_banos(num_habitacion, estado, observaciones, fecha_inspeccion, revisado_por) 
        values ($1, $2, $3, NOW(), $4)`
        await pool.query(query,[habitacion,estado,observacion,registrado_por])
        res.status(201).json({ success: true, mensaje: 'Reporte guardado correctamente.' });
    } catch(error){
            res.status(500).json({success: false, error: error.message})
    }
});

app.put('/editar-estado/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        const { habitacion, estado, observacion, registrado_por } = req.body;
        const query = `UPDATE estado_banos SET num_habitacion = $1, estado = $2, observaciones = $3, fecha_inspeccion = NOW(),revisado_por = $4 WHERE id_estado = $5 `;

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

app.put('/estado-habitacion', async(req,res) =>{
    try{
        const{estado,habitacion} = req.body
        const query = 'UPDATE habitacion set estado = $1 where id_habitacion = $2'
        await pool.query(query,[estado,habitacion])
        res.status(200).json({ success: true, mensaje: 'Cambio realizado correctamente.' });
    }
    catch(error){
        res.status(500).json({success: false, error: error.message})
    }
});

app.get('/listabano', async (req, res) => {
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

app.get('/verificar-fecha-bano', async (req, res) => {
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

app.get('/listar-habitaciones', async (req, res) =>{
    try{
        const query = 'select id_habitacion, estado from habitacion order by id_habitacion asc'
        const resultado = await pool.query(query)
        res.json({
            success: true,
            habitacion: resultado.rows,
        })
    } catch(error){
        console.error("Error listar habitaciones:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/registrar-habitacion', async (req,res) =>{
    try{
        const {tipo,estado} = req.body
        const query = 'insert into habitaciones(tipo,estdao) values($1, $2)'
        await pool.query(query,[tipo,estado]);
        res.status(201).json({ success: true, mensaje: 'Habitacion nueva agregada.' });
    }catch (error) {
        res.status(500).json({success: false, error: error.message})
    }
});

// ==========================================
// MÓDULO 6: RECUPERACIÓN DE CONTRASEÑA
// ==========================================

// 1. Verificar existencia del usuario y obtener sus preguntas
app.post('/verificar-usuario-recuperacion', async (req, res) => {
    let { usuario } = req.body;

    if (!usuario) {
        return res.status(400).json({ success: false, mensaje: "El campo usuario es obligatorio." });
    }

    try {
        usuario = usuario.trim().toLowerCase();
        
        // 🟢 Corregido: Cambiado 'id_usuario' por 'id' y 'estado' por 'activo' para acoplarse a tu BD
        const resultado = await pool.query(
            'SELECT id, pregunta1, pregunta2, activo FROM usuarios WHERE LOWER(usuario) = $1',
            [usuario]
        );

        if (resultado.rows.length === 0) {
            return res.json({ success: false, mensaje: "El usuario ingresado no existe en el sistema." });
        }

        const user = resultado.rows[0];

        // 🟢 Corregido: Tu BD usa la columna 'activo' (true/false)
        if (user.activo === false) {
            return res.json({ success: false, mensaje: "Esta cuenta se encuentra inactiva. Contacta al administrador." });
        }

        if (!user.pregunta1 || !user.pregunta2) {
            return res.json({ 
                success: false, 
                mensaje: "Tu cuenta no posee preguntas de seguridad registradas. Solicita asistencia técnica con el Administrador." 
            });
        }

        return res.json({
            success: true,
            datos: {
                id: user.id, // 🟢 Corregido: Cambiado id_usuario por id
                pregunta1: user.pregunta1,
                pregunta2: user.pregunta2
            }
        });

    } catch (error) {
        console.error("Error en /verificar-usuario-recuperacion:", error.message);
        return res.status(500).json({ success: false, mensaje: "Error interno del servidor." });
    }
});

// 2. Verificar que las respuestas coincidan con la BD
app.post('/verificar-respuestas', async (req, res) => {
    let { id, respuesta1, respuesta2 } = req.body;

    if (!id || !respuesta1 || !respuesta2) {
        return res.status(400).json({ success: false, mensaje: "Todos los campos son obligatorios." });
    }

    try {
        // 🟢 Corregido: Cambiado id_usuario por id
        const resultado = await pool.query(
            'SELECT respuesta1, respuesta2 FROM usuarios WHERE id = $1',
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.json({ success: false, mensaje: "Usuario no encontrado." });
        }

        const user = resultado.rows[0];

        const r1Base = user.respuesta1.trim().toLowerCase();
        const r2Base = user.respuesta2.trim().toLowerCase();

        const r1Ingresada = respuesta1.trim().toLowerCase();
        const r2Ingresada = respuesta2.trim().toLowerCase();

        if (r1Base === r1Ingresada && r2Base === r2Ingresada) {
            return res.json({ success: true, mensaje: "Validación de seguridad exitosa." });
        } else {
            return res.json({ success: false, mensaje: "Las respuestas de seguridad no coinciden." });
        }

    } catch (error) {
        console.error("Error en /verificar-respuestas:", error.message);
        return res.status(500).json({ success: false, mensaje: "Error interno del servidor." });
    }
});

// 3. Actualizar la contraseña en la base de datos (Texto Plano)
app.post('/actualizar-clave-recuperacion', async (req, res) => {
    const { id, nuevaClave } = req.body;

    if (!id || !nuevaClave) {
        return res.status(400).json({ success: false, mensaje: "Datos insuficientes para procesar el cambio." });
    }

    try {
        // 🟢 CORREGIDO: Se elimina la encriptación bcrypt para guardar la clave 
        // en texto plano, tal como lo maneja tu /login y /crearusuario
        const resultado = await pool.query(
            'UPDATE usuarios SET clave = $1 WHERE id = $2',
            [nuevaClave.trim(), id]
        );

        if (resultado.rowCount > 0) {
            return res.json({ success: true, mensaje: "La contraseña ha sido reestablecida con éxito." });
        } else {
            return res.json({ success: false, mensaje: "No se pudo actualizar la contraseña. Usuario no válido." });
        }

    } catch (error) {
        console.error("Error en /actualizar-clave-recuperacion:", error.message);
        return res.status(500).json({ success: false, mensaje: "Error interno en el servidor." });
    }
});

// ==========================================
// MÓDULO 7: REGISTRO DE COSTOS EXTRAS
// ==========================================
app.get('/listar-habitaciones-inactivas', async (req, res) =>{
    try{
        const query = "select id_habitacion from habitacion where estado = 'Inactivo'  order by id_habitacion asc   "
        const resultado = await pool.query(query)
        res.json({
            success: true,
            habitacion: resultado.rows,
        })
    } catch(error){
        console.error("Error listar habitaciones:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});
app.post('/registro-costo', async(req,res) =>{
    try{
        const {ubicacion,servicio,cedula,nombre,telefono,costo,materiales,costoFinal,moneda,registrado_por} = req.body
        const query = `insert into costo_manterimiento(ubicacion, servicio, cedula,nombre, telefono, costo, materiales, fecha_registro, costo_final,moneda, revisado_por) 
        values ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9,$10)`
        await pool.query(query,[ubicacion,servicio,cedula || null,nombre || null,telefono || null ,costo || null,materiales,costoFinal,moneda,registrado_por])
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
app.get('/listar-costo-reparacion', async (req, res) =>{
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
        const resultado = await pool.query(query)
        res.json({
            success: true,
            habitacion: resultado.rows,
        })
    } catch(error){
        console.error("--- ERROR EN POSTGRESQL ---");
        console.error(error); 
        console.error("---------------------------");
        res.status(500).json({ 
            success: false, 
            error: error.detail || error.message || "Error interno del servidor" 
        });
        //console.error("Error listar costos:", error.message);
        //res.status(500).json({ success: false, error: error.message });
    }
});


app.put('/editar-costo/:id', async (req, res) => {
    try {
        const { id } = req.params; // Saca el id_costo de la URL
        const { ubicacion, servicio, cedula, nombre, telefono, costo, materiales, costoFinal, moneda, registrado_por } = req.body;

        const query = `
            UPDATE costo_manterimiento 
            SET 
                ubicacion = $1, servicio = $2, cedula = $3, nombre = $4, telefono = $5, 
                costo = $6, materiales = $7, costo_final = $8, moneda = $9, revisado_por = $10
            WHERE id_costo = $11
        `;

        const resultado = await pool.query(query, [ubicacion, servicio, cedula || null, nombre || null, telefono || null, costo || null, materiales, costoFinal, moneda, registrado_por,id  ]);

        res.status(200).json({ success: true, mensaje: 'Reporte actualizado correctamente.' });
    } catch (error) {
        console.error("Error al editar:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// 5. ARRANQUE DEL SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000; 

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ================================================
    🏨 SISTEMA POSADA VILLA MONTAÑA - BACKEND V2
    🟢 Estado: Corriendo
    📍 URL Local: http://localhost:${PORT}
    📍 Red Local: http://192.168.0.108:${PORT}
    ================================================
    `);
});

