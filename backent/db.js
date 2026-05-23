require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'posada_mantenimiento', // Base de datos del proyecto
    password: process.env.DB_PASSWORD, //clave de la base de datos
    port: 5432,
    allowExitOnIdle: false,
});

pool.on('error', (err) => {
    console.error('❌ Error en cliente Postgres:', err.message);
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
    console.error('❌ Error en Postgres:', err.stack);
    } else {
    console.log('✅ Base de datos conectada correctamente');
    }
});

module.exports = pool;