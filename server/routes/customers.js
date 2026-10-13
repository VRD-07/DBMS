const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * GET /api/customers
 * Returns all customers with aggregated order statistics
 */
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let whereSql = '';
        const params = [];

        if (search && search.trim()) {
            whereSql = 'WHERE c.full_name LIKE ? OR c.email LIKE ? OR c.city LIKE ?';
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }

        const sql = `
            SELECT 
                c.customer_id,
                c.full_name,
                c.email,
                c.phone,
                c.city,
                c.created_at,
                COUNT(o.order_id) AS total_orders,
                COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) AS lifetime_spent
            FROM customers c
            LEFT JOIN orders o ON c.customer_id = o.customer_id
            ${whereSql}
            GROUP BY c.customer_id, c.full_name, c.email, c.phone, c.city, c.created_at
            ORDER BY c.customer_id DESC
        `;

        const [customers] = await pool.query(sql, params);
        res.json(customers);
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ error: 'Failed to retrieve customers', details: err.message });
    }
});

/**
 * POST /api/customers
 * Create a new customer
 */
router.post('/', async (req, res) => {
    try {
        const { full_name, email, phone, city } = req.body;

        if (!full_name || !full_name.trim()) {
            return res.status(400).json({ error: 'Full name is required.' });
        }
        if (!email || !email.trim() || !email.includes('@')) {
            return res.status(400).json({ error: 'A valid email address is required.' });
        }
        if (!phone || !phone.trim()) {
            return res.status(400).json({ error: 'Phone number is required.' });
        }
        if (!city || !city.trim()) {
            return res.status(400).json({ error: 'City is required.' });
        }

        const insertSql = `
            INSERT INTO customers (full_name, email, phone, city)
            VALUES (?, ?, ?, ?)
        `;

        const [result] = await pool.query(insertSql, [
            full_name.trim(),
            email.trim().toLowerCase(),
            phone.trim(),
            city.trim()
        ]);

        res.status(201).json({
            message: 'Customer registered successfully',
            customer_id: result.insertId,
            customer: {
                customer_id: result.insertId,
                full_name: full_name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                city: city.trim()
            }
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A customer with this email address already exists.' });
        }
        console.error('Error creating customer:', err);
        res.status(500).json({ error: 'Failed to create customer', details: err.message });
    }
});

/**
 * PUT /api/customers/:id
 * Update customer details
 */
router.put('/:id', async (req, res) => {
    try {
        const customerId = parseInt(req.params.id, 10);
        if (isNaN(customerId)) {
            return res.status(400).json({ error: 'Invalid customer ID.' });
        }

        const { full_name, email, phone, city } = req.body;

        if (!full_name || !email || !phone || !city) {
            return res.status(400).json({ error: 'All fields (full_name, email, phone, city) are required.' });
        }

        const updateSql = `
            UPDATE customers 
            SET full_name = ?, email = ?, phone = ?, city = ?
            WHERE customer_id = ?
        `;

        const [result] = await pool.query(updateSql, [
            full_name.trim(),
            email.trim().toLowerCase(),
            phone.trim(),
            city.trim(),
            customerId
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Customer not found.' });
        }

        res.json({ message: 'Customer updated successfully', customer_id: customerId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email address already in use by another customer.' });
        }
        console.error('Error updating customer:', err);
        res.status(500).json({ error: 'Failed to update customer', details: err.message });
    }
});

module.exports = router;
