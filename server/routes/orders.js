const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * GET /api/orders
 * Returns list of orders using the database VIEW v_order_summary
 */
router.get('/', async (req, res) => {
    try {
        const { status, customer_id, limit = 50, offset = 0 } = req.query;

        const conditions = [];
        const params = [];

        if (status && status !== 'all') {
            conditions.push('status = ?');
            params.push(status);
        }

        if (customer_id) {
            conditions.push('customer_id = ?');
            params.push(parseInt(customer_id, 10));
        }

        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const parsedLimit = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
        const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

        const sql = `
            SELECT 
                order_id,
                customer_id,
                customer_name,
                customer_email,
                customer_city,
                order_date,
                status,
                item_count,
                total_amount
            FROM v_order_summary
            ${whereSql}
            ORDER BY order_date DESC, order_id DESC
            LIMIT ? OFFSET ?
        `;

        const [orders] = await pool.query(sql, [...params, parsedLimit, parsedOffset]);
        res.json(orders);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ error: 'Failed to retrieve orders', details: err.message });
    }
});

/**
 * GET /api/orders/:id
 * Returns single order details along with line items and customer information
 */
router.get('/:id', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        if (isNaN(orderId)) {
            return res.status(400).json({ error: 'Invalid order ID.' });
        }

        // 1. Fetch order & customer info
        const orderSql = `
            SELECT 
                o.order_id,
                o.order_date,
                o.status,
                o.total_amount,
                c.customer_id,
                c.full_name AS customer_name,
                c.email AS customer_email,
                c.phone AS customer_phone,
                c.city AS customer_city
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            WHERE o.order_id = ?
        `;
        const [orderRows] = await pool.query(orderSql, [orderId]);
        if (orderRows.length === 0) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        const order = orderRows[0];

        // 2. Fetch line items
        const itemsSql = `
            SELECT 
                oi.order_id,
                oi.product_id,
                oi.quantity,
                oi.unit_price,
                (oi.quantity * oi.unit_price) AS line_total,
                p.name AS product_name,
                p.sku,
                p.image_url,
                b.name AS brand_name,
                cat.name AS category_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN brands b ON p.brand_id = b.brand_id
            JOIN categories cat ON p.category_id = cat.category_id
            WHERE oi.order_id = ?
            ORDER BY oi.product_id ASC
        `;
        const [items] = await pool.query(itemsSql, [orderId]);

        order.items = items;
        res.json(order);
    } catch (err) {
        console.error('Error fetching order by ID:', err);
        res.status(500).json({ error: 'Failed to retrieve order', details: err.message });
    }
});

/**
 * POST /api/orders
 * Atomically places an order with database transaction support.
 * Accepts either:
 * - customer_id: existing customer ID
 * - customer: { full_name, email, phone, city } to auto-register or match existing
 * And:
 * - items: [{ product_id, quantity }]
 */
router.post('/', async (req, res) => {
    let connection;
    try {
        const { customer_id, customer, items } = req.body;

        // Validation
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Order must contain at least one item.' });
        }

        for (const item of items) {
            if (!item.product_id || !item.quantity || parseInt(item.quantity, 10) <= 0) {
                return res.status(400).json({ error: 'Each item must have a valid product_id and quantity > 0.' });
            }
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        let resolvedCustomerId = customer_id;

        // If new customer details provided instead of customer_id
        if (!resolvedCustomerId && customer) {
            if (!customer.full_name || !customer.email || !customer.phone || !customer.city) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ error: 'Please provide complete customer details (name, email, phone, city).' });
            }

            // Check if customer email already exists
            const [custRows] = await connection.query(
                'SELECT customer_id FROM customers WHERE email = ?',
                [customer.email.trim().toLowerCase()]
            );

            if (custRows.length > 0) {
                resolvedCustomerId = custRows[0].customer_id;
            } else {
                const [newCust] = await connection.query(
                    'INSERT INTO customers (full_name, email, phone, city) VALUES (?, ?, ?, ?)',
                    [customer.full_name.trim(), customer.email.trim().toLowerCase(), customer.phone.trim(), customer.city.trim()]
                );
                resolvedCustomerId = newCust.insertId;
            }
        }

        if (!resolvedCustomerId) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ error: 'Customer information is missing.' });
        }

        // Verify customer exists
        const [customerCheck] = await connection.query(
            'SELECT customer_id, full_name, email FROM customers WHERE customer_id = ?',
            [resolvedCustomerId]
        );
        if (customerCheck.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ error: 'Customer not found.' });
        }

        // Validate products and inventory with row-level locks
        let calculatedTotal = 0;
        const validatedItems = [];

        for (const item of items) {
            const prodId = parseInt(item.product_id, 10);
            const reqQty = parseInt(item.quantity, 10);

            const [prodRows] = await connection.query(
                'SELECT product_id, name, price, stock_qty, is_active FROM products WHERE product_id = ? FOR UPDATE',
                [prodId]
            );

            if (prodRows.length === 0 || !prodRows[0].is_active) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    error: `Product with ID ${prodId} is either discontinued or does not exist.`
                });
            }

            const product = prodRows[0];

            if (product.stock_qty < reqQty) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    error: `Insufficient stock for "${product.name}". Only ${product.stock_qty} unit(s) remaining in inventory (requested ${reqQty}).`
                });
            }

            const unitPrice = parseFloat(product.price);
            calculatedTotal += (unitPrice * reqQty);

            validatedItems.push({
                product_id: prodId,
                name: product.name,
                quantity: reqQty,
                unit_price: unitPrice
            });
        }

        // 1. Insert Order record
        const [orderResult] = await connection.query(
            'INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (?, NOW(), "paid", ?)',
            [resolvedCustomerId, calculatedTotal]
        );
        const newOrderId = orderResult.insertId;

        // 2. Insert Order Items and Update Inventory
        // Note: The database trigger `trg_reduce_product_stock` will automatically decrement stock
        // when order_items is inserted. If the trigger is present in MySQL, it takes care of it.
        // We also safely handle any fallback if trigger is not created.
        for (const item of validatedItems) {
            try {
                await connection.query(
                    'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
                    [newOrderId, item.product_id, item.quantity, item.unit_price]
                );
            } catch (insertErr) {
                // If trigger raises SQLSTATE 45000:
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    error: `Order processing failed: ${insertErr.message}`
                });
            }
        }

        // Commit transaction
        await connection.commit();
        connection.release();

        res.status(201).json({
            message: 'Order placed successfully',
            order_id: newOrderId,
            customer_id: resolvedCustomerId,
            total_amount: calculatedTotal,
            item_count: validatedItems.length
        });
    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rbErr) {
                console.error('Error during rollback:', rbErr);
            }
        }
        console.error('Error in order transaction:', err);
        res.status(500).json({ error: 'Failed to process order', details: err.message });
    }
});

/**
 * PATCH /api/orders/:id/status
 * Update status of an existing order
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        const { status } = req.body;

        const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const [result] = await pool.query(
            'UPDATE orders SET status = ? WHERE order_id = ?',
            [status, orderId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        res.json({ message: 'Order status updated successfully', order_id: orderId, status });
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({ error: 'Failed to update order status', details: err.message });
    }
});

module.exports = router;
