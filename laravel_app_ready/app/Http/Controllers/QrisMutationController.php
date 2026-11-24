<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class QrisMutationController extends Controller
{
    /**
     * Ambil Riwayat Mutasi QRIS
     */
    public function getMutations(Request $request)
    {
        $userId = session('user_id', 'user_anonymous');
        $mutations = DB::table('qris_mutations')
            ->where('user_id', $userId)
            ->orderBy('timestamp', 'desc')
            ->get();

        return response()->json(['mutations' => $mutations]);
    }

    /**
     * Hubungkan Akun QRIS Merchant (BCA, Mandiri Livin, BRImo, GoBiz, ShopeePay, DANA)
     */
    public function connectMerchantAccount(Request $request)
    {
        $userId = session('user_id', 'user_anonymous');
        $provider = $request->input('provider', 'bca_merchant');
        $providerName = $request->input('providerName', 'BCA Merchant QRIS');
        $merchantId = $request->input('merchantId');
        $nmid = $request->input('nmid', 'NMID-ID102008492019');

        DB::table('users')->where('id', $userId)->update([
            'qris_merchant_id' => $nmid,
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Akun QRIS {$providerName} berhasil dihubungkan!",
            'integration' => [
                'provider' => $provider,
                'providerName' => $providerName,
                'merchantId' => $merchantId,
                'nmid' => $nmid,
                'status' => 'connected',
                'connectedAt' => now()->toIso8601String(),
            ]
        ]);
    }

    /**
     * Putuskan Koneksi Akun QRIS
     */
    public function disconnectMerchantAccount(Request $request)
    {
        $userId = session('user_id', 'user_anonymous');
        return response()->json([
            'success' => true,
            'message' => 'Koneksi akun QRIS telah dinonaktifkan.'
        ]);
    }

    /**
     * Penerimaan Pembayaran QRIS Baru Masuk & Otomatis Masuk Buku Kas + Buku Besar + Notifikasi
     */
    public function simulateIncoming(Request $request)
    {
        $userId = session('user_id', 'user_anonymous');
        $issuers = ['GoPay', 'OVO', 'ShopeePay', 'Dana', 'BCA QRIS', 'Mandiri Livin', 'BRImo'];
        $customerList = ['Dewi Sartika', 'Rahmat Hidayat', 'Ahmad Fauzi', 'Nadia Paramitha', 'Bayu Wijaya'];

        $amount = (float)($request->amount ?: [28000, 45000, 68000, 85000, 110000][array_rand([28000, 45000, 68000, 85000, 110000])]);
        $issuer = $request->issuer ?: $issuers[array_rand($issuers)];
        $customer = $request->customer_name ?: $customerList[array_rand($customerList)];
        $rrn = '00' . mt_rand(1000000000, 9999999999);

        // 1. Simpan Mutasi QRIS
        $mutationId = 'qmut_' . time();
        DB::table('qris_mutations')->insert([
            'id' => $mutationId,
            'user_id' => $userId,
            'timestamp' => now(),
            'amount' => $amount,
            'customer_name' => $customer,
            'issuer' => $issuer,
            'rrn' => $rrn,
            'status' => 'settled',
            'synced_to_ledger' => 1,
            'created_at' => now(),
        ]);

        // 2. Otomatis Catat ke Buku Kas Harian
        $txId = 'tx_qris_' . time();
        DB::table('daily_cash_ledgers')->insert([
            'id' => $txId,
            'user_id' => $userId,
            'trans_date' => now()->toDateString(),
            'trans_time' => now()->toTimeString(),
            'reference_no' => 'QRIS-' . date('Ymd') . '-' . substr($rrn, -4),
            'description' => "Penjualan QRIS Otomatis ({$customer} via {$issuer})",
            'category' => 'Penjualan QRIS',
            'payment_method' => 'QRIS',
            'type' => 'income',
            'amount' => $amount,
            'running_balance' => 0, // di-recalculate pada query
            'source' => 'qris',
            'notes' => "RRN: {$rrn}",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 3. Notifikasi Web
        DB::table('notifications')->insert([
            'id' => 'notif_' . time(),
            'user_id' => $userId,
            'title' => 'Pemasukan QRIS Masuk! 💰',
            'message' => "Uang masuk Rp " . number_format($amount, 0, ',', '.') . " dari {$customer} ({$issuer}) langsung tercatat ke buku kas.",
            'type' => 'income',
            'amount' => $amount,
            'is_read' => 0,
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Mutasi QRIS berhasil disimulasikan dan disinkronkan ke buku kas.',
            'amount' => $amount,
            'customer' => $customer,
            'issuer' => $issuer,
            'rrn' => $rrn,
        ]);
    }
}
