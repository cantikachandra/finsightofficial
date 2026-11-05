-- =====================================================================
-- FinSight UMKM - Database Schema (MySQL / MariaDB Compatible)
-- Dibuat untuk Deployment Laravel 10/11 & phpMyAdmin
-- Sesuai Riset: Bisnis Digital Cantika Chandra Winata
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `finsight_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `finsight_db`;

-- 1. Tabel Users (Multi-Akun Terisolasi)
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(64) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(191) NOT NULL,
  `business_name` VARCHAR(191) NOT NULL,
  `business_type` VARCHAR(100) DEFAULT 'Kuliner & Minuman',
  `phone` VARCHAR(50) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT 'Surabaya',
  `qris_merchant_id` VARCHAR(100) DEFAULT NULL,
  `is_verified` TINYINT(1) DEFAULT 0,
  `role` VARCHAR(50) DEFAULT 'owner',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel Email Verification Codes (OTP / Link Konfirmasi)
DROP TABLE IF EXISTS `email_verifications`;
CREATE TABLE `email_verifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `code` VARCHAR(10) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `is_used` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_code` (`email`, `code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Transaksi Keuangan (Pemasukan & Pengeluaran)
DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `date` DATE NOT NULL,
  `time` TIME DEFAULT NULL,
  `description` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `source` ENUM('qris', 'ocr_scan', 'manual') DEFAULT 'manual',
  `payment_method` VARCHAR(50) DEFAULT 'Tunai',
  `reference_no` VARCHAR(100) DEFAULT NULL,
  `items` LONGTEXT DEFAULT NULL COMMENT 'JSON array rincian barang hasil scan OCR',
  `notes` TEXT DEFAULT NULL,
  `receipt_image_path` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`, `date`),
  KEY `idx_user_type` (`user_id`, `type`),
  CONSTRAINT `fk_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Mutasi QRIS Real-time
DROP TABLE IF EXISTS `qris_mutations`;
CREATE TABLE `qris_mutations` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `transaction_id` VARCHAR(64) DEFAULT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `customer_name` VARCHAR(191) DEFAULT 'Pelanggan QRIS',
  `issuer` VARCHAR(50) NOT NULL COMMENT 'BCA, Mandiri, GoPay, OVO, ShopeePay, Dana, dll.',
  `rrn` VARCHAR(100) NOT NULL COMMENT 'Retrieval Reference Number dari Bank',
  `status` ENUM('settled', 'pending', 'failed') DEFAULT 'settled',
  `timestamp` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_qris` (`user_id`, `timestamp`),
  CONSTRAINT `fk_qris_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel Produk & Inventori (HPP & Margin)
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `selling_price` DECIMAL(15,2) NOT NULL,
  `cost_price` DECIMAL(15,2) NOT NULL COMMENT 'HPP (Harga Pokok Penjualan)',
  `margin_percent` DECIMAL(5,2) NOT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `min_stock` INT NOT NULL DEFAULT 5,
  `unit` VARCHAR(20) DEFAULT 'porsi',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_products` (`user_id`),
  CONSTRAINT `fk_products_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabel Notifikasi (Web Audio & Push HP)
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('income', 'expense', 'system', 'alert', 'traffic_light') NOT NULL,
  `amount` DECIMAL(15,2) DEFAULT NULL,
  `timestamp` DATETIME NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `channel` VARCHAR(50) DEFAULT 'web_and_mobile',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_notif` (`user_id`, `is_read`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- SEED DATA AWAL (Contoh Akun Cantika Chandra Winata)
-- =====================================================================

INSERT INTO `users` (`id`, `email`, `password`, `full_name`, `business_name`, `business_type`, `phone`, `city`, `qris_merchant_id`, `is_verified`, `role`) VALUES
('usr_cantika_01', 'cantikachandra61@gmail.com', 'cantika123', 'Cantika Chandra Winata', 'Kopi & Kuliner Cantika', 'Kuliner & Kafe', '081234567890', 'Surabaya', 'NMID-ID1020304050', 1, 'owner'),
('usr_demo_02', 'demo@finsight.id', 'demo123', 'Demo FinSight UMKM', 'Kedai Sedap Sejahtera', 'Kuliner & Minuman', '089876543210', 'Surabaya', 'NMID-ID9988776655', 1, 'owner');

-- Seed Produk
INSERT INTO `products` (`id`, `user_id`, `name`, `category`, `selling_price`, `cost_price`, `margin_percent`, `stock`, `min_stock`, `unit`) VALUES
('prd_01', 'usr_cantika_01', 'Es Kopi Susu Gula Aren 250ml', 'Minuman', 18000.00, 7500.00, 58.33, 42, 10, 'cup'),
('prd_02', 'usr_cantika_01', 'Matcha Latte Oatmilk', 'Minuman', 24000.00, 11000.00, 54.17, 28, 8, 'cup'),
('prd_03', 'usr_cantika_01', 'Croissant Butter Panggang', 'Snack & Bakery', 22000.00, 9500.00, 56.82, 15, 5, 'pcs'),
('prd_04', 'usr_cantika_01', 'Nasi Ayam Sambal Matah', 'Makanan Berat', 28000.00, 13500.00, 51.79, 19, 6, 'porsi');

-- Seed Transaksi Pemasukan & Pengeluaran
INSERT INTO `transactions` (`id`, `user_id`, `date`, `time`, `description`, `category`, `type`, `amount`, `source`, `payment_method`, `reference_no`, `notes`) VALUES
('tx_seed_01', 'usr_cantika_01', CURDATE(), '10:30:00', 'Penjualan QRIS - 3x Es Kopi Susu & 2x Croissant', 'Penjualan QRIS', 'income', 98000.00, 'qris', 'QRIS', 'QRIS-2026-001', 'Settlement GoPay instant'),
('tx_seed_02', 'usr_cantika_01', CURDATE(), '08:15:00', 'Belanja Biji Kopi Arabika 2kg & Susu Fresh Milk', 'Bahan Baku', 'expense', 230000.00, 'ocr_scan', 'Transfer Bank', 'INV-SUP-889', 'Hasil scan nota Toko Bahan Kue Maju'),
('tx_seed_03', 'usr_cantika_01', CURDATE() - INTERVAL 1 DAY, '14:20:00', 'Penjualan QRIS - 5x Nasi Ayam & 5x Es Teh Manis', 'Penjualan QRIS', 'income', 175000.00, 'qris', 'QRIS', 'QRIS-2026-002', 'Settlement BCA Mobile'),
('tx_seed_04', 'usr_cantika_01', CURDATE() - INTERVAL 1 DAY, '19:45:00', 'Penjualan Tunai Kasir Sore', 'Penjualan Tunai', 'income', 320000.00, 'manual', 'Tunai', 'POS-CS-004', 'Rekap kasir shift malam'),
('tx_seed_05', 'usr_cantika_01', CURDATE() - INTERVAL 2 DAY, '11:00:00', 'Listrik PLN & Air PDAM Outlet', 'Utilitas & Operasional', 'expense', 450000.00, 'manual', 'Transfer Bank', 'PLN-2026-02', 'Beban rutin bulanan');

-- Selesai
