const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * GET /api/brands
 * Returns all brands with active product counts
 */
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT 
                b.brand_id,
                b.name,
                b.country,
                COUNT(p.product_id) AS product_count
            FROM brands b
            LEFT JOIN products p ON b.brand_id = p.brand_id AND p.is_active = TRUE
            GROUP BY b.brand_id, b.name, b.country
            ORDER BY b.name ASC
        `;
        const [brands] = await pool.query(sql);
        res.json(brands);
    } catch (err) {
        console.error('Error fetching brands:', err);
        res.status(500).json({ error: 'Failed to retrieve brands', details: err.message });
    }
});

module.exports = router;
