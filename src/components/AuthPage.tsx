import React, { useState, useEffect } from 'react';
import {
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  User as UserIcon,
  Store,
  Phone,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  KeyRound,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
import { User } from '../types';
import { SupportChatbotWidget } from './SupportChatbotWidget';
import { checkPasswordStrength } from '../utils/password';

// Official FinSight Logo & Real Authentic Financial Photography
import finSightLogo from '/assets/aistudio/Logo_FinSight_Biru_Mengilap_c4e93b1f.png';
import realFinancePhoto from '../assets/images/real_financial_charts.jpg';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLoginSuccess,
  theme = 'light',
  onToggleTheme,
}) => {
  // Mode: 'login' | 'register' | 'forgot' | 'reset'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');

  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form States
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot / Reset Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Feedback States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check URL parameters for direct reset link: ?reset_token=...&email=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    const emailParam = params.get('email');

    if (token) {
      setResetToken(token);
      if (emailParam) setForgotEmail(emailParam);
      setMode('reset');
    }
  }, []);

  // 1. Handle Login (Email / Phone + Password)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!loginIdentifier.trim() || !loginPassword) {
      setError('Email/No. HP dan kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginIdentifier.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Sign Up (Unique Phone + Matching Password)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validation 1: Required fields
    if (!fullName.trim() || !phone.trim() || !registerEmail.trim() || !registerPassword) {
      setError('Semua kolom bertanda bintang wajib diisi.');
      return;
    }

    // Validation 2: Passwords MUST match & satisfy strong password policy
    if (registerPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok. Kata sandi harus sama persis!');
      return;
    }

    const regPwCheck = checkPasswordStrength(registerPassword);
    if (!regPwCheck.isValid) {
      setError(regPwCheck.firstError || 'Kata sandi harus minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan simbol.');
      return;
    }

    // Validation 3: Clean phone check
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) {
      setError('Nomor HP tidak valid. Masukkan minimal 8 digit angka.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          businessName: businessName.trim() || 'Usaha Mandiri',
          phone: phone.trim(),
          email: registerEmail.trim(),
          password: registerPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Pendaftaran gagal.');
      }

      // Successful registration: langsung login dengan user yang baru dibuat!
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Forgot Password (Send Real Confirmation Link via finsight.offc@gmail.com)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!forgotEmail.trim()) {
      setError('Masukkan alamat email terdaftar Anda.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim link konfirmasi reset kata sandi.');
      }

      setResetSent(true);
      setResetToken(data.resetToken);
      setSuccessMsg(`Link konfirmasi reset kata sandi resmi telah dikirim ke ${forgotEmail} dari finsight.offc@gmail.com.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Reset Password Confirmation
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!newPassword || !confirmNewPassword) {
      setError('Kata sandi baru dan konfirmasi kata sandi wajib diisi.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Konfirmasi kata sandi tidak cocok. Kata sandi baru harus sama persis!');
      return;
    }

    const resetPwCheck = checkPasswordStrength(newPassword);
    if (!resetPwCheck.isValid) {
      setError(resetPwCheck.firstError || 'Kata sandi baru minimal 8 karakter dan wajib mengandung simbol khusus.');
      return;
    }

    if (!resetToken) {
      setError('Token konfirmasi reset tidak valid atau tidak ditemukan.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          email: forgotEmail.trim(),
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui kata sandi.');
      }

      setResetSuccess(true);
      setSuccessMsg('Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.');
      setTimeout(() => {
        setMode('login');
        setLoginIdentifier(forgotEmail);
        setLoginPassword(newPassword);
        setResetSent(false);
        setResetSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = registerPassword && confirmPassword && registerPassword === confirmPassword;
  const resetPasswordsMatch = newPassword && confirmNewPassword && newPassword === confirmNewPassword;
  const regStrength = checkPasswordStrength(registerPassword);
  const resetStrength = checkPasswordStrength(newPassword);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white transition-colors">
      {/* Top Header Minimalis */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={finSightLogo}
            alt="FinSight Logo"
            className="h-9 sm:h-10 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-2.5">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-amber-300 transition-all shadow-xs cursor-pointer"
              title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
        </div>
      </header>

      {/* Main Container Clean Putih-Biru */}
      <main className="max-w-6xl w-full mx-auto px-6 py-6 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center flex-1">
        {/* Left Column: Value Proposition & Clean Photography without overlay badge */}
        <div className="lg:col-span-6 space-y-6">
          <div className="text-xs font-bold text-blue-700 dark:text-blue-400 tracking-wide">
            Kasir POS Katalog Produk &middot; Laporan Laba Rugi &middot; Neraca &amp; Buku Besar
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.2]">
            Manajemen Keuangan{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 dark:from-blue-400 dark:via-indigo-400 dark:to-sky-400">
              Cerdas &amp; Siap Pinjaman KUR
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
            FinSight memudahkan transaksi kasir dari katalog produk, pemindaian nota belanja otomatis (OCR), pencatatan kas harian, hingga pembentukan Laporan Laba Rugi, Neraca, dan Buku Besar berstandar perbankan.
          </p>

          {/* Real Photography Card (Pristine, clean without any badge text) */}
          <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-blue-500/5 bg-white dark:bg-slate-900 p-2.5 max-w-xl group">
            <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-100 dark:bg-slate-800">
              <img
                src={realFinancePhoto}
                alt="FinSight Dashboard Keuangan"
                loading="eager"
                decoding="sync"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Soft subtle overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent pointer-events-none" />

              {/* Bottom Caption */}
              <div className="absolute bottom-3 inset-x-3 bg-slate-900/85 backdrop-blur-md rounded-xl p-3 text-white">
                <p className="text-xs font-semibold leading-snug">
                  Dashboard Analisis Keuangan: Grafik Pertumbuhan Omzet, Buku Kas Harian, &amp; Laporan SAK EMKM
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Standar Resmi SIDT &amp; Bank Indonesia untuk Pengajuan KUR</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive White-Blue Form Card (Login / Sign Up / Forgot Password) */}
        <div className="lg:col-span-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-blue-600/5 p-6 sm:p-8 space-y-6">
            {/* Tab Switcher: Masuk vs Daftar */}
            {(mode === 'login' || mode === 'register') && (
              <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Masuk Akun
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Daftar Akun Baru
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="font-medium leading-snug">{error}</div>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div className="font-medium leading-snug">{successMsg}</div>
              </div>
            )}

            {/* 1. FORM LOGIN: EMAIL/PHONE & REAL PASSWORD */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    Masuk ke FinSight
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Gunakan email atau nomor HP dan kata sandi akun Anda.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Alamat Email atau Nomor HP
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="contoh@gmail.com atau 081234567890"
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Kata Sandi (Password)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                    >
                      Lupa Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan kata sandi Anda"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi Kata Sandi...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Belum punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                    >
                      Daftar Akun Baru
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* 2. FORM REGISTER: PASSWORD SENDIRI, KONFIRMASI SAMA & NO HP UNIK */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    Daftar Akun FinSight
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Buat kata sandi sendiri dan pastikan nomor HP belum terdaftar sebelumnya.
                  </p>
                </div>

                {/* Nama Lengkap & Nama Usaha */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Lengkap *
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nama Pemilik"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Usaha UMKM
                    </label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Contoh: Kopi Mandiri"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Nomor HP & Email (Keduanya harus unik, jangan dobel) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Nomor HP (WhatsApp) *</span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Wajib Unik</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="081234567890"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Alamat Email *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="contoh@gmail.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Password & Confirm Password (Wajib Sama Persis & Pakai Simbol) */}
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Kata Sandi Baru (Min. 8 Karakter + Simbol) *
                      </label>
                      {registerPassword && (
                        <span
                          className={`text-[10px] font-bold ${
                            regStrength.isValid
                              ? 'text-emerald-600'
                              : regStrength.score >= 3
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {regStrength.label}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="Contoh: TokoMaju#2026!"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-1.5 text-[10px]">
                      {[
                        { ok: regStrength.minLength, text: 'Min. 8 karakter' },
                        { ok: regStrength.hasUpper, text: 'Huruf besar (A-Z)' },
                        { ok: regStrength.hasLower, text: 'Huruf kecil (a-z)' },
                        { ok: regStrength.hasNumber, text: 'Angka (0-9)' },
                        { ok: regStrength.hasSymbol, text: 'Simbol (!@#$%)' },
                      ].map((r) => (
                        <span
                          key={r.text}
                          className={`inline-flex items-center gap-1 ${
                            r.ok ? 'text-emerald-600 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          <Check className="w-2.5 h-2.5" />
                          {r.text}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Konfirmasi Kata Sandi (Harus Sama) *
                      </label>
                      {confirmPassword && (
                        <span
                          className={`text-[10px] font-bold flex items-center gap-1 ${
                            passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {passwordsMatch ? (
                            <>
                              <Check className="w-3 h-3" /> Cocok
                            </>
                          ) : (
                            'Belum Cocok'
                          )}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ketik ulang kata sandi yang sama persis"
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs focus:outline-none focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all ${
                          confirmPassword
                            ? passwordsMatch
                              ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                              : 'border-rose-400 focus:ring-2 focus:ring-rose-400'
                            : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mendaftarkan Akun...</span>
                    </>
                  ) : (
                    <>
                      <span>Daftar Akun FinSight</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-1 text-center">
                  <p className="text-xs text-slate-500">
                    Sudah memiliki akun?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      Masuk di Sini
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* 3. FORM LUPA KATA SANDI: KIRIM LINK KONFIRMASI BENERAN VIA GMAIL */}
            {mode === 'forgot' && (
              <div className="space-y-4">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold mb-2 inline-flex items-center gap-1 cursor-pointer"
                  >
                    &larr; Kembali ke Halaman Masuk
                  </button>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Lupa Kata Sandi
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Masukkan email Anda. Kami akan mengirimkan <b>link konfirmasi resmi</b> dari akun <b>finsight.offc@gmail.com</b> untuk mengatur ulang kata sandi Anda.
                  </p>
                </div>

                {!resetSent ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Alamat Email Terdaftar
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="contoh@gmail.com"
                          className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <span className="text-[11px]">
                        Pengirim Resmi: <b className="text-blue-900 dark:text-blue-300 font-semibold">finsight.offc@gmail.com</b>
                      </span>
                      <span className="text-blue-700 dark:text-blue-400 font-bold text-[11px] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Aman
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Mengirim Link Konfirmasi...</span>
                        </>
                      ) : (
                        <>
                          <span>Kirim Link Konfirmasi ke Email</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Form Input Kata Sandi Baru dengan Token yang sudah terkirim */
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-xs text-slate-700 dark:text-slate-200 space-y-1.5">
                      <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Link Konfirmasi Telah Dikirim!
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        Email konfirmasi telah dikirim dari <b>finsight.offc@gmail.com</b> ke <b>{forgotEmail}</b>. Anda dapat langsung memasukkan kata sandi baru Anda di formulir ini:
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Kata Sandi Baru (Min. 8 Karakter + Simbol) *
                        </label>
                        {newPassword && (
                          <span className={`text-[10px] font-bold ${resetStrength.isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {resetStrength.label}
                          </span>
                        )}
                      </div>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Contoh: SandiBaru#2026!"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Konfirmasi Kata Sandi Baru (Harus Sama) *
                        </label>
                        {confirmNewPassword && (
                          <span
                            className={`text-[10px] font-bold ${
                              resetPasswordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {resetPasswordsMatch ? '✓ Cocok' : 'Belum Cocok'}
                          </span>
                        )}
                      </div>
                      <input
                        type="password"
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Ketik ulang kata sandi baru"
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs focus:outline-none text-slate-900 dark:text-slate-100 ${
                          confirmNewPassword
                            ? resetPasswordsMatch
                              ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                              : 'border-rose-400 focus:ring-2 focus:ring-rose-400'
                            : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-600'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || resetSuccess}
                      className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Menyimpan Kata Sandi Baru...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Simpan Kata Sandi Baru &amp; Masuk</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* 4. FORM RESET DARI LINK URL (?reset_token=...) */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Buat Kata Sandi Baru
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tautan konfirmasi email Anda terverifikasi. Silakan masukkan kata sandi baru untuk akun {forgotEmail || 'Anda'}.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kata Sandi Baru (Min. 8 Karakter + Huruf Besar, Angka &amp; Simbol) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Contoh: SandiBaru#2026!"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Konfirmasi Kata Sandi Baru *
                    </label>
                    {confirmNewPassword && (
                      <span
                        className={`text-[10px] font-bold ${
                          resetPasswordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {resetPasswordsMatch ? '✓ Cocok' : 'Belum Cocok'}
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi baru"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs focus:outline-none text-slate-900 dark:text-slate-100 ${
                      confirmNewPassword
                        ? resetPasswordsMatch
                          ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                          : 'border-rose-400 focus:ring-2 focus:ring-rose-400'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-600'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Kata Sandi...</span>
                    </>
                  ) : (
                    <span>Konfirmasi &amp; Masuk ke FinSight</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer Minimalis */}
      <footer className="max-w-7xl w-full mx-auto px-6 py-5 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800">
        &copy; {new Date().getFullYear()} FinSight UMKM &bull; Kasir POS &amp; Pembukuan SAK EMKM &bull; Pengiriman Resmi via finsight.offc@gmail.com
      </footer>

      <SupportChatbotWidget />
    </div>
  );
};
