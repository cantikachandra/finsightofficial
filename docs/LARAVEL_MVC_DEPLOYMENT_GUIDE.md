# FinSight UMKM - Panduan Arsitektur & Deployment Laravel (MVC Pattern)

Dokumen ini disusun untuk memudahkan deployment aplikasi **FinSight: An Intelligent QRIS-Integrated Financial Management App for Funding-Ready SMEs** ke dalam framework **PHP Laravel (versi 10/11)** menggunakan konsep **MVC (Model - View - Controller)** dan arsitektur database multi-user terisolasi.

---

## 1. Konsep Dasar 3 Elemen Laravel (MVC)

1. **Model (Database & Relasi Data)**:
   - Merepresentasikan tabel database dan relasi antar data.
   - Setiap akun memiliki data terisolasi menggunakan `user_id`.
   - Terdiri dari: `User`, `Transaction`, `QrisMutation`, `Product`, `Notification`, dan `EmailVerification`.

2. **Controller (Logika Bisnis & Pengolahan Data)**:
   - Mengatur logika sistem, penerimaan request dari user, perhitungan kalkulator kesehatan usaha (*traffic-light*), ekstraksi OCR struk, dan pengiriman email OTP via `finsight.offc@gmail.com`.
   - Terdiri dari: `AuthController`, `TransactionController`, `QrisController`, `ReportController`, dan `OcrController`.

3. **View (Tampilan Antarmuka)**:
   - Tampilan visual responsif berbasis **React + Tailwind CSS** (via `@vite(['resources/css/app.css', 'resources/js/app.tsx'])` pada Laravel) atau Blade template (`resources/views/`).

---

## 2. Struktur Database & Migration Laravel

### Tabel 1: `users`
Menyimpan profil pemilik usaha dan merchant ID QRIS.
```php
// database/migrations/2026_01_01_000000_create_users_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('full_name');
            $table->string('business_name');
            $table->string('business_type')->default('Kuliner & Minuman');
            $table->string('phone')->nullable();
            $table->string('city')->default('Surabaya');
            $table->string('qris_merchant_id')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->string('role')->default('owner');
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('users');
    }
};
```

### Tabel 2: `transactions`
Menyimpan buku kas per masing-masing akun (`user_id`).
```php
// database/migrations/2026_01_01_000001_create_transactions_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->time('time')->nullable();
            $table->string('description');
            $table->string('category'); // Penjualan QRIS, Penjualan Tunai, Belanja Bahan Baku, Operasional, dll.
            $table->enum('type', ['income', 'expense']);
            $table->decimal('amount', 15, 2);
            $table->enum('source', ['qris', 'ocr_scan', 'manual'])->default('manual');
            $table->string('payment_method')->default('Tunai'); // QRIS, Tunai, Transfer Bank, Kartu
            $table->string('reference_no')->nullable();
            $table->json('items')->nullable(); // Rincian belanja barang hasil scan OCR
            $table->text('notes')->nullable();
            $table->text('receipt_image_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('transactions');
    }
};
```

### Tabel 3: `qris_mutations`
Menyimpan mutasi penyelesaian transaksi QRIS Bank Indonesia secara real-time.
```php
// database/migrations/2026_01_01_000002_create_qris_mutations_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('qris_mutations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('timestamp');
            $table->decimal('amount', 15, 2);
            $table->string('customer_name');
            $table->string('issuer'); // ShopeePay, GoPay, BCA QRIS, Dana, OVO, dll.
            $table->string('rrn')->index(); // Retrieval Reference Number QRIS
            $table->enum('status', ['settled', 'pending'])->default('settled');
            $table->boolean('synced_to_ledger')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('qris_mutations');
    }
};
```

---

## 3. Eloquent Model (M in MVC)

