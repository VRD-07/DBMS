/**
 * Voltcart - Automated Cloud MySQL Database Importer
 * Executes schema.sql and seed.sql directly over SSL to your cloud instance.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runImport() {
    console.log('====================================================');
    console.log('  Voltcart - Cloud Database Setup & Import Tool     ');
    console.log('====================================================');

    const config = {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'defaultdb',
        multipleStatements: true
    };

    if (process.env.DB_SSL === 'true') {
        config.ssl = { rejectUnauthorized: false };
    }

    if (!config.password || config.password === 'YOUR_AIVEN_PASSWORD_HERE') {
        console.error('\n❌ ERROR: Please open the .env file and paste your Aiven database password into DB_PASSWORD first!');
        process.exit(1);
    }

    console.log(`Connecting to: ${config.user}@${config.host}:${config.port}/${config.database}`);

    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connected successfully to Cloud MySQL!\n');

        // 1. Read and execute schema.sql
        console.log('📦 Step 1: Executing schema.sql (Tables, Constraints, Trigger, View, Procedure)...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        let schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Clean DELIMITER statements for mysql2 multipleStatements execution
        schemaSql = schemaSql.replace(/DELIMITER\s+\$\$/g, '');
        schemaSql = schemaSql.replace(/\$\$[\r\n\s]+DELIMITER\s+;/g, ';');
        schemaSql = schemaSql.replace(/\$\$/g, ';');

        await connection.query(schemaSql);
        console.log('✅ Schema imported successfully!\n');

        // 2. Read and execute seed.sql
        console.log('🌱 Step 2: Executing seed.sql (Categories, Brands, 30 Products, Customers, Orders)...');
        const seedPath = path.join(__dirname, 'seed.sql');
        const seedSql = fs.readFileSync(seedPath, 'utf8');

        await connection.query(seedSql);
        console.log('✅ Seed data imported successfully!\n');

        // 3. Verification queries
        const [tables] = await connection.query('SHOW TABLES;');
        console.log(`📊 Verification: Found ${tables.length} tables/views in database:`);
        tables.forEach(row => {
            const tableName = Object.values(row)[0];
            console.log(`   - ${tableName}`);
        });

        const [productCount] = await connection.query('SELECT COUNT(*) AS count FROM products;');
        const [customerCount] = await connection.query('SELECT COUNT(*) AS count FROM customers;');
        const [orderCount] = await connection.query('SELECT COUNT(*) AS count FROM orders;');

        console.log('\n📈 Summary:');
        console.log(`   - Products loaded:  ${productCount[0].count}`);
        console.log(`   - Customers loaded: ${customerCount[0].count}`);
        console.log(`   - Orders loaded:    ${orderCount[0].count}`);

        console.log('\n🎉 Cloud Database Setup Complete! You are ready to start the server:');
        console.log('   npm start\n');

    } catch (err) {
        console.error('\n❌ Import Failed:', err.message);
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('👉 Please check your DB_USER and DB_PASSWORD in .env.');
        } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            console.error('👉 Please check your DB_HOST and DB_PORT in .env, and ensure your cloud instance is Running.');
        }
    } finally {
        if (connection) await connection.end();
    }
}

runImport();
