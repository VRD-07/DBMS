-- ============================================================================
-- Voltcart - Electronics Store Database Management System
-- Seed Data (Realistic Catalog, Customers, and Orders)
-- Believable Specs, INR Prices, Realistic Indian Customer Profiles
-- ============================================================================

-- Ensure defaultdb is active
USE defaultdb;

SET FOREIGN_KEY_CHECKS = 0;

-- Clean existing data before seeding
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE customers;
TRUNCATE TABLE products;
TRUNCATE TABLE suppliers;
TRUNCATE TABLE brands;
TRUNCATE TABLE categories;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. CATEGORIES (6 Categories)
-- ----------------------------------------------------------------------------
INSERT INTO categories (category_id, name, slug) VALUES
(1, 'Phones', 'phones'),
(2, 'Laptops', 'laptops'),
(3, 'Audio', 'audio'),
(4, 'Cameras', 'cameras'),
(5, 'Wearables', 'wearables'),
(6, 'Accessories', 'accessories');

-- ----------------------------------------------------------------------------
-- 2. BRANDS (8 Brands)
-- ----------------------------------------------------------------------------
INSERT INTO brands (brand_id, name, country) VALUES
(1, 'Apple', 'USA'),
(2, 'Sony', 'Japan'),
(3, 'Samsung', 'South Korea'),
(4, 'Dell', 'USA'),
(5, 'Bose', 'USA'),
(6, 'Fujifilm', 'Japan'),
(7, 'Keychron', 'China'),
(8, 'Anker', 'China');

-- ----------------------------------------------------------------------------
-- 3. SUPPLIERS (3 Suppliers)
-- ----------------------------------------------------------------------------
INSERT INTO suppliers (supplier_id, name, email, phone) VALUES
(1, 'Apex Global Logistics', 'contact@apexlogistics.in', '+91 98201 11223'),
(2, 'Nexus Tech Distribution', 'orders@nexustech.in', '+91 98402 33445'),
(3, 'Silicon Wave India', 'inventory@siliconwave.in', '+91 99003 55667');

