import React, { useState } from 'react';
import {
  Bell,
  Camera,
  ShoppingCart,
  PlusCircle,
  FileText,
  LogOut,
  Smartphone,
  RotateCcw,
  ChevronDown,
  ShieldCheck,
  UserCog,
  Sun,
  Moon,
} from 'lucide-react';
import { User, NotificationItem, HealthMetric } from '../types';
import { requestNotificationPermission, playAlertSound } from '../utils/notification';

interface NavbarProps {
  user: User | null;
  notifications: NotificationItem[];
  health: HealthMetric | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenProfileModal: () => void;
  onOpenScanModal: () => void;
  onOpenPosTab: () => void;
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
  theme,
  onToggleTheme,
  onOpenProfileModal,
  onOpenScanModal,
  onOpenPosTab,
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

  const isAdmin = user?.role === 'admin';
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleEnablePush = async () => {
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    if (granted) {
      playAlertSound();
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
    if (confirm('Reset seluruh data transaksi ke setelan awal default?')) {
      await fetch('/api/reset-demo', { method: 'POST' });
      onRefreshData();
    }
  };

  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0">
              <img
                src="/assets/aistudio/Logo_FinSight_Biru_Mengilap_c4e93b1f.png"
                alt="FinSight"
                className="h-9 w-auto object-contain"
              />
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white font-mono whitespace-nowrap">
                FinSight
              </span>
            </div>

            {user && (
              <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-700 text-xs min-w-0">
                <span className="text-slate-400 dark:text-slate-400 shrink-0">
                  {isAdmin ? 'Mode:' : 'Usaha:'}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-100 bg-blue-50/70 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 px-2.5 py-1 rounded-lg truncate max-w-[210px]">
                  {isAdmin ? 'Administrator FinSight' : user.businessName}
                </span>
                {!isAdmin && health && (
                  <span
                    className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                      health.status === 'hijau'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : health.status === 'kuning'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    Skor {health.score} ({health.status.toUpperCase()})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {!isAdmin && (
              <>
                <button
                  type="button"
                  onClick={onOpenPosTab}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                  title="Buka Kasir POS Pilih Katalog Produk"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Kasir POS</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenScanModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                  title="Pindai foto struk nota belanja"
                >
                  <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="hidden sm:inline">Scan Nota</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenTxModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                  title="Catat transaksi manual"
                >
                  <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="hidden md:inline">Catat Manual</span>
                </button>

                <button
                  type="button"
                  onClick={handleEnablePush}
                  className={`p-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer relative ${
                    notifGranted
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={notifGranted ? 'Notifikasi Browser Aktif' : 'Aktifkan Notifikasi Browser'}
                >
                  <Smartphone className="w-4 h-4" />
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 relative transition-colors cursor-pointer"
                    title="Pusat Notifikasi"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 px-1.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-xs">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          Pusat Notifikasi FinSight
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSendDailySummary}
                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            Ringkasan Harian
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onMarkNotificationRead();
                              setNotifDropdownOpen(false);
                            }}
                            className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
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
                                  ? 'bg-blue-50/50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/60'
                                  : 'bg-slate-50/50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {n.title}
                                </span>
                                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                  {new Date(n.createdAt).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                                {n.message}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Quick Light / Dark Mode Switch */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-300 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              {user ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-200 font-bold flex items-center justify-center text-xs">
                      {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : user.fullName.charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline max-w-[120px] truncate">
                      {user.fullName.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 text-xs">
                      <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{user.fullName}</p>
                        <p className="text-slate-400 text-[11px] truncate">{user.email}</p>
                        <p className="text-blue-700 dark:text-blue-400 font-semibold text-[11px] mt-1">
                          {isAdmin ? 'Admin Pusat FinSight' : `${user.businessName} (${user.city})`}
                        </p>
                      </div>

                      <div className="py-1 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onOpenProfileModal();
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 cursor-pointer"
                        >
                          <UserCog className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          Profil, Sandi &amp; Pengaturan
                        </button>

                        {!isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setUserDropdownOpen(false);
                                onOpenFundingModal();
                              }}
                              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              Laporan Siap Pinjam KUR
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setUserDropdownOpen(false);
                                handleResetData();
                              }}
                              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              Reset Data Contoh
                            </button>
                          </>
                        )}
                      </div>

                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onLogout();
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2 cursor-pointer"
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
                  type="button"
                  onClick={onOpenAuthModal}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
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

