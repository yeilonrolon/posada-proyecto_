/**
 * SISTEMA DE GESTIÓN - POSADA VILLA MONTAÑA
 * Backend Principal (Node.js + Express + PostgreSQL)
 * Desarrollado por: Yeilon Rolón, Edwin Madrid, Jesús Depablos
 * Versión: Con Control de Intentos Avanzado
 */

const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Conexión a la base de datos PostgreSQL
const apiRoutes = require('./routers/api');

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
// RUTAS PRINCIPALES ORGANIZADAS EN ROUTERS
// ============================================================
app.use('/', apiRoutes);

// ============================================================
// ARRANQUE DEL SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ================================================
    🏨 SISTEMA POSADA VILLA MONTAÑA - BACKEND V2
    🟢 Estado: Corriendo con Seguridad de Intentos
    📍 URL Local: http://localhost:${PORT}
    📍 Red Local: http://10.174.89.237:${PORT}
    ================================================
    `);
});
