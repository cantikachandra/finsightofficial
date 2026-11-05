import React, { useState } from 'react';
import {
  Bell,
  Camera,
  QrCode,
  PlusCircle,
  FileText,
  User as UserIcon,
  LogOut,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { User, NotificationItem, HealthMetric } from '../types';
import { requestNotificationPermission, playAlertSound } from '../utils/notification';

interface NavbarProps {
  user: User | null;
  notifications: NotificationItem[];
  health: HealthMetric | null;
  onOpenScanModal: () => void;
  onOpenQrisModal: () => void;
  onOpenTxModal: () => void;
  onOpenFundingModal: () => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onRefreshData: () => void;
  onMarkNotificationRead: (id?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  notifications,
  health,
  onOpenScanModal,
  onOpenQrisModal,
  onOpenTxModal,
  onOpenFundingModal,
  onOpenAuthModal,
  onLogout,
  onRefreshData,
  onMarkNotificationRead,
}) => {
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifGranted, setNotifGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleEnablePush = async () => {
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    if (granted) {
      playAlertSound();
      alert('Notifikasi Web & Handphone FinSight Berhasil Diaktifkan! Setiap ada mutasi QRIS masuk atau pengeluaran, Anda akan menerima peringatan langsung.');
    }
  };

  const handleSendDailySummary = async () => {
    try {
      const res = await fetch('/api/notifications/daily-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (res.ok) {
        playAlertSound();
        onRefreshData();
        setNotifDropdownOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetData = async () => {
    if (confirm('Reset seluruh data simulasi ke setelan awal default?')) {
      await fetch('/api/reset-demo', { method: 'POST' });
      onRefreshData();
      alert('Data simulasi telah direset!');
    }
  };

  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 font-mono font-black text-lg">
                FS
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight text-slate-900 font-mono">
                    FinSight
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                    SME
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 hidden sm:block leading-none">
                  QRIS &amp; Funding-Ready Platform
                </p>
              </div>
            </div>

            {/* Business Badge */}
            {user && (
              <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200 text-xs">
                <span className="text-slate-400">Usaha:</span>
                <span className="font-bold text-slate-800 bg-blue-50/70 border border-blue-100 px-2 py-1 rounded-lg">
                  {user.businessName}
                </span>
                {health && (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      health.status === 'hijau'
                        ? 'bg-emerald-100 text-emerald-800'
                        : health.status === 'kuning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    Skor {health.score} ({health.status.toUpperCase()})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Scan Receipt Camera Button */}
            <button
              onClick={onOpenScanModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Pindai foto struk nota belanja otomatis dengan AI OCR"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Scan Nota (OCR)</span>
            </button>

            {/* QRIS Simulate Button */}
            <button
              onClick={onOpenQrisModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Simulasikan mutasi QRIS masuk secara otomatis"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Mutasi QRIS</span>
            </button>

            {/* Add Manual Tx */}
            <button
              onClick={onOpenTxModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
              title="Catat transaksi manual"
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span className="hidden md:inline">Catat Manual</span>
            </button>

            {/* Push Notification Toggle for Web & Mobile */}
            <button
              onClick={handleEnablePush}
              className={`p-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer relative ${
                notifGranted
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title={notifGranted ? 'Notifikasi Web/HP Aktif' : 'Aktifkan Notifikasi Web & HP'}
            >
              <Smartphone className="w-4 h-4" />
              {notifGranted && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 relative transition-colors cursor-pointer"
                title="Pusat Notifikasi"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-emerald-600" />
                      Pusat Notifikasi FinSight
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSendDailySummary}
                        className="text-[10px] text-blue-600 hover:underline font-semibold"
                        title="Simulasi Ringkasan Malam Hari"
                      >
                        Picu Ringkasan Harian
                      </button>
                      <button
                        onClick={() => {
                          onMarkNotificationRead();
                          setNotifDropdownOpen(false);
                        }}
                        className="text-[10px] text-slate-400 hover:text-slate-700"
                      >
                        Tandai Dibaca
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Belum ada notifikasi baru.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => onMarkNotificationRead(n.id)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                            !n.isRead
                              ? 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50'
                              : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-800 truncate">{n.title}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(n.createdAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Auth Button */}
            <div className="relative">
              {user ? (
                <div>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                      {user.fullName.charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-700 hidden sm:inline max-w-[120px] truncate">
                      {user.fullName.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs">
                      <div className="p-2 border-b border-slate-100">
                        <p className="font-bold text-slate-800">{user.fullName}</p>
                        <p className="text-slate-400 text-[11px] truncate">{user.email}</p>
                        <p className="text-emerald-700 font-semibold text-[11px] mt-1">
                          {user.businessName} ({user.city})
                        </p>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onOpenFundingModal();
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          Laporan Siap Pinjam KUR
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            handleResetData();
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          Reset Data Contoh
                        </button>
                      </div>

                      <div className="pt-1 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onLogout();
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-2"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Keluar Akun
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenAuthModal}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Masuk / Daftar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
