const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * GET /api/categories
 * Returns all categories with product counts
 */
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT 
                c.category_id,
                c.name,
                c.slug,
                COUNT(p.product_id) AS product_count
            FROM categories c
            LEFT JOIN products p ON c.category_id = p.category_id AND p.is_active = TRUE
            GROUP BY c.category_id, c.name, c.slug
            ORDER BY c.category_id ASC
        `;
        const [categories] = await pool.query(sql);
        res.json(categories);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Failed to retrieve categories', details: err.message });
    }
});

module.exports = router;
