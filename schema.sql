-- ============================================================================
-- Voltcart - Electronics Store Database Management System
-- Schema Definition (MySQL 8.0+ / InnoDB / utf8mb4)
-- Designed in Third Normal Form (3NF)
-- ============================================================================

-- Ensure defaultdb is active
USE defaultdb;

-- Disable foreign key checks during schema re-creation if needed
SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS v_order_summary;
DROP TRIGGER IF EXISTS trg_reduce_product_stock;
DROP PROCEDURE IF EXISTS place_order;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS categories;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. CATEGORIES TABLE
-- Stores primary classification of electronics (Phones, Laptops, Audio, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. BRANDS TABLE
-- Stores hardware manufacturers and country of origin
-- ----------------------------------------------------------------------------
CREATE TABLE brands (
    brand_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    country VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. SUPPLIERS TABLE
-- Authorized distributors fulfilling inventory batches
-- ----------------------------------------------------------------------------
CREATE TABLE suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(25) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. PRODUCTS TABLE
-- Catalog items with stock tracking, price constraints, and category/brand/supplier FKs
-- ON DELETE RESTRICT on categories & brands prevents orphaned catalog references
-- ON DELETE SET NULL on suppliers allows supplier updates without losing product data
-- ----------------------------------------------------------------------------
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(30) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_qty INT NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    category_id INT NOT NULL,
    brand_id INT NOT NULL,
    supplier_id INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_products_price CHECK (price > 0),
    CONSTRAINT chk_products_stock CHECK (stock_qty >= 0),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id)
        REFERENCES brands(brand_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id)
        REFERENCES suppliers(supplier_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. CUSTOMERS TABLE
-- Registered store clients
-- ----------------------------------------------------------------------------
CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(25) NOT NULL,
    city VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. ORDERS TABLE
-- High-level purchase record linked to a customer
-- ON DELETE RESTRICT protects order history even if customer profile is modified
-- ----------------------------------------------------------------------------
CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT chk_orders_total CHECK (total_amount >= 0),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. ORDER_ITEMS TABLE
-- Line items per order with composite PK (order_id, product_id)
-- unit_price captures historical price at the moment of checkout (immutable accounting)
-- ON DELETE CASCADE on order_id removes line items if an order is discarded
-- ON DELETE RESTRICT on product_id prevents deleting products that appear in past orders
-- ----------------------------------------------------------------------------
CREATE TABLE order_items (
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (order_id, product_id),
    CONSTRAINT chk_items_quantity CHECK (quantity > 0),
    CONSTRAINT chk_items_unit_price CHECK (unit_price > 0),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_date ON orders(order_date);

-- ============================================================================
-- VIEW: v_order_summary
-- Aggregates orders with customer metadata, calculated item count and total amount
-- ============================================================================
CREATE OR REPLACE VIEW v_order_summary AS
SELECT 
    o.order_id,
    o.customer_id,
    c.full_name AS customer_name,
    c.email AS customer_email,
    c.city AS customer_city,
    o.order_date,
    o.status,
    COALESCE(SUM(oi.quantity), 0) AS item_count,
    o.total_amount
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY 
    o.order_id,
    o.customer_id,
    c.full_name,
    c.email,
    c.city,
    o.order_date,
    o.status,
    o.total_amount;

-- ============================================================================
-- TRIGGER: trg_reduce_product_stock
-- Fires BEFORE INSERT on order_items:
-- 1. Verifies that the requested product exists and has sufficient stock.
-- 2. Raises a standard SQLSTATE '45000' error if stock would become negative.
-- 3. Automatically decrements products.stock_qty.
-- ============================================================================
DELIMITER $$

CREATE TRIGGER trg_reduce_product_stock
BEFORE INSERT ON order_items
FOR EACH ROW
BEGIN
    DECLARE current_stock INT;
    DECLARE product_name_val VARCHAR(150);

    -- Lock and check the product row to ensure atomic stock check
    SELECT stock_qty, name INTO current_stock, product_name_val
    FROM products
    WHERE product_id = NEW.product_id
    FOR UPDATE;

    IF current_stock IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Order failed: Product does not exist in inventory.';
    ELSEIF current_stock < NEW.quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Order failed: Insufficient stock for the requested product.';
    ELSE
        -- Deduct the inventory quantity
        UPDATE products
        SET stock_qty = stock_qty - NEW.quantity
        WHERE product_id = NEW.product_id;
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- STORED PROCEDURE: place_order
-- Places an entire customer order atomically inside MySQL
-- Parameters:
--   p_customer_id: INT
--   p_items: JSON array format: [{"product_id": 1, "quantity": 2}, ...]
--   p_order_id: OUT INT (returns generated order ID)
-- ============================================================================
DELIMITER $$

CREATE PROCEDURE place_order(
    IN p_customer_id INT,
    IN p_items JSON,
    OUT p_order_id INT
)
proc_label: BEGIN
    DECLARE v_item_count INT DEFAULT 0;
    DECLARE v_i INT DEFAULT 0;
    DECLARE v_prod_id INT;
    DECLARE v_qty INT;
    DECLARE v_price DECIMAL(10,2);
    DECLARE v_total DECIMAL(10,2) DEFAULT 0.00;

    -- Error handler to rollback on SQLEXCEPTION
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Basic customer validation
    IF NOT EXISTS (SELECT 1 FROM customers WHERE customer_id = p_customer_id) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid customer ID.';
    END IF;

    SET v_item_count = JSON_LENGTH(p_items);
    IF v_item_count IS NULL OR v_item_count = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Order items cannot be empty.';
    END IF;

    START TRANSACTION;

    -- 1. Create order record with provisional total 0
    INSERT INTO orders (customer_id, order_date, status, total_amount)
    VALUES (p_customer_id, NOW(), 'paid', 0.00);

    SET p_order_id = LAST_INSERT_ID();

    -- 2. Loop through JSON items array
    WHILE v_i < v_item_count DO
        SET v_prod_id = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].product_id')));
        SET v_qty     = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].quantity')));

        IF v_qty <= 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Item quantity must be greater than zero.';
        END IF;

        -- Fetch current active product price
        SELECT price INTO v_price
        FROM products
        WHERE product_id = v_prod_id AND is_active = TRUE;

        IF v_price IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'One or more products are inactive or do not exist.';
        END IF;

        -- Insert line item (fires trigger trg_reduce_product_stock automatically)
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES (p_order_id, v_prod_id, v_qty, v_price);

        SET v_total = v_total + (v_price * v_qty);
        SET v_i = v_i + 1;
    END WHILE;

    -- 3. Finalize total amount
    UPDATE orders
    SET total_amount = v_total
    WHERE order_id = p_order_id;

    COMMIT;
END$$

DELIMITER ;
