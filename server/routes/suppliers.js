const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * GET /api/suppliers
 * Returns all suppliers
 */
router.get('/', async (req, res) => {
    try {
        const [suppliers] = await pool.query('SELECT * FROM suppliers ORDER BY name ASC');
        res.json(suppliers);
    } catch (err) {
        console.error('Error fetching suppliers:', err);
        res.status(500).json({ error: 'Failed to retrieve suppliers', details: err.message });
    }
});

module.exports = router;
