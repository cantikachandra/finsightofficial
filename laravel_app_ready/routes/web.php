<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FinancialReportController;
use App\Http\Controllers\QrisMutationController;

/*
|--------------------------------------------------------------------------
| Web Routes FinSight UMKM (MVC Architecture)
|--------------------------------------------------------------------------
*/

// Halaman Pertama Langsung ke Login / Landing Minimalis
Route::get('/', function () {
    return redirect('/login');
});

// Autentikasi Real (Password Buatan Sendiri & Konfirmasi Lupa Password)
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login'])->name('login.post');
Route::post('/register', [AuthController::class, 'register'])->name('register.post');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('password.forgot');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('password.reset');

// Akses Cepat Tamu Demo & Logout
Route::get('/auth/demo', [AuthController::class, 'demoLogin'])->name('auth.demo');
Route::get('/logout', [AuthController::class, 'logout'])->name('logout');

// Dashboard & Laporan Keuangan
Route::get('/dashboard', function () {
    return view('dashboard');
})->name('dashboard');

// 3 Laporan Finansial: Laba Rugi, Neraca SAK EMKM, dan Buku Kas Harian
Route::get('/reports', [FinancialReportController::class, 'index'])->name('reports.index');
Route::get('/reports/export-excel', [FinancialReportController::class, 'downloadExcel'])->name('reports.excel');

// QRIS Realtime Endpoints
Route::get('/api/qris/mutations', [QrisMutationController::class, 'getMutations']);
Route::post('/api/qris/simulate', [QrisMutationController::class, 'simulateIncoming']);
