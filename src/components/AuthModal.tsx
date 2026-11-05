import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, Store, MapPin, Phone, ArrowRight, ShieldCheck, AlertCircle, X, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>(initialMode);
  const [email, setEmail] = useState('anonymous@finsight.id');
  const [password, setPassword] = useState('anonymous123');
  const [fullName, setFullName] = useState('Anonymous');
  const [businessName, setBusinessName] = useState('Usaha Mandiri (Anonymous)');
  const [businessType, setBusinessType] = useState('Kuliner & Minuman');
  const [phone, setPhone] = useState('081234567890');
  const [city, setCity] = useState('Indonesia');

  // Verification state
  const [otpCode, setOtpCode] = useState('');
  const [autoCodeAvailable, setAutoCodeAvailable] = useState<string | null>(null);
  const [senderNotice, setSenderNotice] = useState<string>('finsight.offc@gmail.com');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Submit Registration & Request Code from finsight.offc@gmail.com
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

      setSuccessMsg(`Kode verifikasi dikirim dari akun ${data.senderEmail || 'finsight.offc@gmail.com'} ke ${email}.`);
      setSenderNotice(data.senderEmail || 'finsight.offc@gmail.com');

      if (data.autoCode) {
        setAutoCodeAvailable(data.autoCode);
        setOtpCode(data.autoCode); // Otomatis terisi agar user tidak repot!
      }

      setMode('verify');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Verification Code (Bisa Otomatis atau Manual)
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
        throw new Error(data.error || 'Kode verifikasi tidak cocok.');
      }

      onLoginSuccess(data.user);
      onClose();
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
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-indigo-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">FinSight UMKM</h2>
              <p className="text-xs text-emerald-100">
                {mode === 'verify'
                  ? 'Verifikasi Akun Email'
                  : mode === 'login'
                  ? 'Masuk ke Pembukuan Usaha'
                  : 'Pendaftaran Akun Pemilik Usaha'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Masuk vs Daftar (Hanya tampil jika bukan mode verify) */}
        {mode !== 'verify' && (
          <div className="grid grid-cols-2 p-2 bg-slate-100/80 border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode('login');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Akun Baru
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* MODE: VERIFIKASI DENGAN KODE OTOMATIS */}
          {mode === 'verify' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Verifikasi Akun Email</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kode verifikasi resmi dikirimkan dari akun{' '}
                  <span className="font-bold text-emerald-700">{senderNotice}</span> ke{' '}
                  <span className="font-semibold text-slate-800">{email}</span>.
                </p>
              </div>

              {/* Automatic Code Sync Card */}
              {autoCodeAvailable && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Kode Terhubung Otomatis
                    </span>
                    <span className="font-mono text-base font-black text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      {autoCodeAvailable}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    Kode di atas langsung sinkron dengan akun pengirim <b>{senderNotice}</b>. Klik tombol di bawah untuk verifikasi otomatis dalam 1 detik.
                  </p>
                </div>
              )}

              {/* Code Input Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                  6-Digit Kode Konfirmasi
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 px-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-black text-slate-900"
                />
              </div>

              {/* Action: Automatic Verification Button */}
              <button
                type="button"
                disabled={loading || !otpCode}
                onClick={() => handleVerifyOtp()}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {loading ? 'Memverifikasi...' : 'Verifikasi Otomatis & Masuk ke Dashboard'}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
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
                  className="text-slate-500 hover:text-slate-800"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Anda</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                <span>Pengirim Resmi: <b className="text-slate-800">{senderNotice}</b></span>
                <span className="text-emerald-700 font-bold">Terverifikasi</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? 'Masuk...' : 'Masuk ke FinSight'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  Belum punya akun UMKM?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('register');
                    }}
                    className="font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Daftar Akun Baru
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* MODE: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Pemilik</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Cantika Chandra Winata"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Usaha / Toko</label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Contoh: Cantika Kitchen"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Usaha</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 bg-white"
                  >
                    <option value="Kuliner & Minuman">Kuliner &amp; Minuman (F&amp;B)</option>
                    <option value="Toko Kelontong & Ritel">Toko Kelontong &amp; Ritel</option>
                    <option value="Jasa & Servis">Jasa &amp; Servis</option>
                    <option value="Fashion & Konveksi">Fashion &amp; Konveksi</option>
                    <option value="Online Shop">Online Shop</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No. WhatsApp / HP</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kota</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Surabaya"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Anda</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Kode verifikasi akan dikirimkan otomatis via <b>{senderNotice}</b>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tentukan password Anda"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? 'Mengirim Kode...' : 'Daftar & Verifikasi Otomatis'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-1">
                <p className="text-xs text-slate-500">
                  Sudah punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('login');
                    }}
                    className="font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Masuk Sekarang
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
