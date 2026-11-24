# PANDUAN DEPLOYMENT & CARA PAKAI FINSIGHT DI LARAVEL & XAMPP

FinSight UMKM dirancang dengan arsitektur MVC (Model, View, Controller) standar Laravel 10/11 dan database MySQL XAMPP (phpMyAdmin).

---

## 📁 Struktur 3 Elemen Utama di Folder `/laravel_app_ready/`

1. **Database & Migration (`/laravel_app_ready/database/`)**:
   - `finsight_xampp_mysql.sql`: Script SQL lengkap berisi tabel `users`, `magic_links`, `daily_cash_ledgers`, `qris_mutations`, `products`, `notifications`, beserta data seed awal (1 usaha lengkap siap uji). Bisa langsung di-import di phpMyAdmin.
   - `migrations/2026_01_01_000001_create_finsight_tables.php`: Skema migrasi Laravel resmi (`php artisan migrate`).

2. **Controllers (`/laravel_app_ready/app/Http/Controllers/`)**:
   - `AuthController.php`: Mengatur autentikasi magic link konfirmasi email via Gmail resmi (`finsight.offc@gmail.com`).
   - `FinancialReportController.php`:
     1. Menghitung **Laporan Laba Rugi (Income Statement)**: Omzet QRIS, Tunai, HPP bahan baku, Laba Kotor, Beban Operasional, Laba Bersih, Net Margin.
     2. Menghitung **Neraca (Laporan Posisi Keuangan - SAK EMKM)**: Kas fisik, Bank/QRIS, Piutang, Persediaan, Peralatan, Utang usaha, Beban akrual, Modal pemilik, dan Laba ditahan (*Balanced: Aktiva = Pasiva*).
     3. Menghitung **Tabel Pendapatan dan Kas Harian**: Saldo kas berjalan (*Running Balance*).
     4. Export file spreadsheet **Excel (.CSV)** multi-tabel dan cetak **PDF**.
   - `QrisMutationController.php`: Mengatur mutasi QRIS otomatis masuk dan sinkronisasi realtime ke kas.

3. **Views / Tampilan (`/laravel_app_ready/resources/views/`)**:
   - `layouts/app.blade.php`: Layout modern nuansa putih-biru elegan dengan logo resmi FinSight.
   - `auth/login.blade.php`: Halaman awal login minimalis dengan foto nyata keuangan asli dan pengiriman link konfirmasi email.
   - `reports/laba_rugi_dan_neraca.blade.php`: Halaman 3 laporan lengkap (Laba Rugi, Neraca, Buku Kas Harian) dengan tombol Unduh Excel dan Cetak PDF.
   - `dashboard.blade.php`: Halaman ringkasan kartu saldo kas dan kelayakan KUR.

---

## 🚀 Langkah Instalasi & Menjalankan di XAMPP

### Langkah 1: Buka XAMPP Control Panel
1. Buka aplikasi **XAMPP Control Panel**.
2. Klik tombol **Start** pada modul **Apache** dan **MySQL**.

### Langkah 2: Buat Database di phpMyAdmin
1. Buka browser dan kunjungi `http://localhost/phpmyadmin`.
2. Klik tab **Databases** (Basis Data).
3. Buat database baru bernama: `finsight_db` (Collation: `utf8mb4_unicode_ci`).
4. Klik tab **Import** (Impor), lalu pilih file:
   `laravel_app_ready/database/finsight_xampp_mysql.sql`
5. Klik tombol **Import** di bagian bawah. Seluruh tabel dan data contoh akan terisi otomatis!

### Langkah 3: Setup File `.env` Laravel
Pastikan baris berikut ada di file `.env` project Laravel Anda:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=finsight_db
DB_USERNAME=root
DB_PASSWORD=

# SMTP GMAIL RESMI FINSIGHT
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=finsight.offc@gmail.com
MAIL_PASSWORD=sourcandy14
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="finsight.offc@gmail.com"
MAIL_FROM_NAME="FinSight Official"
```

### Langkah 4: Salin File Controller & View ke Project Laravel
- Salin isi folder `laravel_app_ready/app/Http/Controllers/` ke folder `app/Http/Controllers/` di Laravel Anda.
- Salin isi folder `laravel_app_ready/resources/views/` ke folder `resources/views/` di Laravel Anda.
- Salin route dari `laravel_app_ready/routes/web.php` ke `routes/web.php` di Laravel Anda.

### Langkah 5: Jalankan Server Laravel
Buka terminal / CMD di folder project Laravel:
```bash
php artisan serve
```
Buka browser di `http://127.0.0.1:8000`.

Halaman pertama yang muncul adalah halaman login minimalis bernuansa putih-biru dengan foto keuangan asli. Anda bisa memasukkan email untuk menerima link konfirmasi otomatis via `finsight.offc@gmail.com` atau klik **"Masuk Instan dengan Akun Anonymous"** untuk langsung melihat simulasi 3 laporan keuangan lengkap!
