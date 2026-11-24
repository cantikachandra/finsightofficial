-- ====================================================================
-- FINSIGHT UMKM - DATABASE SCHEMA FOR XAMPP & MYSQL / PHPMYADMIN
-- Database: finsight_db
-- Dibuat untuk Deployment Laravel 10/11 & XAMPP
-- Standard SAK EMKM & Bank Indonesia QRIS
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `finsight_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `finsight_db`;

-- 1. TABEL PENGGUNA (USERS)
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(64) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(191) NOT NULL DEFAULT 'Anonymous',
  `business_name` VARCHAR(191) NOT NULL DEFAULT 'Usaha Mandiri (Anonymous)',
  `business_type` VARCHAR(100) NOT NULL DEFAULT 'Kuliner & Usaha Ritel',
  `phone` VARCHAR(30) DEFAULT '081234567890',
  `city` VARCHAR(100) DEFAULT 'Indonesia',
  `qris_merchant_id` VARCHAR(64) DEFAULT 'NMID-ID102008492019',
  `is_verified` TINYINT(1) NOT NULL DEFAULT 1,
  `role` ENUM('owner', 'staff', 'accountant') NOT NULL DEFAULT 'owner',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_phone_unique` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABEL TOKEN MAGIC LINK GMAIL (finsight.offc@gmail.com)
