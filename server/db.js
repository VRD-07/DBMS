const mysql = require('mysql2/promise');
require('dotenv').config();

// Build connection options from environment variables
const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'voltcart_db',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    queueLimit: 0,
    decimalNumbers: true // Returns DECIMAL as JavaScript Numbers instead of Strings
};

// Enable SSL if specified in environment (standard requirement for Cloud MySQL like Aiven/PlanetScale/AWS)
if (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1') {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

const pool = mysql.createPool(poolConfig);

/**
 * Tests connection to MySQL and logs status.
 */
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log(`[Database] Connected successfully to MySQL: ${poolConfig.database}@${poolConfig.host}:${poolConfig.port}`);
        connection.release();
        return true;
    } catch (err) {
        console.warn(`[Database Warning] Unable to connect to MySQL database (${poolConfig.host}:${poolConfig.port}): ${err.message}`);
        console.warn('[Database Warning] Please ensure your .env configuration is correct and schema.sql + seed.sql have been imported.');
        return false;
    }
}

module.exports = {
    pool,
    testConnection
};
