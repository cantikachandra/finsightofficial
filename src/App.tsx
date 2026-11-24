/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Camera,
  ShoppingCart,
  BookOpen,
  FileSpreadsheet,
  Package,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Search,
  Download,
  Printer,
  CheckCircle2,
  Trash2,
  PlusCircle,
  FileText,
  Scale,
} from 'lucide-react';
import { buildGeneralLedger } from './utils/generalLedger';

import {
  User,
  Transaction,
  ProductItem,
  NotificationItem,
  HealthMetric,
  CashflowForecast,
  AnalysisPeriod,
} from './types';

import { Navbar } from './components/Navbar';
import { TrafficLightCard } from './components/TrafficLightCard';
import { CashflowPredictionCard } from './components/CashflowPredictionCard';
import { OCRScannerModal } from './components/OCRScannerModal';
import { TransactionModal } from './components/TransactionModal';
import { FundingReadyReportModal } from './components/FundingReadyReportModal';
import { ProductCatalogModal } from './components/ProductCatalogModal';
import { AuthModal } from './components/AuthModal';
import { AuthPage } from './components/AuthPage';
import { CashierPOSView } from './components/CashierPOSView';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { SupportChatbotWidget } from './components/SupportChatbotWidget';
import { downloadCsvReport, formatRupiah } from './utils/exportReport';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('finsight_theme') === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  // Core Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [health, setHealth] = useState<HealthMetric | null>(null);
  const [forecast, setForecast] = useState<CashflowForecast | null>(null);

  // UI States
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'pos' | 'ledger' | 'ocr' | 'reports' | 'products'
  >('dashboard');
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>('1m');
  const [periodLoading, setPeriodLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('finsight_theme', theme);
  }, [theme]);

  // Ledger Filter & Search
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState<string>('all');

  const fetchData = async (userId?: string, periodOverride?: AnalysisPeriod) => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return;
    const targetPeriod = periodOverride || analysisPeriod;

    try {
      setLoading(true);
      const [txRes, prodRes, notifRes, reportRes] = await Promise.all([
        fetch(`/api/transactions?userId=${encodeURIComponent(targetUserId)}`),
        fetch(`/api/products?userId=${encodeURIComponent(targetUserId)}`),
        fetch(`/api/notifications?userId=${encodeURIComponent(targetUserId)}`),
        fetch(
          `/api/reports/summary?userId=${encodeURIComponent(targetUserId)}&period=${encodeURIComponent(targetPeriod)}`
        ),
      ]);

      const [txData, prodData, notifData, reportData] = await Promise.all([
        txRes.json(),
        prodRes.json(),
        notifRes.json(),
        reportRes.json(),
      ]);

      if (txData.transactions) setTransactions(txData.transactions);
      if (prodData.products) setProducts(prodData.products);
      if (notifData.notifications) setNotifications(notifData.notifications);
      if (reportData.health) {
        setHealth(reportData.health);
        setForecast(reportData.health.forecast);
      }
    } catch (err) {
      console.error('Failed to load FinSight data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePeriod = async (nextPeriod: AnalysisPeriod) => {
    setAnalysisPeriod(nextPeriod);
    if (!currentUser?.id) return;
    try {
      setPeriodLoading(true);
      const res = await fetch(
        `/api/reports/summary?userId=${encodeURIComponent(currentUser.id)}&period=${encodeURIComponent(nextPeriod)}`
      );
      const data = await res.json();
      if (data.health) {
        setHealth(data.health);
        setForecast(data.health.forecast);
      }
    } catch (err) {
      console.error('Failed to switch analysis period', err);
    } finally {
      setPeriodLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magicToken = params.get('magic_token');
    const email = params.get('email');

    if (magicToken) {
      fetch('/api/auth/verify-magic-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: magicToken, email }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            handleLoginSuccess(data.user);
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            localStorage.removeItem('finsight_user');
            setCurrentUser(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('finsight_user');
          setCurrentUser(null);
        });
    } else {
      localStorage.removeItem('finsight_user');
      setCurrentUser(null);
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('finsight_user', JSON.stringify(user));
    if (user.themePreference === 'dark' || user.themePreference === 'light') {
      setTheme(user.themePreference);
    }
    setActiveTab('dashboard');
    if (user.role !== 'admin') {
      fetchData(user.id);
    }
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleUserUpdated = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('finsight_user', JSON.stringify(updatedUser));
    if (updatedUser.themePreference === 'dark' || updatedUser.themePreference === 'light') {
      setTheme(updatedUser.themePreference);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('finsight_user');
    setIsProfileModalOpen(false);
    setCurrentUser(null);
  };

  const handleMarkNotificationRead = async (id?: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.id, notifId: id }),
      });
      if (id) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Hapus transaksi ini dari buku kas?')) return;
    try {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      fetchData(currentUser?.id);
    } catch {
      console.error('Gagal menghapus transaksi');
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchSearch =
      t.description.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      (t.referenceNo || '').toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(ledgerSearch.toLowerCase());

    const matchType = ledgerTypeFilter === 'all' || t.type === ledgerTypeFilter;
    const matchCategory =
      ledgerCategoryFilter === 'all' || t.category === ledgerCategoryFilter;

    return matchSearch && matchType && matchCategory;
  });

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const netProfit = totalIncome - totalExpense;
  const currentCashBalance = Math.max(0, netProfit + 3500000);

  const periodIncome = health?.periodIncome ?? totalIncome;
  const periodExpense = health?.periodExpense ?? totalExpense;
  const periodNetProfit = health?.periodNetProfit ?? netProfit;

  if (!currentUser) {
    return (
      <AuthPage
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Dedicated Admin Portal
  if (currentUser.role === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
        <Navbar
          user={currentUser}
          notifications={[]}
          health={null}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenScanModal={() => {}}
          onOpenPosTab={() => {}}
          onOpenTxModal={() => {}}
          onOpenFundingModal={() => {}}
          onOpenAuthModal={() => {}}
          onLogout={handleLogout}
          onRefreshData={() => {}}
          onMarkNotificationRead={() => {}}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AdminDashboard adminUser={currentUser} onLogout={handleLogout} />
        </main>
        <ProfileSettingsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={currentUser}
          theme={theme}
          onChangeTheme={setTheme}
          onUserUpdated={handleUserUpdated}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar
        user={currentUser}
        notifications={notifications}
        health={health}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenScanModal={() => setIsScanModalOpen(true)}
        onOpenPosTab={() => setActiveTab('pos')}
        onOpenTxModal={() => setIsTxModalOpen(true)}
        onOpenFundingModal={() => setIsFundingModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onRefreshData={() => fetchData(currentUser.id)}
        onMarkNotificationRead={handleMarkNotificationRead}
      />

      {/* Main Tab Bar */}
      <div className="no-print bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-16 z-30 shadow-2xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard &amp; Kesehatan
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'pos'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Kasir POS &amp; Pilih Katalog
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Buku Kas &amp; Transaksi ({transactions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ocr')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'ocr'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              Scan Nota (OCR)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Laporan Keuangan &amp; Buku Besar
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800'
              }`}
            >
              <Package className="w-4 h-4" />
              Katalog Produk ({products.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Greeting & Quick Action Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Pemilik Usaha
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex flex-wrap items-center gap-2">
                  <span>{currentUser.fullName}</span>
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    &middot; {currentUser.businessName}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('pos')}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <ShoppingCart className="w-4 h-4 text-blue-300" />
                  <span>Buka Kasir POS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFundingModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/20"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Laporan Keuangan Lengkap</span>
                </button>
              </div>
            </div>

            {/* Glowing Blue Gradient Total Balance Card */}
            <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 p-6 sm:p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden flex flex-col justify-between min-h-[180px]">
              <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-100 uppercase tracking-wider">
                    Total Estimasi Saldo Kas Usaha
                  </div>
                  <div className="text-3xl sm:text-4xl font-black font-mono tabular-nums tracking-tight mt-2 text-white">
                    {loading ? 'Memuat...' : formatRupiah(currentCashBalance)}
                  </div>
                  <div className="text-xs text-blue-100 font-medium mt-2">
                    Rekap otomatis dari Kasir POS, input manual, dan scan struk belanja
                  </div>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>

              <div className="relative z-10 flex flex-wrap items-center gap-2.5 pt-5 border-t border-white/20 mt-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('pos')}
                  className="px-3.5 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                  Mulai Transaksi Kasir POS
                </button>
                <button
                  type="button"
                  onClick={() => setIsFundingModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Laba Rugi, Neraca &amp; Buku Besar
                </button>
                <button
                  type="button"
                  onClick={() => downloadCsvReport(transactions, currentUser, health)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Excel (.XLSX)
                </button>
              </div>
            </div>

            {/* 1. TRAFFIC-LIGHT HEALTH INDICATOR (WITH MULTI-PERIOD SELECTOR) */}
            <TrafficLightCard
              health={health}
              selectedPeriod={analysisPeriod}
              onChangePeriod={handleChangePeriod}
              periodLoading={periodLoading}
              onOpenFundingModal={() => setIsFundingModalOpen(true)}
            />

            {/* 2. FINANCIAL KPI CARDS (BY SELECTED ANALYSIS PERIOD) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                  <span>Pemasukan ({health?.periodLabel || '1 Bulan'})</span>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                  {formatRupiah(periodIncome)}
                </div>
                <div className="text-[11px] text-blue-700 dark:text-blue-400 font-medium mt-2">
                  Kasir &amp; Non-Tunai: {health?.digitalAdoptionRate || 0}%
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                  <span>Pengeluaran ({health?.periodLabel || '1 Bulan'})</span>
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-mono tabular-nums tracking-tight text-rose-600 dark:text-rose-400">
                  {formatRupiah(periodExpense)}
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Termasuk belanja bahan &amp; utilitas
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                  <span>Laba Bersih Periode</span>
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-mono tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400">
                  {periodNetProfit >= 0 ? '+' : ''}
                  {formatRupiah(periodNetProfit)}
                </div>
                <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold mt-2">
                  Margin Laba: {health?.netMargin || 0}%
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                  <span>Produk &amp; Transaksi Periode</span>
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                  {health?.transactionCount ?? transactions.length} Tx
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  {products.length} Katalog &middot; Runway {health?.cashRunwayDays || 30} Hari
                </div>
              </div>
            </div>

            {/* 3. CASH FLOW PREDICTION & RECENT POS / LEDGER TRANSACTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {forecast ? (
                  <CashflowPredictionCard forecast={forecast} />
                ) : (
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    Memuat prediksi arus kas...
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                        Aktivitas Kasir &amp; Kas Terbaru
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('pos')}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                    >
                      + Buka Kasir POS
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {transactions.slice(0, 5).map((tx) => {
                      const isInc = tx.type === 'income';
                      return (
                        <div
                          key={tx.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {tx.description}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {tx.date} {tx.time ? `· ${tx.time}` : ''} &middot; {tx.paymentMethod}
                            </div>
                          </div>
                          <div
                            className={`font-bold font-mono tabular-nums shrink-0 ${
                              isInc ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isInc ? '+' : '-'}
                            {formatRupiah(tx.amount)}
                          </div>
                        </div>
                      );
                    })}
                    {transactions.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Belum ada transaksi tercatat.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ledger')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold cursor-pointer"
                  >
                    Lihat Semua Catatan Buku Kas &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* 3 Pillars Summary */}
            <div className="bg-slate-900 text-white rounded-2xl p-6">
              <div className="text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">
                Sistem Pembukuan Terpadu UMKM
              </div>
              <h3 className="text-lg font-bold">
                Kasir Katalog Produk, Scan Nota OCR, &amp; Laporan SAK EMKM Otomatis
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Setiap transaksi yang dicatat melalui Kasir POS, Input Manual, maupun pemindaian foto struk belanja otomatis tersusun ke Tabel Kas Harian, Laporan Laba Rugi, Neraca Posisi Keuangan, dan Buku Besar.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="font-bold text-blue-300">Kasir POS Katalog Produk</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Pilih produk dari katalog, catat jam transaksi, dan potong stok secara otomatis.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="font-bold text-emerald-300">Scan Nota OCR Teks &amp; Harga</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Ekstrak teks asli struk, rincian barang, dan total harga dari foto nota belanja.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="font-bold text-indigo-300">Laporan Siap Pinjam &amp; Buku Besar</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Unduh Excel (.XLSX) rapi atau cetak PDF untuk pengajuan KUR dan evaluasi usaha.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KASIR POS & KATALOG PRODUK */}
        {activeTab === 'pos' && (
          <CashierPOSView
            userId={currentUser.id}
            products={products}
            transactions={transactions}
            onTransactionSaved={() => fetchData(currentUser.id)}
            onOpenProductModal={() => setIsProductModalOpen(true)}
            onOpenTxModal={() => setIsTxModalOpen(true)}
            onOpenScanModal={() => setIsScanModalOpen(true)}
          />
        )}

        {/* TAB 3: BUKU KAS & TRANSAKSI */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Cari transaksi, nota, referensi, atau kategori..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <select
                  value={ledgerTypeFilter}
                  onChange={(e) => setLedgerTypeFilter(e.target.value as any)}
                  className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-800"
                >
                  <option value="all">Semua Tipe Transaksi</option>
                  <option value="income">Hanya Pemasukan (+)</option>
                  <option value="expense">Hanya Pengeluaran (-)</option>
                </select>

                <select
                  value={ledgerCategoryFilter}
                  onChange={(e) => setLedgerCategoryFilter(e.target.value)}
                  className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-800"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="Penjualan Kasir POS">Penjualan Kasir POS</option>
                  <option value="Penjualan Tunai">Penjualan Tunai</option>
                  <option value="Penjualan Non-Tunai">Penjualan Non-Tunai</option>
                  <option value="Belanja Bahan Baku">Belanja Bahan Baku</option>
                  <option value="Operasional">Operasional</option>
                  <option value="Gaji Karyawan">Gaji Karyawan</option>
                  <option value="Sewa Tempat & Listrik">Sewa Tempat &amp; Listrik</option>
                </select>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => downloadCsvReport(transactions, currentUser, health)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Excel (.XLSX)
                </button>

                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Catat Manual
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Tanggal &amp; Waktu</th>
                      <th className="py-3 px-4">No Referensi</th>
                      <th className="py-3 px-4">Keterangan Transaksi</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Metode Bayar</th>
                      <th className="py-3 px-4">Sumber Input</th>
                      <th className="py-3 px-4 text-right">Debit (Masuk)</th>
                      <th className="py-3 px-4 text-right">Kredit (Keluar)</th>
                      <th className="py-3 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          Tidak ada transaksi yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t) => {
                        const isIncome = t.type === 'income';
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono text-[11px]">
                              {t.date} <span className="text-[10px] text-slate-400">{t.time || ''}</span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {t.referenceNo || '-'}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-100 max-w-xs">
                              {t.description}
                              {t.notes && <div className="text-[10px] text-slate-400 mt-0.5">{t.notes}</div>}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-200">
                                {t.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{t.paymentMethod}</td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                  t.source === 'pos'
                                    ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300'
                                    : t.source === 'ocr_scan'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {t.source === 'pos'
                                  ? 'Kasir POS'
                                  : t.source === 'ocr_scan'
                                  ? 'Scan Nota'
                                  : 'Manual'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                              {isIncome ? `+${formatRupiah(t.amount)}` : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                              {!isIncome ? `-${formatRupiah(t.amount)}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SCAN NOTA & OCR */}
        {activeTab === 'ocr' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Pemindaian Nota Belanja (OCR Teks &amp; Harga Asli)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ambil foto nota atau unggah berkas struk. Sistem membaca teks asli, rincian barang, dan harga untuk dicatat ke Buku Kas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsScanModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Camera className="w-4 h-4" />
                Unggah / Scan Nota Sekarang
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                  Riwayat Pengeluaran Hasil Scan Struk Nota
                </h4>
                <span className="text-xs text-slate-400">
                  {transactions.filter((t) => t.source === 'ocr_scan').length} Nota Tersimpan
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.filter((t) => t.source === 'ocr_scan').length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Belum ada nota yang di-scan. Klik tombol di atas untuk memindai struk belanja Anda.
                  </div>
                ) : (
                  transactions
                    .filter((t) => t.source === 'ocr_scan')
                    .map((t) => (
                      <div key={t.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 flex items-start justify-between gap-3 text-xs">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100">{t.description}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Tanggal: {t.date}</span>
                              <span>&bull;</span>
                              <span className="font-mono text-blue-700 dark:text-blue-400">{t.referenceNo}</span>
                              <span>&bull;</span>
                              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 rounded text-[10px]">{t.category}</span>
                            </div>
                            {t.items && t.items.length > 0 && (
                              <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className="font-semibold text-slate-700 dark:text-slate-200 mb-0.5">Rincian Barang Terdeteksi:</div>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {t.items.map((item, i) => (
                                    <li key={i}>
                                      {item.name} &times; {item.qty} ={' '}
                                      <span className="font-mono font-medium">{formatRupiah(item.total)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 text-sm">
                            -{formatRupiah(t.amount)}
                          </div>
                          <span className="text-[10px] text-slate-400">via {t.paymentMethod}</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LAPORAN KEUANGAN & BUKU BESAR */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Laporan Keuangan Profesional &amp; Kesiapan KUR Perbankan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Laporan Laba Rugi, Neraca Keuangan, Tabel Kas Harian, dan Buku Besar sesuai standar SAK EMKM.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => downloadCsvReport(transactions, currentUser, health)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Excel (.XLSX)
                </button>

                <button
                  type="button"
                  onClick={() => setIsFundingModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Buka Laporan Siap Pinjam (PDF/Cetak)
                </button>
              </div>
            </div>

            {/* P&L Preview Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Laporan Laba Rugi Berjalan (Profit &amp; Loss)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Periode: {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                  Net Margin: {health?.netMargin || 0}%
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Pos Akuntansi</th>
                      <th className="py-2.5 px-4 text-right">Nominal (IDR)</th>
                      <th className="py-2.5 px-4 text-right">% Omzet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr className="bg-slate-50/50 dark:bg-slate-800/40 font-semibold text-slate-800 dark:text-slate-100">
                      <td className="py-2 px-4">TOTAL PENDAPATAN / OMZET</td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums">{formatRupiah(totalIncome)}</td>
                      <td className="py-2 px-4 text-right font-mono">100%</td>
                    </tr>
                    <tr className="text-slate-600 dark:text-slate-300">
                      <td className="py-1.5 px-6">&bull; Penjualan Non-Tunai (Transfer Bank, E-Wallet, Kartu)</td>
                      <td className="py-1.5 px-4 text-right font-mono tabular-nums">
                        {formatRupiah(
                          transactions
                            .filter(
                              (t) =>
                                t.type === 'income' &&
                                (t.paymentMethod === 'Transfer Bank' ||
                                  t.paymentMethod === 'E-Wallet' ||
                                  t.paymentMethod === 'Kartu' ||
                                  t.category === 'Penjualan Non-Tunai')
                            )
                            .reduce((s, t) => s + Number(t.amount || 0), 0)
                        )}
                      </td>
                      <td className="py-1.5 px-4 text-right font-mono">
                        {totalIncome > 0
                          ? (
                              (transactions
                                .filter(
                                  (t) =>
                                    t.type === 'income' &&
                                    (t.paymentMethod === 'Transfer Bank' ||
                                      t.paymentMethod === 'E-Wallet' ||
                                      t.paymentMethod === 'Kartu' ||
                                      t.category === 'Penjualan Non-Tunai')
                                )
                                .reduce((s, t) => s + Number(t.amount || 0), 0) /
                                totalIncome) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </td>
                    </tr>
                    <tr className="text-slate-600 dark:text-slate-300">
                      <td className="py-1.5 px-6">&bull; Penjualan Tunai &amp; Kasir POS</td>
                      <td className="py-1.5 px-4 text-right font-mono tabular-nums">
                        {formatRupiah(
                          transactions
                            .filter((t) => t.type === 'income' && t.paymentMethod === 'Tunai')
                            .reduce((s, t) => s + Number(t.amount || 0), 0)
                        )}
                      </td>
                      <td className="py-1.5 px-4 text-right font-mono">
                        {totalIncome > 0
                          ? (
                              (transactions
                                .filter((t) => t.type === 'income' && t.paymentMethod === 'Tunai')
                                .reduce((s, t) => s + Number(t.amount || 0), 0) /
                                totalIncome) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </td>
                    </tr>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/40 font-semibold text-slate-800 dark:text-slate-100">
                      <td className="py-2 px-4">TOTAL BEBAN &amp; BIAYA</td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                        ({formatRupiah(totalExpense)})
                      </td>
                      <td className="py-2 px-4 text-right font-mono">
                        {totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr className="bg-blue-700 text-white font-extrabold text-sm">
                      <td className="py-3 px-4">LABA BERSIH OPERASIONAL (NET PROFIT)</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">{formatRupiah(netProfit)}</td>
                      <td className="py-3 px-4 text-right font-mono">{health?.netMargin || 0}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Buku Besar & Neraca Saldo Card */}
            {(() => {
              const glData = buildGeneralLedger(transactions);
              const isTrialBalanceBalanced = glData.totalDebit === glData.totalCredit;

              return (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                          Buku Besar &amp; Neraca Saldo (General Ledger - SAK EMKM)
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Rekap akun berpasangan (Double-Entry) otomatis dari Kasir POS &amp; Buku Kas Harian
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase flex items-center gap-1 ${
                          isTrialBalanceBalanced
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {isTrialBalanceBalanced ? 'Neraca Saldo: SEIMBANG' : 'Neraca Saldo: Belum Seimbang'}
                      </span>

                      <button
                        type="button"
                        onClick={() => setIsFundingModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        Buka Rincian Buku Besar &rarr;
                      </button>
                    </div>
                  </div>

                  <div className="border border-indigo-100 dark:border-indigo-900 rounded-xl overflow-hidden">
                    <div className="bg-indigo-900 text-white px-4 py-2 text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-indigo-300" />
                        Ringkasan Neraca Saldo (Trial Balance) SAK EMKM
                      </span>
                      <span className="text-[10px] text-indigo-200 font-mono">
                        Total {glData.accounts.length} Akun Standar
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-700 sticky top-0">
                          <tr>
                            <th className="py-2 px-3 text-left">Kode</th>
                            <th className="py-2 px-4 text-left">Nama Akun SAK EMKM</th>
                            <th className="py-2 px-3 text-center">Klasifikasi</th>
                            <th className="py-2 px-4 text-right">Debit (IDR)</th>
                            <th className="py-2 px-4 text-right">Kredit (IDR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {glData.trialBalance.map((row) => (
                            <tr key={row.code} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30">
                              <td className="py-1.5 px-3 font-mono font-bold text-indigo-950 dark:text-indigo-300">{row.code}</td>
                              <td className="py-1.5 px-4 font-medium text-slate-800 dark:text-slate-100">{row.name}</td>
                              <td className="py-1.5 px-3 text-center text-slate-500 dark:text-slate-400 text-[10px] font-semibold">
                                {row.category}
                              </td>
                              <td className="py-1.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                                {row.debit > 0 ? formatRupiah(row.debit) : '-'}
                              </td>
                              <td className="py-1.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                                {row.credit > 0 ? formatRupiah(row.credit) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-indigo-50 dark:bg-indigo-950/70 font-bold border-t-2 border-indigo-200 dark:border-indigo-800 text-xs">
                          <tr>
                            <td colSpan={3} className="py-2 px-4 text-right uppercase text-indigo-950 dark:text-indigo-200 font-bold">
                              Total Keseimbangan Neraca Saldo:
                            </td>
                            <td className="py-2 px-4 text-right font-mono tabular-nums text-indigo-950 dark:text-indigo-100 font-black">
                              {formatRupiah(glData.totalDebit)}
                            </td>
                            <td className="py-2 px-4 text-right font-mono tabular-nums text-indigo-950 dark:text-indigo-100 font-black">
                              {formatRupiah(glData.totalCredit)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 6: KATALOG PRODUK & INVENTARIS */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Katalog &amp; Inventaris Produk UMKM
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Produk yang ditambahkan di sini otomatis muncul sebagai tombol pilihan di layar Kasir POS.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('pos')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Gunakan di Kasir POS
                </button>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  Kelola &amp; Tambah Produk
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => {
                const marginAmt = p.sellingPrice - p.costPrice;
                const marginPct = p.sellingPrice > 0 ? Math.round((marginAmt / p.sellingPrice) * 100) : 0;
                return (
                  <div key={p.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{p.name}</h4>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                        {p.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                      <div className="bg-slate-50 dark:bg-slate-800/70 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 block">Harga Modal (HPP)</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold tabular-nums">
                          {formatRupiah(p.costPrice)}
                        </span>
                      </div>
                      <div className="bg-blue-50/70 dark:bg-blue-950/50 p-2 rounded-lg">
                        <span className="text-[10px] text-blue-700 dark:text-blue-300 block">Harga Jual Kasir</span>
                        <span className="font-mono text-blue-800 dark:text-blue-200 font-bold tabular-nums">
                          {formatRupiah(p.sellingPrice)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">
                        Stok: <span className="font-bold text-slate-800 dark:text-slate-100">{p.stock} {p.unit}</span>
                      </span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[11px]">
                        Margin +{marginPct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      <OCRScannerModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        userId={currentUser.id}
        onTransactionSaved={() => fetchData(currentUser.id)}
      />

      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        userId={currentUser.id}
        onSaved={() => fetchData(currentUser.id)}
      />

      <FundingReadyReportModal
        isOpen={isFundingModalOpen}
        onClose={() => setIsFundingModalOpen(false)}
        transactions={transactions}
        user={currentUser}
        health={health}
      />

      <ProductCatalogModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        products={products}
        userId={currentUser.id}
        onProductsUpdated={() => fetchData(currentUser.id)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        theme={theme}
        onChangeTheme={setTheme}
        onUserUpdated={handleUserUpdated}
      />

      <SupportChatbotWidget user={currentUser} />
    </div>
  );
}
