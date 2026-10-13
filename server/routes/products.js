const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * GET /api/products
 * Query parameters:
 *  - search: string (matches product name or description)
 *  - category: string (category slug or ID)
 *  - brand: string (brand ID or name)
 *  - sort: 'price_asc' | 'price_desc' | 'newest' | 'name_asc'
 *  - page: integer (default 1)
 *  - limit: integer (default 12)
 *  - all: boolean (if true, return all active products without pagination)
 *  - include_inactive: boolean (admin flag)
 */
router.get('/', async (req, res) => {
    try {
        const {
            search,
            category,
            brand,
            sort = 'newest',
            page = 1,
            limit = 12,
            all = 'false',
            include_inactive = 'false'
        } = req.query;

        const conditions = [];
        const params = [];

        // Inactive filter
        if (include_inactive !== 'true') {
            conditions.push('p.is_active = TRUE');
        }

        // Search filter (name or description)
        if (search && search.trim() !== '') {
            conditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)');
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // Category filter (slug or id)
        if (category && category !== 'all') {
            if (!isNaN(category)) {
                conditions.push('p.category_id = ?');
                params.push(parseInt(category, 10));
            } else {
                conditions.push('c.slug = ?');
                params.push(category);
            }
        }

        // Brand filter (brand_id or name)
        if (brand && brand !== 'all') {
            if (!isNaN(brand)) {
                conditions.push('p.brand_id = ?');
                params.push(parseInt(brand, 10));
            } else {
                conditions.push('b.name = ?');
                params.push(brand);
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Sorting
        let orderByClause = 'ORDER BY p.created_at DESC, p.product_id DESC';
        if (sort === 'price_asc') {
            orderByClause = 'ORDER BY p.price ASC, p.product_id ASC';
        } else if (sort === 'price_desc') {
            orderByClause = 'ORDER BY p.price DESC, p.product_id DESC';
        } else if (sort === 'name_asc') {
            orderByClause = 'ORDER BY p.name ASC';
        } else if (sort === 'stock_asc') {
            orderByClause = 'ORDER BY p.stock_qty ASC';
        }

        // Total count query
        const countSql = `
            SELECT COUNT(*) AS total
            FROM products p
            JOIN categories c ON p.category_id = c.category_id
            JOIN brands b ON p.brand_id = b.brand_id
            ${whereClause}
        `;
        const [countRows] = await pool.query(countSql, params);
        const total = countRows[0].total;

        // If 'all' is requested, skip pagination
        if (all === 'true') {
            const fullSql = `
                SELECT 
                    p.product_id,
                    p.name,
                    p.sku,
                    p.description,
                    p.price,
                    p.stock_qty,
                    p.image_url,
                    p.category_id,
                    c.name AS category_name,
                    c.slug AS category_slug,
                    p.brand_id,
                    b.name AS brand_name,
                    b.country AS brand_country,
                    p.supplier_id,
                    s.name AS supplier_name,
                    p.created_at,
                    p.is_active
                FROM products p
                JOIN categories c ON p.category_id = c.category_id
                JOIN brands b ON p.brand_id = b.brand_id
                LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
                ${whereClause}
                ${orderByClause}
            `;
            const [products] = await pool.query(fullSql, params);
            return res.json({ products, total, page: 1, limit: total, totalPages: 1 });
        }

        // Pagination calculations
        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
        const offset = (parsedPage - 1) * parsedLimit;
        const totalPages = Math.ceil(total / parsedLimit) || 1;

        const dataSql = `
            SELECT 
                p.product_id,
                p.name,
                p.sku,
                p.description,
                p.price,
                p.stock_qty,
                p.image_url,
                p.category_id,
                c.name AS category_name,
                c.slug AS category_slug,
                p.brand_id,
                b.name AS brand_name,
                b.country AS brand_country,
                p.supplier_id,
                s.name AS supplier_name,
                p.created_at,
                p.is_active
            FROM products p
            JOIN categories c ON p.category_id = c.category_id
            JOIN brands b ON p.brand_id = b.brand_id
            LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
            ${whereClause}
            ${orderByClause}
            LIMIT ? OFFSET ?
        `;

        const queryParams = [...params, parsedLimit, offset];
        const [products] = await pool.query(dataSql, queryParams);

        res.json({
            products,
            total,
            page: parsedPage,
            limit: parsedLimit,
            totalPages
        });
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to retrieve products', details: err.message });
    }
});

/**
 * GET /api/products/:id
 * Retrieve a single product by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id, 10);
        if (isNaN(productId)) {
            return res.status(400).json({ error: 'Invalid product ID.' });
        }

        const sql = `
            SELECT 
                p.product_id,
                p.name,
                p.sku,
                p.description,
                p.price,
                p.stock_qty,
                p.image_url,
                p.category_id,
                c.name AS category_name,
                c.slug AS category_slug,
                p.brand_id,
                b.name AS brand_name,
                b.country AS brand_country,
                p.supplier_id,
                s.name AS supplier_name,
                p.created_at,
                p.is_active
            FROM products p
            JOIN categories c ON p.category_id = c.category_id
            JOIN brands b ON p.brand_id = b.brand_id
            LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
            WHERE p.product_id = ?
        `;

        const [rows] = await pool.query(sql, [productId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching product by ID:', err);
        res.status(500).json({ error: 'Failed to retrieve product details', details: err.message });
    }
});

/**
 * POST /api/products
 * Create a new product
 */
router.post('/', async (req, res) => {
    try {
        const {
            name,
            sku,
            description = '',
            price,
            stock_qty = 0,
            image_url = '',
            category_id,
            brand_id,
            supplier_id = null
        } = req.body;

        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Product name is required.' });
        }
        if (!sku || !sku.trim()) {
            return res.status(400).json({ error: 'SKU is required.' });
        }
        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
            return res.status(400).json({ error: 'Price must be a valid positive number greater than 0.' });
        }
        const numericStock = parseInt(stock_qty, 10);
        if (isNaN(numericStock) || numericStock < 0) {
            return res.status(400).json({ error: 'Stock quantity cannot be negative.' });
        }
        if (!category_id) {
            return res.status(400).json({ error: 'Category selection is required.' });
        }
        if (!brand_id) {
            return res.status(400).json({ error: 'Brand selection is required.' });
        }

        const insertSql = `
            INSERT INTO products 
            (name, sku, description, price, stock_qty, image_url, category_id, brand_id, supplier_id, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `;

        const [result] = await pool.query(insertSql, [
            name.trim(),
            sku.trim().toUpperCase(),
            description.trim(),
            numericPrice,
            numericStock,
            image_url.trim() || null,
            parseInt(category_id, 10),
            parseInt(brand_id, 10),
            supplier_id ? parseInt(supplier_id, 10) : null
        ]);

        res.status(201).json({
            message: 'Product created successfully',
            product_id: result.insertId
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Duplicate SKU: A product with this SKU already exists.' });
        }
        console.error('Error creating product:', err);
        res.status(500).json({ error: 'Failed to create product', details: err.message });
    }
});

/**
 * PUT /api/products/:id
 * Update product information
 */
router.put('/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id, 10);
        if (isNaN(productId)) {
            return res.status(400).json({ error: 'Invalid product ID.' });
        }

        const {
            name,
            sku,
            description,
            price,
            stock_qty,
            image_url,
            category_id,
            brand_id,
            supplier_id,
            is_active
        } = req.body;

        // Check product exists
        const [existing] = await pool.query('SELECT product_id FROM products WHERE product_id = ?', [productId]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        // Validate price and stock if provided
        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
            return res.status(400).json({ error: 'Price must be greater than 0.' });
        }
        const numericStock = parseInt(stock_qty, 10);
        if (isNaN(numericStock) || numericStock < 0) {
            return res.status(400).json({ error: 'Stock quantity cannot be negative.' });
        }

        const updateSql = `
            UPDATE products 
            SET name = ?,
                sku = ?,
                description = ?,
                price = ?,
                stock_qty = ?,
                image_url = ?,
                category_id = ?,
                brand_id = ?,
                supplier_id = ?,
                is_active = ?
            WHERE product_id = ?
        `;

        await pool.query(updateSql, [
            name.trim(),
            sku.trim().toUpperCase(),
            description !== undefined ? description.trim() : '',
            numericPrice,
            numericStock,
            image_url !== undefined ? image_url.trim() : null,
            parseInt(category_id, 10),
            parseInt(brand_id, 10),
            supplier_id ? parseInt(supplier_id, 10) : null,
            is_active !== undefined ? Boolean(is_active) : true,
            productId
        ]);

        res.json({ message: 'Product updated successfully', product_id: productId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Duplicate SKU: Another product already has this SKU.' });
        }
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Failed to update product', details: err.message });
    }
});

