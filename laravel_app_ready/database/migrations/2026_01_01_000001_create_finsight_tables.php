<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * FinSight UMKM: Tabel Pengguna, Magic Links, Kas Harian, QRIS, Produk, Notifikasi
     */
    public function up(): void
    {
        // 1. Users
        if (!Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->string('id', 64)->primary();
                $table->string('email')->unique();
                $table->string('password')->default('magic_login');
                $table->string('full_name')->default('Anonymous');
                $table->string('business_name')->default('Usaha Mandiri (Anonymous)');
                $table->string('business_type')->default('Kuliner & Usaha Ritel');
                $table->string('phone')->unique();
                $table->string('city')->nullable()->default('Indonesia');
                $table->string('qris_merchant_id')->default('NMID-ID102008492019');
                $table->boolean('is_verified')->default(true);
                $table->enum('role', ['owner', 'staff', 'accountant'])->default('owner');
                $table->rememberToken();
                $table->timestamps();
            });
        }

        // 2. Magic Links
        Schema::create('magic_links', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('email')->index();
            $table->string('token')->unique();
            $table->boolean('is_used')->default(false);
            $table->timestamp('sent_at')->useCurrent();
            $table->timestamp('expires_at');
            $table->timestamps();
        });

        // 3. Tabel Pendapatan dan Kas Harian (Buku Besar)
        Schema::create('daily_cash_ledgers', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('user_id', 64)->index();
            $table->date('trans_date')->index();
            $table->time('trans_time');
            $table->string('reference_no', 64)->index();
            $table->string('description', 255);
            $table->string('category', 100)->index();
            $table->string('payment_method', 50)->default('Tunai');
            $table->enum('type', ['income', 'expense'])->index();
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('running_balance', 15, 2)->default(0);
            $table->enum('source', ['manual', 'qris', 'ocr_scan'])->default('manual');
            $table->text('notes')->nullable();
            $table->string('receipt_image_path', 255)->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        // 4. Mutasi QRIS Otomatis
        Schema::create('qris_mutations', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('user_id', 64)->index();
            $table->timestamp('timestamp')->useCurrent();
            $table->decimal('amount', 15, 2)->default(0);
            $table->string('customer_name');
            $table->string('issuer', 100);
            $table->string('rrn', 64)->unique();
            $table->enum('status', ['settled', 'pending', 'failed'])->default('settled');
            $table->boolean('synced_to_ledger')->default(true);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        // 5. Produk & HPP
        Schema::create('products', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('user_id', 64)->index();
            $table->string('name');
            $table->string('sku', 64);
            $table->string('category', 100);
            $table->decimal('selling_price', 15, 2)->default(0);
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->integer('stock')->default(0);
            $table->string('unit', 30)->default('Porsi');
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        // 6. Notifikasi Web & Mobile
        Schema::create('notifications', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('user_id', 64)->index();
            $table->string('title');
            $table->text('message');
            $table->enum('type', ['income', 'expense', 'system', 'kur_alert'])->default('system');
            $table->decimal('amount', 15, 2)->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('products');
        Schema::dropIfExists('qris_mutations');
        Schema::dropIfExists('daily_cash_ledgers');
        Schema::dropIfExists('magic_links');
        Schema::dropIfExists('users');
    }
};