-- ----------------------------------------------------------------------------
-- 4. PRODUCTS (30 Products across 6 categories, INR pricing)
-- ----------------------------------------------------------------------------
INSERT INTO products (product_id, name, sku, description, price, stock_qty, image_url, category_id, brand_id, supplier_id, is_active) VALUES
-- PHONES (Category 1)
(1, 'Apple iPhone 15 Pro Max (256GB)', 'PHN-APL-15PM', 'Titanium design, A17 Pro chip, 48MP main camera system with 5x optical telephoto lens, USB-C with USB 3 speeds.', 134900.00, 18, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80', 1, 1, 1, TRUE),
(2, 'Samsung Galaxy S24 Ultra (512GB)', 'PHN-SAM-S24U', 'Snapdragon 8 Gen 3, 200MP sensor, integrated S-Pen stylus, flat 6.8-inch Dynamic AMOLED 2X 120Hz display with Gorilla Armor.', 129999.00, 14, 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80', 1, 3, 1, TRUE),
(3, 'Sony Xperia 1 V 5G (256GB)', 'PHN-SNY-XP1V', 'Next-generation Exmor T mobile sensor, 4K 120Hz OLED display, dedicated shutter button and 3.5mm headphone jack for audiophiles.', 114999.00, 4, 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80', 1, 2, 2, TRUE),
(4, 'Apple iPhone 14 (128GB - Midnight)', 'PHN-APL-14128', 'Super Retina XDR OLED display, A15 Bionic chip with 5-core GPU, cinematic 4K video recording, all-day battery life.', 58999.00, 22, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80', 1, 1, 1, TRUE),
(5, 'Samsung Galaxy Z Flip 5 (256GB)', 'PHN-SAM-ZFLP5', 'Compact foldable with 3.4-inch Flex Window cover screen, zero-gap hinge mechanism, dual 12MP cameras with FlexCam.', 79999.00, 9, 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80', 1, 3, 2, TRUE),

-- LAPTOPS (Category 2)
(6, 'Apple MacBook Pro 16" (M3 Max, 36GB)', 'LAP-APL-MBP16', '14-core CPU, 30-core GPU, Liquid Retina XDR display with 1600 nits peak brightness, 22-hour battery life, 1TB SSD.', 299900.00, 8, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80', 2, 1, 1, TRUE),
(7, 'Apple MacBook Air 15" (M2, 16GB, 512GB)', 'LAP-APL-MBA15', '15.3-inch Liquid Retina display, fanless silent operation, 1080p FaceTime HD camera, MagSafe 3 charging port.', 134900.00, 15, 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600&auto=format&fit=crop&q=80', 2, 1, 1, TRUE),
(8, 'Dell XPS 15 9530 (i7-13700H, RTX 4060)', 'LAP-DEL-XPS15', '3.5K OLED touch display with 100% DCI-P3, CNC machined aluminum chassis with carbon-fiber palm rest, 32GB DDR5, 1TB NVMe.', 184500.00, 7, 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=80', 2, 4, 3, TRUE),
(9, 'Dell XPS 13 Plus (i7-1360P, 16GB)', 'LAP-DEL-XPS13', 'Zero-lattice keyboard, capacitive touch function row, seamless glass haptic touchpad, InfinityEdge FHD+ Anti-Glare panel.', 139900.00, 11, 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80', 2, 4, 3, TRUE),
(10, 'Samsung Galaxy Book3 Pro 360', 'LAP-SAM-BK360', '2-in-1 convertible, 16-inch 3K Dynamic AMOLED 2X, S-Pen included, Intel Core i7 13th Gen, ultra-thin 12.8mm profile.', 146990.00, 6, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80', 2, 3, 2, TRUE),

-- AUDIO (Category 3)
(11, 'Sony WH-1000XM5 Wireless Headphones', 'AUD-SNY-XM5', 'Industry-leading Active Noise Cancellation with dual V1 and QN1 processors, 30-hour battery, Speak-to-Chat, LDAC Hi-Res audio.', 29990.00, 26, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80', 3, 2, 2, TRUE),
(12, 'Bose QuietComfort Ultra Headphones', 'AUD-BOS-QCU', 'Immersive Spatial Audio, CustomTune sound calibration technology, world-class acoustic noise cancellation, ultra-plush cushions.', 35900.00, 12, 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80', 3, 5, 2, TRUE),
(13, 'Apple AirPods Pro (2nd Gen, USB-C)', 'AUD-APL-APP2', 'H2 chip, 2x more Active Noise Cancellation, Adaptive Audio, Conversation Awareness, personalized spatial audio with head tracking.', 22990.00, 35, 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80', 3, 1, 1, TRUE),
(14, 'Sony WF-1000XM5 Noise Canceling Earbuds', 'AUD-SNY-WFXM5', 'Dynamic Driver X for richer vocals, dual feedback mics, IPX4 water resistance, Multipoint connection with 24h battery life.', 21990.00, 19, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80', 3, 2, 2, TRUE),
(15, 'Bose SoundLink Revolve+ II Bluetooth Speaker', 'AUD-BOS-SLR2', 'True 360-degree room-filling acoustic sound, durable water-resistant aluminum enclosure (IP55), flexible fabric handle, 17h battery.', 24500.00, 14, 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80', 3, 5, 2, TRUE),

-- CAMERAS (Category 4)
(16, 'Fujifilm X-T5 Mirrorless Camera (Body)', 'CAM-FUJ-XT5', '40.2MP X-Trans CMOS 5 HR sensor, 5-axis 7-stop in-body image stabilization, classic analog control dials, 6.2K/30p video.', 169999.00, 5, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80', 4, 6, 3, TRUE),
(17, 'Fujifilm X100V Compact Camera (Silver)', 'CAM-FUJ-X100V', 'Fixed 23mm F2 lens, hybrid optical and electronic viewfinder, legendary film simulations (Classic Chrome, Acros), leaf shutter.', 139999.00, 3, 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&auto=format&fit=crop&q=80', 4, 6, 3, TRUE),
(18, 'Sony Alpha 7 IV Full-Frame Camera (Body)', 'CAM-SNY-A7M4', '33MP full-frame Exmor R back-illuminated sensor, real-time Eye AF for humans/animals/birds, 4K 60p 10-bit 4:2:2 recording.', 209990.00, 8, 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80', 4, 2, 2, TRUE),
(19, 'Sony ZV-E10 Vlogging Camera with 16-50mm', 'CAM-SNY-ZVE10', '24.2MP APS-C sensor, interchangeable E-mount lenses, directional 3-capsule microphone with windscreen, background defocus button.', 61490.00, 16, 'https://images.unsplash.com/photo-1622434641406-a158123450f9?w=600&auto=format&fit=crop&q=80', 4, 2, 2, TRUE),
(20, 'Fujifilm Instax Mini Evo Hybrid Camera', 'CAM-FUJ-EVO', 'Hybrid instant camera with digital LCD preview, 10 lens effects and 10 film effects, direct smartphone photo printing via Bluetooth.', 18999.00, 24, 'https://images.unsplash.com/photo-1520390138845-fd2d229dd553?w=600&auto=format&fit=crop&q=80', 4, 6, 3, TRUE),

-- WEARABLES (Category 5)
(21, 'Apple Watch Ultra 2 (49mm Titanium)', 'WEA-APL-WULT2', 'Rugged aerospace-grade titanium case, precision dual-frequency GPS, customizable Action button, 3000 nits display, 100m water resistant.', 89900.00, 11, 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80', 5, 1, 1, TRUE),
(22, 'Apple Watch Series 9 (45mm Starlight)', 'WEA-APL-WS945', 'S9 SiP chip with Double Tap gesture, brighter edge-to-edge display, ECG app, blood oxygen tracking, Crash Detection sensor.', 44900.00, 20, 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80', 5, 1, 1, TRUE),
(23, 'Samsung Galaxy Watch 6 Classic (47mm)', 'WEA-SAM-GW6C', 'Signature rotating physical bezel, Sapphire Crystal glass, advanced sleep coaching, body composition analysis (BIA), Wear OS.', 36999.00, 14, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80', 5, 3, 2, TRUE),
(24, 'Samsung Galaxy Watch 6 (40mm Graphite)', 'WEA-SAM-GW640', 'Slim minimalist aluminum frame, heart rate alert zones, personalized fitness routines, Super AMOLED screen with Always-On display.', 24999.00, 17, 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80', 5, 3, 2, TRUE),
(25, 'Sony SmartBand Talk SWR30 E-Ink', 'WEA-SNY-SWR30', 'Low-power curved E-Ink display, built-in mic and speaker for clear voice calls, Lifelog health tracker, IP68 water resistance.', 9999.00, 3, 'https://images.unsplash.com/photo-1510017803434-a899398421b3?w=600&auto=format&fit=crop&q=80', 5, 2, 2, TRUE),

-- ACCESSORIES (Category 6)
(26, 'Keychron Q1 Pro Wireless Custom Keyboard', 'ACC-KEY-Q1PRO', '75% layout, fully CNC machined aluminum body, hot-swappable Keychron K Pro switches, QMK/VIA programmable, double-gasket mount.', 17999.00, 13, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80', 6, 7, 3, TRUE),
(27, 'Keychron K2 V2 Wireless Mechanical Keyboard', 'ACC-KEY-K2V2', 'Compact 84-key layout, Gateron G Pro Brown switches, connects up to 3 devices via Bluetooth 5.1, Mac and Windows keycaps included.', 8499.00, 25, 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&auto=format&fit=crop&q=80', 6, 7, 3, TRUE),
(28, 'Anker 737 GaNPrime 140W Power Bank', 'ACC-ANK-737PB', '24000mAh capacity, 140W two-way fast charging, smart digital display showing output wattage and battery health, 3 output ports.', 13999.00, 22, 'https://images.unsplash.com/photo-1609592426861-12b2df6e0dd4?w=600&auto=format&fit=crop&q=80', 6, 8, 3, TRUE),
(29, 'Anker 3-in-1 Cube with MagSafe Charger', 'ACC-ANK-3IN1', 'Official 15W MagSafe fast charging for iPhone, Apple Watch magnetic fast charger, and Qi pad for AirPods in an ultra-compact fold.', 12499.00, 15, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80', 6, 8, 3, TRUE),
(30, 'Dell Premier Multi-Device Wireless Mouse MS7421W', 'ACC-DEL-MS7421', 'Rechargeable wireless mouse with up to 6 months per charge, 4000 DPI adjustable optical sensor, dual-mode RF 2.4GHz and Bluetooth 5.0.', 4899.00, 30, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80', 6, 4, 3, TRUE);

-- ----------------------------------------------------------------------------
-- 5. CUSTOMERS (10 Customers across major Indian tech hubs)
-- ----------------------------------------------------------------------------
INSERT INTO customers (customer_id, full_name, email, phone, city, created_at) VALUES
(1, 'Aarav Sharma', 'aarav.sharma@gmail.com', '+91 98200 45112', 'Bengaluru', '2024-01-15 10:30:00'),
(2, 'Priya Nair', 'priya.nair@outlook.com', '+91 98451 98234', 'Mumbai', '2024-01-20 14:15:00'),
(3, 'Rohan Verma', 'rohan.v@techmail.in', '+91 98112 34567', 'New Delhi', '2024-02-01 09:00:00'),
(4, 'Ananya Iyer', 'ananya.iyer@gmail.com', '+91 94441 56789', 'Chennai', '2024-02-12 11:45:00'),
(5, 'Vikram Malhotra', 'vikram.m@zenith.com', '+91 97170 89012', 'Pune', '2024-02-18 16:20:00'),
(6, 'Neha Kulkarni', 'neha.k@cloudworks.io', '+91 99230 12345', 'Hyderabad', '2024-03-05 18:10:00'),
(7, 'Aditya Sen', 'aditya.sen@kolkatatech.org', '+91 98301 67890', 'Kolkata', '2024-03-12 13:50:00'),
(8, 'Divya Patel', 'divya.patel@ahmedabad.biz', '+91 98980 23456', 'Ahmedabad', '2024-03-22 15:30:00'),
(9, 'Kabir Mehta', 'kabir.mehta@freelance.in', '+91 98290 78901', 'Jaipur', '2024-04-02 10:05:00'),
(10, 'Sneha Menon', 'sneha.menon@cochin.dev', '+91 94470 34567', 'Kochi', '2024-04-10 17:40:00');

-- ----------------------------------------------------------------------------
-- 6. ORDERS (12 Orders with varied dates, totals, and statuses)
-- ----------------------------------------------------------------------------
INSERT INTO orders (order_id, customer_id, order_date, status, total_amount) VALUES
(1, 1, '2024-03-01 11:20:00', 'delivered', 157890.00),
(2, 2, '2024-03-04 15:45:00', 'delivered', 65890.00),
(3, 3, '2024-03-10 18:30:00', 'delivered', 184500.00),
(4, 4, '2024-03-15 09:15:00', 'delivered', 41989.00),
(5, 5, '2024-03-20 14:00:00', 'delivered', 134900.00),
(6, 6, '2024-03-25 16:30:00', 'shipped', 51989.00),
(7, 7, '2024-03-28 12:10:00', 'shipped', 169999.00),
(8, 8, '2024-04-01 10:25:00', 'paid', 142498.00),
(9, 9, '2024-04-03 17:05:00', 'paid', 26498.00),
(10, 10, '2024-04-05 13:40:00', 'paid', 44900.00),
(11, 1, '2024-04-08 19:15:00', 'pending', 35900.00),
(12, 3, '2024-04-10 11:00:00', 'cancelled', 29990.00);

-- ----------------------------------------------------------------------------
-- 7. ORDER_ITEMS (Line items matching orders and historic unit prices)
-- Note: If trigger trg_reduce_product_stock is active, it will adjust stock.
-- The stock values seeded above are already configured to withstand deductions.
-- ----------------------------------------------------------------------------
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
-- Order 1 (Aarav): iPhone 15 Pro Max (134,900) + AirPods Pro (22,990) = 157,890
(1, 1, 1, 134900.00),
(1, 13, 1, 22990.00),

-- Order 2 (Priya): iPhone 14 (58,999) + Dell Wireless Mouse (4,899) + discount adjust = 65,890 (or 58999 + 4899 + Anker cable/accessory approx)
(2, 4, 1, 58999.00),
(2, 27, 1, 8499.00), -- Keychron K2 V2 (adjusted matching 67,498 or clean line items)

-- Order 3 (Rohan): Dell XPS 15 (184,500)
(3, 8, 1, 184500.00),

-- Order 4 (Ananya): Sony WF-1000XM5 (21,990) + Fujifilm Instax (18,999) = 40,989
(4, 14, 1, 21990.00),
(4, 20, 1, 18999.00),

-- Order 5 (Vikram): MacBook Air 15" (134,900)
(5, 7, 1, 134900.00),

-- Order 6 (Neha): Sony WH-1000XM5 (29,990) + AirPods Pro (22,990) = 52,980
(6, 11, 1, 29990.00),
(6, 13, 1, 22990.00),

-- Order 7 (Aditya): Fujifilm X-T5 Mirrorless Body (169,999)
(7, 16, 1, 169999.00),

-- Order 8 (Divya): Galaxy S24 Ultra (129,999) + Anker 3-in-1 Cube (12,499) = 142,498
(8, 2, 1, 129999.00),
(8, 29, 1, 12499.00),

-- Order 9 (Kabir): Keychron Q1 Pro (17,999) + Keychron K2 V2 (8,499) = 26,498
(9, 26, 1, 17999.00),
(9, 27, 1, 8499.00),

-- Order 10 (Sneha): Apple Watch Series 9 (44,900)
(10, 22, 1, 44900.00),

-- Order 11 (Aarav): Bose QC Ultra Headphones (35,900)
(11, 12, 1, 35900.00),

-- Order 12 (Rohan): Sony WH-1000XM5 (29,990)
(12, 11, 1, 29990.00);

-- Recalculate and synchronize exact totals from order_items for precision
UPDATE orders o
JOIN (
    SELECT order_id, SUM(quantity * unit_price) AS calculated_total
    FROM order_items
    GROUP BY order_id
) oi ON o.order_id = oi.order_id
SET o.total_amount = oi.calculated_total;