DROP TABLE IF EXISTS `magic_links`;
CREATE TABLE `magic_links` (
  `id` VARCHAR(64) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  `is_used` TINYINT(1) NOT NULL DEFAULT 0,
  `sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `magic_links_token_unique` (`token`),
  KEY `magic_links_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABEL PENDAPATAN DAN KAS HARIAN (BUKU BESAR KAS - DAILY CASH & REVENUE LEDGER)
DROP TABLE IF EXISTS `daily_cash_ledgers`;
CREATE TABLE `daily_cash_ledgers` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `trans_date` DATE NOT NULL,
  `trans_time` TIME NOT NULL,
  `reference_no` VARCHAR(64) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'Tunai',
  `type` ENUM('income', 'expense') NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `running_balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `source` ENUM('manual', 'qris', 'ocr_scan') NOT NULL DEFAULT 'manual',
  `notes` TEXT NULL,
  `receipt_image_path` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `daily_cash_user_idx` (`user_id`),
  KEY `daily_cash_date_idx` (`trans_date`),
  KEY `daily_cash_type_idx` (`type`),
  CONSTRAINT `fk_daily_cash_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABEL MUTASI QRIS (QRIS INCOMING SETTLEMENTS)
DROP TABLE IF EXISTS `qris_mutations`;
CREATE TABLE `qris_mutations` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `customer_name` VARCHAR(191) NOT NULL,
  `issuer` VARCHAR(100) NOT NULL,
  `rrn` VARCHAR(64) NOT NULL,
  `status` ENUM('settled', 'pending', 'failed') NOT NULL DEFAULT 'settled',
  `synced_to_ledger` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `qris_mutations_rrn_unique` (`rrn`),
  KEY `qris_mutations_user_idx` (`user_id`),
  CONSTRAINT `fk_qris_mut_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABEL KATALOG PRODUK & HARGA POKOK PENJUALAN (HPP)
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `sku` VARCHAR(64) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `selling_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `cost_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `stock` INT NOT NULL DEFAULT 0,
  `unit` VARCHAR(30) NOT NULL DEFAULT 'Porsi',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `products_user_idx` (`user_id`),
  CONSTRAINT `fk_products_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABEL NOTIFIKASI WEB & HANDPHONE (ALERTS)
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('income', 'expense', 'system', 'kur_alert') NOT NULL,
  `amount` DECIMAL(15, 2) NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `notifications_user_idx` (`user_id`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- SEED INITIAL DATA (1 CONTOH DATA LENGKAP SIAP PAKAI)
-- ====================================================================

INSERT INTO `users` (`id`, `email`, `password`, `full_name`, `business_name`, `business_type`, `phone`, `city`, `qris_merchant_id`, `is_verified`, `role`)
VALUES
('user_anonymous', 'anonymous@finsight.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Anonymous', 'Usaha Mandiri (Anonymous)', 'Kuliner & Usaha Ritel', '081234567890', 'Indonesia', 'NMID-ID102008492019', 1, 'owner');

INSERT INTO `products` (`id`, `user_id`, `name`, `sku`, `category`, `selling_price`, `cost_price`, `stock`, `unit`)
VALUES
('prod_01', 'user_anonymous', 'Kopi Susu Aren Gula Aren Spesial', 'KOP-001', 'Minuman', 18000.00, 6500.00, 50, 'Cup'),
('prod_02', 'user_anonymous', 'Americano Robusta Single Origin', 'KOP-002', 'Minuman', 15000.00, 4000.00, 45, 'Cup'),
('prod_03', 'user_anonymous', 'Dimsum Ayam Mentai (Isi 4)', 'DIM-001', 'Makanan', 24000.00, 11000.00, 30, 'Porsi'),
('prod_04', 'user_anonymous', 'Croissant Mentega Premium', 'BAK-001', 'Pastry', 22000.00, 9500.00, 25, 'Pcs');

INSERT INTO `daily_cash_ledgers` (`id`, `user_id`, `trans_date`, `trans_time`, `reference_no`, `description`, `category`, `payment_method`, `type`, `amount`, `running_balance`, `source`, `notes`)
VALUES
('tx_seed_01', 'user_anonymous', CURRENT_DATE(), '14:20:00', 'QRIS-20261104-001', 'Penjualan QRIS Siang (12 Pesanan Kopi Susu & Dimsum)', 'Penjualan QRIS', 'QRIS', 'income', 485000.00, 3985000.00, 'qris', 'Otomatis via QRIS GoPay & BCA'),
('tx_seed_02', 'user_anonymous', CURRENT_DATE(), '11:15:00', 'OCR-NOTA-8821', 'Struk Belanja Biji Kopi Arabika 3kg & Susu UHT 1 Karton', 'Belanja Bahan Baku', 'Tunai', 'expense', 410000.00, 3575000.00, 'ocr_scan', 'Scan bon Indogrosir via AI OCR'),
('tx_seed_03', 'user_anonymous', CURRENT_DATE() - INTERVAL 1 DAY, '19:40:00', 'QRIS-20261103-089', 'Penjualan QRIS Malam (Dimsum & Minuman)', 'Penjualan QRIS', 'QRIS', 'income', 620000.00, 4195000.00, 'qris', 'Pelanggan Dine-in'),
('tx_seed_04', 'user_anonymous', CURRENT_DATE() - INTERVAL 1 DAY, '10:00:00', 'MAN-PLN-01', 'Bayar Token Listrik Outlet Bulan Berjalan', 'Sewa Tempat & Listrik', 'Transfer Bank', 'expense', 350000.00, 3845000.00, 'manual', 'PLN Prabayar 1300VA'),
('tx_seed_05', 'user_anonymous', CURRENT_DATE() - INTERVAL 2 DAY, '16:00:00', 'CASH-20261102-12', 'Penjualan Tunai Kasir Kasir Toko Sore', 'Penjualan Tunai', 'Tunai', 'income', 350000.00, 4195000.00, 'manual', 'Setoran fisik kasir');

INSERT INTO `qris_mutations` (`id`, `user_id`, `timestamp`, `amount`, `customer_name`, `issuer`, `rrn`, `status`, `synced_to_ledger`)
VALUES
('qmut_01', 'user_anonymous', NOW() - INTERVAL 2 HOUR, 485000.00, 'Dewi Sartika', 'BCA QRIS', '002948102948', 'settled', 1),
('qmut_02', 'user_anonymous', NOW() - INTERVAL 26 HOUR, 620000.00, 'Ahmad Fauzi', 'GoPay', '001928374650', 'settled', 1);

INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `amount`, `is_read`)
VALUES
('notif_01', 'user_anonymous', 'Pemasukan QRIS Masuk! 💰', 'Mutasi QRIS Rp 485.000 dari Dewi Sartika (BCA QRIS) otomatis tercatat di kas.', 'income', 485000.00, 0),
('notif_02', 'user_anonymous', 'Skor Kesehatan Keuangan Hijau (86/100)', 'Laporan keuangan Anda memenuhi standar SIDT & Bank Indonesia untuk pengajuan KUR.', 'kur_alert', NULL, 0);
