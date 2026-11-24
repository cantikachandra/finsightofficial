<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Tampilkan halaman login / register minimalis
     */
    public function showLogin()
    {
        return view('auth.login');
    }

    /**
     * 1. LOGIN: Menggunakan Email / No HP dan Password Buatan Sendiri (Bukan Simulasi)
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required',
            'password' => 'required',
        ]);

        $identifier = strtolower(trim($request->email));
        $cleanPhone = preg_replace('/[^0-9]/', '', $identifier);

        // Cari berdasarkan Email atau Nomor HP
        $user = DB::table('users')
            ->where(function ($query) use ($identifier, $cleanPhone) {
                $query->where('email', $identifier);
                if (strlen($cleanPhone) >= 8) {
                    $query->orWhere('phone', $cleanPhone);
                }
            })
            ->first();

        if (!$user) {
            return back()->withInput()->with('error', 'Akun belum terdaftar. Silakan daftar akun baru.');
        }

        // Verifikasi kata sandi asli
        if (!Hash::check($request->password, $user->password) && $user->password !== $request->password) {
            return back()->withInput()->with('error', 'Kata sandi salah. Silakan periksa kembali atau klik Lupa Password.');
        }

        session(['user_id' => $user->id, 'user' => $user]);
        return redirect('/dashboard')->with('success', "Selamat datang kembali, {$user->full_name}!");
    }

    /**
     * 2. SIGN UP: Password dibuat sendiri, konfirmasi harus sama & No HP tidak boleh dobel
     */
    public function register(Request $request)
    {
        $request->validate([
            'full_name' => 'required|string|max:191',
            'phone' => 'required|string|min:8|max:20',
            'email' => 'required|email|max:191',
            'password' => 'required|min:6|confirmed', // 'confirmed' memvalidasi password_confirmation sama persis
        ], [
            'password.confirmed' => 'Konfirmasi kata sandi tidak cocok. Kata sandi harus sama persis!',
            'password.min' => 'Kata sandi minimal 6 karakter.',
            'phone.required' => 'Nomor HP wajib diisi.',
        ]);

        $email = strtolower(trim($request->email));
        $cleanPhone = preg_replace('/[^0-9]/', '', $request->phone);

        // Validasi: Nomor HP jangan sampai double!
        $phoneExists = DB::table('users')->where('phone', $cleanPhone)->exists();
        if ($phoneExists) {
            return back()->withInput()->with('error', "Nomor HP {$request->phone} sudah terdaftar. Jangan gunakan nomor HP yang sama!");
        }

        // Validasi: Email jangan double!
        $emailExists = DB::table('users')->where('email', $email)->exists();
        if ($emailExists) {
            return back()->withInput()->with('error', 'Alamat email sudah terdaftar. Silakan masuk dengan kata sandi Anda.');
        }

        $userId = 'usr_' . time();
        DB::table('users')->insert([
            'id' => $userId,
            'email' => $email,
            'password' => Hash::make($request->password), // Password asli buatan user dienkripsi aman
            'full_name' => trim($request->full_name),
            'business_name' => $request->business_name ? trim($request->business_name) : 'Usaha Mandiri',
            'business_type' => 'Kuliner & Usaha Ritel',
            'phone' => $cleanPhone,
            'city' => 'Indonesia',
            'qris_merchant_id' => 'NMID-ID' . mt_rand(100000000000, 999999999999),
            'is_verified' => 1,
            'role' => 'owner',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $user = DB::table('users')->where('id', $userId)->first();
        session(['user_id' => $user->id, 'user' => $user]);

        return redirect('/dashboard')->with('success', 'Pendaftaran akun berhasil! Selamat datang di FinSight.');
    }

    /**
     * 3. LUPA PASSWORD: Kirim Link Konfirmasi Beneran via finsight.offc@gmail.com
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $email = strtolower(trim($request->email));
        $user = DB::table('users')->where('email', $email)->first();

        if (!$user) {
            return back()->withInput()->with('error', 'Alamat email tidak ditemukan di sistem FinSight.');
        }

        // Generate token konfirmasi reset
        $token = 'rst_' . Str::random(32);
        DB::table('magic_links')->insert([
            'id' => 'pr_' . time(),
            'email' => $email,
            'token' => $token,
            'is_used' => 0,
            'sent_at' => now(),
            'expires_at' => now()->addMinutes(30),
            'created_at' => now(),
        ]);

        $resetUrl = url('/reset-password?token=' . $token . '&email=' . urlencode($email));

        // Kirim email konfirmasi via finsight.offc@gmail.com (password: sourcandy14)
        try {
            Mail::raw(
                "Halo {$user->full_name},\n\n" .
                "Kami menerima permintaan untuk mengatur ulang kata sandi akun FinSight Anda ({$email}).\n\n" .
                "Klik tautan resmi di bawah ini untuk mengonfirmasi dan membuat kata sandi baru:\n" .
                "{$resetUrl}\n\n" .
                "Tautan ini berlaku selama 30 menit. Jika Anda tidak meminta pengaturan ulang ini, abaikan pesan ini.\n\n" .
                "Salam,\nTim Resmi FinSight Indonesia (finsight.offc@gmail.com)",
                function ($message) use ($email, $user) {
                    $message->to($email, $user->full_name)
                            ->from('finsight.offc@gmail.com', 'FinSight Official')
                            ->subject('Konfirmasi Reset Kata Sandi FinSight UMKM');
                }
            );
        } catch (\Exception $e) {
            \Log::warning("Gagal kirim SMTP reset password: " . $e->getMessage());
        }

        return back()->with('success', "Link konfirmasi perubahan kata sandi telah dikirimkan ke {$email} dari finsight.offc@gmail.com.");
    }

    /**
     * 4. RESET PASSWORD: Buat Kata Sandi Baru dengan Konfirmasi
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:6|confirmed',
        ], [
            'password.confirmed' => 'Konfirmasi kata sandi tidak cocok. Kata sandi baru harus sama persis!',
        ]);

        $token = $request->token;
        $email = strtolower(trim($request->email));

        $record = DB::table('magic_links')
            ->where('token', $token)
            ->where('is_used', 0)
            ->first();

        if (!$record || now()->gt($record->expires_at)) {
            return redirect('/login')->with('error', 'Link konfirmasi reset tidak valid atau telah kedaluwarsa.');
        }

        DB::table('users')->where('email', $email)->update([
            'password' => Hash::make($request->password),
            'updated_at' => now(),
        ]);

        DB::table('magic_links')->where('id', $record->id)->update(['is_used' => 1]);

        return redirect('/login')->with('success', 'Kata sandi berhasil diperbarui! Silakan masuk menggunakan kata sandi baru Anda.');
    }

    /**
     * Akses Cepat Tamu (Demo)
     */
    public function demoLogin()
    {
        $user = DB::table('users')->where('email', 'anonymous@finsight.id')->first();
        if (!$user) {
            $userId = 'user_anonymous';
            DB::table('users')->insert([
                'id' => $userId,
                'email' => 'anonymous@finsight.id',
                'password' => Hash::make('anonymous123'),
                'full_name' => 'Anonymous',
                'business_name' => 'Usaha Mandiri (Anonymous)',
                'business_type' => 'Kuliner & Usaha Ritel',
                'phone' => '081234567890',
                'city' => 'Indonesia',
                'qris_merchant_id' => 'NMID-ID102008492019',
                'is_verified' => 1,
                'role' => 'owner',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $user = DB::table('users')->where('id', $userId)->first();
        }

        session(['user_id' => $user->id, 'user' => $user]);
        return redirect('/dashboard');
    }

    /**
     * Logout
     */
    public function logout()
    {
        session()->flush();
        return redirect('/login');
    }
}