/**
 * DELETE /api/products/:id
 * Delete product:
 * If referenced in orders, perform soft delete via is_active = FALSE and report constraint reason.
 * If not referenced in orders, allows hard delete or soft delete based on query param hard=true.
 */
router.delete('/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id, 10);
        const forceHard = req.query.hard === 'true';

        if (isNaN(productId)) {
            return res.status(400).json({ error: 'Invalid product ID.' });
        }

        // Check if product exists
        const [product] = await pool.query('SELECT product_id, name, is_active FROM products WHERE product_id = ?', [productId]);
        if (product.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        // Check if referenced in order_items
        const [ordersWithItem] = await pool.query(
            'SELECT COUNT(*) AS order_count FROM order_items WHERE product_id = ?',
            [productId]
        );
        const orderCount = ordersWithItem[0].order_count;

        if (orderCount > 0) {
            // Cannot delete permanently due to foreign key integrity on historical orders
            // Perform soft delete
            await pool.query('UPDATE products SET is_active = FALSE WHERE product_id = ?', [productId]);
            return res.json({
                message: `Product "${product[0].name}" appears in ${orderCount} existing customer order(s). To protect order history integrity, the product was soft-deleted (set to inactive) instead of being removed from the database.`,
                soft_deleted: true,
                order_references: orderCount
            });
        }

        if (forceHard) {
            // Safe to hard delete because not referenced in order_items
            await pool.query('DELETE FROM products WHERE product_id = ?', [productId]);
            return res.json({
                message: `Product "${product[0].name}" was permanently removed from inventory.`,
                soft_deleted: false
            });
        }

        // Default behavior: soft delete
        await pool.query('UPDATE products SET is_active = FALSE WHERE product_id = ?', [productId]);
        res.json({
            message: `Product "${product[0].name}" marked as inactive (soft delete).`,
            soft_deleted: true
        });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ error: 'Failed to delete product', details: err.message });
    }
});

module.exports = router;