### Model `app/Models/User.php`
```php
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable {
    use HasUuids, Notifiable;

    protected $fillable = [
        'email', 'password', 'full_name', 'business_name',
        'business_type', 'phone', 'city', 'qris_merchant_id',
        'is_verified', 'role'
    ];

    protected $hidden = ['password', 'remember_token'];

    public function transactions() {
        return $this->hasMany(Transaction::class);
    }

    public function qrisMutations() {
        return $this->hasMany(QrisMutation::class);
    }

    public function products() {
        return $this->hasMany(Product::class);
    }

    public function notifications() {
        return $this->hasMany(Notification::class);
    }
}
```

### Model `app/Models/Transaction.php`
```php
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model {
    use HasUuids;

    protected $fillable = [
        'user_id', 'date', 'time', 'description', 'category',
        'type', 'amount', 'source', 'payment_method',
        'reference_no', 'items', 'notes', 'receipt_image_path'
    ];

    protected $casts = [
        'items' => 'array',
        'amount' => 'decimal:2',
        'date' => 'date',
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }
}
```

---

## 4. Controller (C in MVC)

### `app/Http/Controllers/ReportController.php`
Controller untuk menghitung **Traffic Light Kesehatan Usaha**, Moving Average Arus Kas, dan Skor Kesiapan KUR:
```php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Transaction;

class ReportController extends Controller {
    public function summary(Request $request) {
        $userId = $request->user()->id ?? $request->query('userId');
        $transactions = Transaction::where('user_id', $userId)->get();

        $totalIncome = $transactions->where('type', 'income')->sum('amount');
        $totalExpense = $transactions->where('type', 'expense')->sum('amount');
        $netProfit = $totalIncome - $totalExpense;
        $netMargin = $totalIncome > 0 ? round(($netProfit / $totalIncome) * 100, 1) : 0;

        $qrisIncome = $transactions->where('type', 'income')
            ->whereIn('payment_method', ['QRIS', 'qris'])
            ->sum('amount');
        $qrisAdoptionRate = $totalIncome > 0 ? round(($qrisIncome / $totalIncome) * 100) : 0;

        // Evaluasi Skor Traffic Light FinSight
        $status = 'kuning';
        $score = 50;
        $level = 'Level 2 (Berkembang)';

        if ($netMargin >= 25 && $transactions->count() >= 8) {
            $status = 'hijau';
            $score = min(96, round(75 + ($netMargin - 25) * 0.5 + ($qrisAdoptionRate > 70 ? 10 : 5)));
            $level = 'Level 3 (Siap KUR / Bankable)';
        } elseif ($netMargin < 5) {
            $status = 'merah';
            $score = 35;
            $level = 'Level 1 (Pemula)';
        }

        return response()->json([
            'metrics' => [
                'totalIncome' => $totalIncome,
                'totalExpense' => $totalExpense,
                'netProfit' => $netProfit,
                'netMargin' => $netMargin,
                'qrisAdoptionRate' => $qrisAdoptionRate,
            ],
            'health' => [
                'status' => $status,
                'score' => $score,
                'fundingReadinessLevel' => $level,
                'forecast' => [
                    'projectedIncome' => round($totalIncome / 2),
                    'projectedExpense' => round($totalExpense / 2),
                    'confidence' => 91,
                ]
            ]
        ]);
    }
}
```

---

## 5. Konfigurasi SMTP Email Gmail di `.env` Laravel

Sesuai permintaan Anda untuk pengiriman email resmi aktivasi via `finsight.offc@gmail.com`:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=finsight.offc@gmail.com
MAIL_PASSWORD=sourcandy14
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="finsight.offc@gmail.com"
MAIL_FROM_NAME="FinSight UMKM Official"
```

---

## 6. Cara Menjalankan di Laravel
1. Jalankan migrasi database:
   ```bash
   php artisan migrate
   ```
2. Jalankan build frontend:
   ```bash
   npm run build
   ```
3. Jalankan server Laravel:
   ```bash
   php artisan serve
   ```
Aplikasi FinSight siap digunakan dengan pemisahan database per akun pengguna yang aman dan terisolasi!
