require('dotenv').config();
const { Pool } = require('pg');

const dbPassword = process.env.DB_PASSWORD;
if (!dbPassword || typeof dbPassword !== 'string' || dbPassword.trim() === '') {
    console.error('❌ DB_PASSWORD no está definido. Crea un archivo .env con DB_PASSWORD=tu_contraseña o define la variable en el entorno.');
    process.exit(1);
}

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'posada_restaurada_bd', // Base de datos del proyecto
    password: dbPassword,
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