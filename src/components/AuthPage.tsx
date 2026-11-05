import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  Store,
  MapPin,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  QrCode,
  TrendingUp,
  Camera,
  RefreshCw,
  Building2,
  Award,
  AlertCircle,
} from 'lucide-react';
import { User } from '../types';

// Import realistic professional photography
import storePhoto from '../assets/images/finsight_store_photo_1793808170535.jpg';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
  onExploreDemo: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, onExploreDemo }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login');
  const [email, setEmail] = useState('anonymous@finsight.id');
  const [password, setPassword] = useState('anonymous123');
  const [fullName, setFullName] = useState('Anonymous');
  const [businessName, setBusinessName] = useState('Usaha Mandiri (Anonymous)');
  const [businessType, setBusinessType] = useState('Kuliner & Usaha Ritel');
  const [phone, setPhone] = useState('081234567890');
  const [city, setCity] = useState('Indonesia');

  // Verification state
  const [otpCode, setOtpCode] = useState('');
  const [autoCodeAvailable, setAutoCodeAvailable] = useState<string | null>(null);
  const [senderNotice, setSenderNotice] = useState<string>('finsight.offc@gmail.com');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Submit Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          businessName,
          businessType,
          phone,
          city,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Pendaftaran gagal');
      }

      setSuccessMsg(`Kode verifikasi resmi dikirimkan dari akun ${data.senderEmail || 'finsight.offc@gmail.com'} ke ${email}.`);
      setSenderNotice(data.senderEmail || 'finsight.offc@gmail.com');

      if (data.autoCode) {
        setAutoCodeAvailable(data.autoCode);
        setOtpCode(data.autoCode);
      }

      setMode('verify');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Verification Code
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const finalCode = codeToVerify || otpCode;
    if (!finalCode) {
      setError('Masukkan kode verifikasi 6-digit.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: finalCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Kode verifikasi salah.');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Resend Code via finsight.offc@gmail.com
  const handleResendCode = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim ulang kode');

      setSuccessMsg(`Kode baru telah dikirim dari ${data.senderEmail || 'finsight.offc@gmail.com'}.`);
      if (data.autoCode) {
        setAutoCodeAvailable(data.autoCode);
        setOtpCode(data.autoCode);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Submit Direct Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Email atau password salah.');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Dynamic Background Glows & Polygons */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header / Branding */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 via-cyan-400 to-indigo-500 flex items-center justify-center text-white font-mono font-black text-xl shadow-lg shadow-blue-500/30">
            FS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-2xl tracking-tight text-white font-mono">
                FinSight
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-400/30 uppercase tracking-widest">
                UMKM Siap Pinjam
              </span>
            </div>
            <p className="text-[11px] text-blue-200/80">
              Riset Bisnis Digital &bull; Cantika Chandra Winata
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onExploreDemo}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-semibold text-blue-100 transition-all cursor-pointer backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Masuk sebagai Anonymous (Tamu)
          </button>
        </div>
      </header>

      {/* Main Hero & Auth Container */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-6 py-4 lg:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center flex-1">
        {/* Left Column: Visual Showcase & Value Proposition */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-xs font-semibold text-cyan-300 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Integrasi QRIS Otomatis &amp; Scan Nota AI Vision
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-white">
            Solusi Keuangan UMKM{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">
              Paling Cepat, Akurat, &amp; Siap Pengajuan KUR
            </span>
          </h1>

          <p className="text-sm sm:text-base text-blue-200/90 max-w-2xl leading-relaxed">
            FinSight memudahkan 96,49% UMKM yang belum memiliki laporan keuangan. Cukup scan nota dengan kamera dan terima transaksi QRIS, sistem otomatis menghitung margin laba, memproyeksikan arus kas, serta mencetak Laporan Siap Pinjam berstandar bank.
          </p>

          {/* Single Rock-Solid Local Photography Showcase (Instantly Loaded, No Cutouts/Transparency) */}
          <div className="relative rounded-3xl overflow-hidden border border-blue-400/30 shadow-2xl shadow-blue-950/80 bg-slate-900/90 backdrop-blur-xl p-3 max-w-xl">
            <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-950">
              <img
                src={storePhoto}
                alt="Dokumentasi FinSight Usaha Mandiri & QRIS"
                loading="eager"
                decoding="sync"
                className="w-full h-full object-cover transition-all duration-500 hover:scale-[1.02]"
              />

              {/* Gradient Vignette Overlay for Crisp Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/20 pointer-events-none" />

              {/* Floating Glass Badges */}
              <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md border border-cyan-500/40 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs text-white shadow-xl">
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span className="font-bold">93.16% Merchant QRIS</span>
              </div>

              <div className="absolute top-3 right-3 bg-blue-600/90 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs text-white font-semibold shadow-xl">
                <Award className="w-3.5 h-3.5 text-yellow-300" />
                <span>Siap KUR Bank</span>
              </div>

              {/* Bottom Caption Inside Photo */}
              <div className="absolute bottom-3 inset-x-3 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 text-left">
                <p className="text-xs font-semibold text-white leading-snug">
                  Dokumentasi FinSight: Pelaku Usaha UMKM dengan Kasir QRIS &amp; Dashboard Finansial Real-Time
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-cyan-300">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Foto Terverifikasi Resmi FinSight UMKM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Pillars */}
          <div className="grid grid-cols-3 gap-3 pt-2 max-w-xl">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Camera className="w-5 h-5 text-cyan-400 mb-1" />
              <div className="font-bold text-xs text-white">Scan Nota 15 Detik</div>
              <p className="text-[10px] text-blue-200/70 mt-0.5">Ekstraksi bon otomatis</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <QrCode className="w-5 h-5 text-blue-400 mb-1" />
              <div className="font-bold text-xs text-white">Mutasi QRIS Live</div>
              <p className="text-[10px] text-blue-200/70 mt-0.5">Otomatis masuk buku kas</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Building2 className="w-5 h-5 text-indigo-400 mb-1" />
              <div className="font-bold text-xs text-white">Laporan Bank KUR</div>
              <p className="text-[10px] text-blue-200/70 mt-0.5">Standar siap pinjam</p>
            </div>
          </div>
        </div>

        {/* Right Column: Stunning Blue Authentication Card */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/80 relative">
            {/* Glow accent */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Card Header & Tab Switcher */}
            {mode !== 'verify' && (
              <div className="space-y-4 mb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    {mode === 'login' ? 'Masuk ke FinSight' : 'Daftar Akun Baru'}
                  </h2>
                  <p className="text-xs text-blue-200/80 mt-1">
                    Kelola keuangan usaha &amp; kesiapan pendanaan bisnis Anda.
                  </p>
                </div>

                <div className="grid grid-cols-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('login');
                    }}
                    className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      mode === 'login'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-blue-200/70 hover:text-white'
                    }`}
                  >
                    Masuk Akun
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('register');
                    }}
                    className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      mode === 'register'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-blue-200/70 hover:text-white'
                    }`}
                  >
                    Daftar Baru
                  </button>
                </div>
              </div>
            )}

            {/* Error & Success Messages */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div>{error}</div>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <div>{successMsg}</div>
              </div>
            )}

            {/* MODE: VERIFIKASI DENGAN KODE OTOMATIS */}
            {mode === 'verify' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500/20 text-cyan-300 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-blue-400/30">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Verifikasi Akun Email</h3>
                  <p className="text-xs text-blue-200/80 mt-1">
                    Kode verifikasi dikirim dari akun{' '}
                    <span className="font-bold text-cyan-300">{senderNotice}</span> ke{' '}
                    <span className="font-semibold text-white">{email}</span>.
                  </p>
                </div>

                {/* Auto-Code Connected Card */}
                {autoCodeAvailable && (
                  <div className="p-4 rounded-2xl bg-blue-500/15 border border-blue-400/30 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-cyan-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        Kode Terhubung Otomatis
                      </span>
                      <span className="font-mono text-lg font-black text-cyan-300 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-cyan-400/40">
                        {autoCodeAvailable}
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-200/80 leading-relaxed">
                      Kode di atas otomatis sinkron dengan akun pengirim <b>{senderNotice}</b>. Klik tombol di bawah untuk verifikasi langsung dalam 1 detik.
                    </p>
                  </div>
                )}

                {/* Input Code */}
                <div>
                  <label className="block text-xs font-semibold text-blue-200 mb-1.5 text-center">
                    6-Digit Kode Konfirmasi
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 px-4 rounded-2xl bg-slate-950/80 border border-blue-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-black text-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={loading || !otpCode}
                  onClick={() => handleVerifyOtp()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-cyan-300" />
                  {loading ? 'Memverifikasi...' : 'Verifikasi Otomatis & Masuk ke Dashboard'}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Kirim Ulang Kode
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('login');
                    }}
                    className="text-blue-200/70 hover:text-white"
                  >
                    Kembali ke Login
                  </button>
                </div>
              </div>
            )}

            {/* MODE: LOGIN */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-blue-200 mb-1">Email Terdaftar</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-blue-300/60 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-blue-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-blue-300/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-200 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-blue-300/60 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-blue-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-blue-300/40"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-[11px] text-blue-200/90 flex items-center justify-between">
                  <span>Pengirim Resmi: <b className="text-white">{senderNotice}</b></span>
                  <span className="text-cyan-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Aman
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? 'Masuk...' : 'Masuk ke FinSight'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="relative my-2 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <span className="relative bg-slate-900 px-3 text-[10px] text-blue-200/60 uppercase tracking-wider font-semibold">
                    Atau Masuk Langsung
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onExploreDemo}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:border-cyan-400/50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Masuk Cepat sebagai Pengguna Anonymous (Tamu)
                </button>

                <div className="pt-2 text-center">
                  <p className="text-xs text-blue-200/70">
                    Belum punya akun usaha?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setFullName('');
                        setBusinessName('');
                        setEmail('');
                        setPassword('');
                        setMode('register');
                      }}
                      className="font-bold text-cyan-400 hover:underline cursor-pointer"
                    >
                      Daftar Baru Sekarang
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* MODE: REGISTER */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-200 mb-1">Nama Lengkap Pemilik</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-blue-300/60 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Contoh: Nama Pemilik Usaha"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/70 border border-blue-500/30 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-blue-300/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-blue-200 mb-1">Nama Usaha / Toko</label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-blue-300/60 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Contoh: Usaha Mandiri"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/70 border border-blue-500/30 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-blue-300/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-blue-200 mb-1">Jenis Usaha</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full py-2 px-2.5 rounded-xl bg-slate-950 border border-blue-500/30 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white"
                    >
                      <option value="Kuliner & Minuman">Kuliner &amp; Minuman</option>
                      <option value="Toko Kelontong & Ritel">Toko Kelontong</option>
                      <option value="Jasa & Servis">Jasa &amp; Servis</option>
                      <option value="Fashion & Konveksi">Fashion &amp; Pakaian</option>
                      <option value="Online Shop">Online Shop</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-blue-200 mb-1">No. WhatsApp / HP</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-blue-300/60 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="081234567890"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/70 border border-blue-500/30 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-blue-300/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-blue-200 mb-1">Kota</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-blue-300/60 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Surabaya"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/70 border border-blue-500/30 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-blue-300/40"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-200 mb-1">Email Anda</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-blue-300/60 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@gmail.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/70 border border-blue-500/30 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-blue-300/40"
                    />
                  </div>
                  <p className="text-[11px] text-cyan-300/80 mt-1">
                    Kode verifikasi akan dikirimkan otomatis via <b>{senderNotice}</b>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-200 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-blue-300/60 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tentukan password Anda"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/70 border border-blue-500/30 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-blue-300/40"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? 'Mengirim Kode...' : 'Daftar & Verifikasi Otomatis'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-1">
                  <p className="text-xs text-blue-200/70">
                    Sudah punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setMode('login');
                      }}
                      className="font-bold text-cyan-400 hover:underline cursor-pointer"
                    >
                      Masuk Disini
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-4 text-center text-xs text-blue-200/60 border-t border-white/5">
        &copy; {new Date().getFullYear()} FinSight &bull; Riset Digital Business Cantika Chandra Winata. Mendukung 30+ Juta UMKM Nasional.
      </footer>
    </div>
  );
};
