import React, { useEffect, useState } from 'react';
import {
  X,
  User as UserIcon,
  Lock,
  Sun,
  Moon,
  Store,
  Phone,
  MapPin,
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  KeyRound,
  Save,
} from 'lucide-react';
import { User } from '../types';
import { checkPasswordStrength } from '../utils/password';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  theme: 'light' | 'dark';
  onChangeTheme: (nextTheme: 'light' | 'dark') => void;
  onUserUpdated: (updatedUser: User) => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  theme,
  onChangeTheme,
  onUserUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'biodata' | 'password' | 'appearance'>('biodata');

  // Biodata form states
  const [fullName, setFullName] = useState(user.fullName || '');
  const [businessName, setBusinessName] = useState(user.businessName || '');
  const [businessType, setBusinessType] = useState(user.businessType || 'Kuliner & Usaha Ritel');
  const [phone, setPhone] = useState(user.phone || '');
  const [city, setCity] = useState(user.city || '');

  // Change Password form states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Feedback states
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(user.fullName || '');
      setBusinessName(user.businessName || '');
      setBusinessType(user.businessType || 'Kuliner & Usaha Ritel');
      setPhone(user.phone || '');
      setCity(user.city || '');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const strength = checkPasswordStrength(newPassword);
  const passwordsMatch = Boolean(newPassword && confirmNewPassword && newPassword === confirmNewPassword);

  const handleSaveBiodata = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim() || !phone.trim()) {
      setErrorMsg('Nama lengkap dan nomor HP wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.id)}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          businessName: businessName.trim() || 'Usaha Mandiri',
          businessType,
          phone: phone.trim(),
          city: city.trim() || 'Indonesia',
          themePreference: theme,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan perubahan biodata.');
      }

      if (data.user) {
        onUserUpdated(data.user);
      }
      setSuccessMsg('Biodata akun berhasil diperbarui.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!oldPassword) {
      setErrorMsg('Masukkan kata sandi lama Anda terlebih dahulu untuk verifikasi.');
      return;
    }
    if (!strength.isValid) {
      setErrorMsg(strength.firstError || 'Kata sandi baru belum memenuhi syarat keamanan.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    if (newPassword === oldPassword) {
      setErrorMsg('Kata sandi baru harus berbeda dari kata sandi lama Anda.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.id)}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengubah kata sandi.');
      }

      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccessMsg(data.message || 'Kata sandi berhasil diperbarui!');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleThemeSelect = async (nextTheme: 'light' | 'dark') => {
    onChangeTheme(nextTheme);
    setErrorMsg(null);
    setSuccessMsg(
      nextTheme === 'dark'
        ? 'Mode Gelap aktif dan disimpan ke preferensi profil Anda.'
        : 'Mode Terang aktif dan disimpan ke preferensi profil Anda.'
    );
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.id)}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themePreference: nextTheme }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onUserUpdated(data.user);
      }
    } catch {
      // Local theme state & localStorage remain persisted even on transient network error
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 my-6">
        {/* Header */}
        <div className="bg-blue-700 dark:bg-blue-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center font-extrabold text-sm">
              {user.role === 'admin' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                user.fullName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Profil &amp; Pengaturan Akun</h3>
              <p className="text-xs text-blue-100">
                {user.fullName} &middot; {user.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('biodata');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'biodata'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Biodata Akun</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'password'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Ubah Kata Sandi</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('appearance');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span>Mode Terang / Gelap</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: BIODATA */}
          {activeTab === 'biodata' && (
            <form onSubmit={handleSaveBiodata} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Terdaftar (Tidak dapat diubah)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      readOnly
                      value={user.email}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Peran &amp; Status Akun
                  </label>
                  <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-between">
                    <span>
                      {user.role === 'admin' ? 'Administrator Pusat' : 'Pemilik Usaha UMKM'}
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                      Terverifikasi
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor HP / WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Usaha / Unit
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kota / Domisili
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {user.role !== 'admin' && (
                <div className="text-xs">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bidang Usaha
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Kuliner & Usaha Ritel">Kuliner &amp; Usaha Ritel</option>
                    <option value="Kuliner & Minuman">Kuliner &amp; Minuman (F&amp;B)</option>
                    <option value="Toko Kelontong & Ritel">Toko Kelontong &amp; Ritel</option>
                    <option value="Jasa & Servis">Jasa &amp; Servis</option>
                    <option value="Fashion & Konveksi">Fashion &amp; Konveksi</option>
                    <option value="Online Shop">Online Shop</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Terdaftar sejak{' '}
                  {new Date(user.createdAt || Date.now()).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Biodata'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: UBAH KATA SANDI (INPUT SANDI LAMA -> SANDI BARU) */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-slate-700 dark:text-slate-300">
                Untuk mengganti kata sandi secara mandiri, masukkan <b>kata sandi lama</b> Anda untuk verifikasi terlebih dahulu, lalu tentukan <b>kata sandi baru</b> yang mengandung huruf besar, huruf kecil, angka, dan simbol khusus.
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Kata Sandi Lama Saat Ini *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showOldPw ? 'text' : 'password'}
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan kata sandi lama Anda"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPw(!showOldPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    2. Kata Sandi Baru *
                  </label>
                  {newPassword && (
                    <span
                      className={`font-bold text-[11px] ${
                        strength.isValid
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : strength.score >= 3
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      Kekuatan: {strength.label}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter dengan huruf, angka & simbol (!@#)"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Live Password Requirements */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2.5 text-[11px]">
                  {[
                    { ok: strength.minLength, text: 'Min. 8 karakter' },
                    { ok: strength.hasUpper, text: 'Huruf besar (A-Z)' },
                    { ok: strength.hasLower, text: 'Huruf kecil (a-z)' },
                    { ok: strength.hasNumber, text: 'Angka (0-9)' },
                    { ok: strength.hasSymbol, text: 'Simbol (!@#$%)' },
                  ].map((rule) => (
                    <div
                      key={rule.text}
                      className={`flex items-center gap-1 font-medium ${
                        rule.ok
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <Check className="w-3 h-3 shrink-0" />
                      <span>{rule.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    3. Konfirmasi Kata Sandi Baru *
                  </label>
                  {confirmNewPassword && (
                    <span
                      className={`text-[11px] font-bold ${
                        passwordsMatch
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {passwordsMatch ? 'Cocok' : 'Belum Cocok'}
                    </span>
                  )}
                </div>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru yang sama"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{saving ? 'Memverifikasi & Menyimpan...' : 'Verifikasi Sandi Lama & Simpan Sandi Baru'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: TAMPILAN (MODE TERANG & GELAP) */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Pilih tema tampilan antarmuka FinSight sesuai kenyamanan mata Anda. Perubahan langsung diterapkan ke seluruh halaman dan disimpan ke akun Anda.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleThemeSelect('light')}
                  className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 ${
                    theme === 'light'
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Sun className="w-5 h-5" />
                    </div>
                    {theme === 'light' && (
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
                        Aktif
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Mode Terang (Light Mode)
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Latar putih bersih dan aksen biru cerah untuk pencahayaan ruangan terang.
                    </p>
                  </div>
                  <div className="h-10 rounded-xl bg-white border border-slate-200 p-2 flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-blue-600" />
                    <span className="h-2.5 flex-1 rounded bg-slate-200" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleThemeSelect('dark')}
                  className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 ${
                    theme === 'dark'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 text-blue-400 flex items-center justify-center">
                      <Moon className="w-5 h-5" />
                    </div>
                    {theme === 'dark' && (
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
                        Aktif
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Mode Gelap (Dark Mode)
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Latar gelap bernuansa biru malam agar nyaman dipakai pada malam hari.
                    </p>
                  </div>
                  <div className="h-10 rounded-xl bg-slate-950 border border-slate-800 p-2 flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-blue-500" />
                    <span className="h-2.5 flex-1 rounded bg-slate-700" />
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
