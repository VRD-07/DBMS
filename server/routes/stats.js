const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * GET /api/stats
 * Aggregates store performance metrics:
 * 1. Total revenue (excluding cancelled orders)
 * 2. Total orders count
 * 3. Low-stock products (< 5 remaining units)
 * 4. Top 5 selling products by quantity using JOINs and GROUP BY
 * 5. General store counts (active products, customers)
 */
router.get('/', async (req, res) => {
    try {
        // 1. Revenue & orders count
        const [revenueRows] = await pool.query(`
            SELECT 
                COUNT(*) AS total_orders,
                COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS total_revenue,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_orders
            FROM orders
        `);

        // 2. Customer count
        const [customerRows] = await pool.query('SELECT COUNT(*) AS total_customers FROM customers');

        // 3. Low stock products (stock_qty < 5 and is_active = TRUE)
        const [lowStockProducts] = await pool.query(`
            SELECT 
                p.product_id,
                p.name,
                p.sku,
                p.price,
                p.stock_qty,
                b.name AS brand_name,
                c.name AS category_name
            FROM products p
            JOIN brands b ON p.brand_id = b.brand_id
            JOIN categories c ON p.category_id = c.category_id
            WHERE p.stock_qty < 5 AND p.is_active = TRUE
            ORDER BY p.stock_qty ASC, p.name ASC
        `);

        // 4. Top 5 selling products using JOINs and GROUP BY
        const [topProducts] = await pool.query(`
            SELECT 
                p.product_id,
                p.name,
                p.sku,
                p.price,
                b.name AS brand_name,
                c.name AS category_name,
                COALESCE(SUM(oi.quantity), 0) AS total_sold,
                COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_revenue
            FROM products p
            JOIN order_items oi ON p.product_id = oi.product_id
            JOIN orders o ON oi.order_id = o.order_id
            JOIN brands b ON p.brand_id = b.brand_id
            JOIN categories c ON p.category_id = c.category_id
            WHERE o.status != 'cancelled'
            GROUP BY p.product_id, p.name, p.sku, p.price, b.name, c.name
            ORDER BY total_sold DESC, total_revenue DESC
            LIMIT 5
        `);

        // 5. Total active products count
        const [productCountRows] = await pool.query('SELECT COUNT(*) AS total_products FROM products WHERE is_active = TRUE');

        res.json({
            summary: {
                total_revenue: parseFloat(revenueRows[0].total_revenue) || 0,
                total_orders: parseInt(revenueRows[0].total_orders, 10) || 0,
                pending_orders: parseInt(revenueRows[0].pending_orders, 10) || 0,
                total_customers: parseInt(customerRows[0].total_customers, 10) || 0,
                total_products: parseInt(productCountRows[0].total_products, 10) || 0,
                low_stock_count: lowStockProducts.length
            },
            low_stock_products: lowStockProducts,
            top_selling_products: topProducts
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ error: 'Failed to retrieve analytics', details: err.message });
    }
});

module.exports = router;
