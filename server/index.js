const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./db');

// Route Handlers
const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const brandsRouter = require('./routes/brands');
const suppliersRouter = require('./routes/suppliers');
const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');
const statsRouter = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from /public folder
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/brands', brandsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/stats', statsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        app: 'Voltcart Electronics Store DBMS',
        timestamp: new Date().toISOString()
    });
});

// Single Page Application Fallback
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start Express Server
app.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(`  Voltcart Electronics Store Server Running!        `);
    console.log(`  Local URL:   http://localhost:${PORT}             `);
    console.log(`  API Health:  http://localhost:${PORT}/api/health  `);
    console.log(`====================================================`);
    await testConnection();
});
