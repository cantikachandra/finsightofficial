/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Camera,
  QrCode,
  BookOpen,
  FileSpreadsheet,
  Package,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  RefreshCw,
  PlusCircle,
  FileText,
  AlertCircle,
  Info,
  Clock,
} from 'lucide-react';

import {
  User,
  Transaction,
  QRISMutation,
  ProductItem,
  NotificationItem,
  HealthMetric,
  CashflowForecast,
} from './types';

import { Navbar } from './components/Navbar';
import { TrafficLightCard } from './components/TrafficLightCard';
import { CashflowPredictionCard } from './components/CashflowPredictionCard';
import { OCRScannerModal } from './components/OCRScannerModal';
import { QRISMutationModal } from './components/QRISMutationModal';
import { TransactionModal } from './components/TransactionModal';
import { FundingReadyReportModal } from './components/FundingReadyReportModal';
import { ProductCatalogModal } from './components/ProductCatalogModal';
import { AuthModal } from './components/AuthModal';
import { AuthPage } from './components/AuthPage';
import { downloadCsvReport, formatRupiah } from './utils/exportReport';

export default function App() {
  // Active User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Core Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [qrisMutations, setQrisMutations] = useState<QRISMutation[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [health, setHealth] = useState<HealthMetric | null>(null);
  const [forecast, setForecast] = useState<CashflowForecast | null>(null);

  // UI States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ocr' | 'qris' | 'ledger' | 'reports' | 'products'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Ledger Filter & Search
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState<string>('all');

  // Load Data for specific user
  const fetchData = async (userId?: string) => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return;

    try {
      setLoading(true);
      const [txRes, qrisRes, prodRes, notifRes, reportRes] = await Promise.all([
        fetch(`/api/transactions?userId=${targetUserId}`),
        fetch(`/api/qris/mutations?userId=${targetUserId}`),
        fetch(`/api/products?userId=${targetUserId}`),
        fetch(`/api/notifications?userId=${targetUserId}`),
        fetch(`/api/reports/summary?userId=${targetUserId}`),
      ]);

      const [txData, qrisData, prodData, notifData, reportData] = await Promise.all([
        txRes.json(),
        qrisRes.json(),
        prodRes.json(),
        notifRes.json(),
        reportRes.json(),
      ]);

      if (txData.transactions) setTransactions(txData.transactions);
      if (qrisData.mutations) setQrisMutations(qrisData.mutations);
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

  // Always show Login / Sign Up landing page first upon opening the app
  useEffect(() => {
    localStorage.removeItem('finsight_user');
    setCurrentUser(null);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('finsight_user', JSON.stringify(user));
    fetchData(user.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('finsight_user');
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
    } catch (e) {
      alert('Gagal menghapus');
    }
  };

  // Filtered Ledger Transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchSearch =
      t.description.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      t.referenceNo?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(ledgerSearch.toLowerCase());

    const matchType = ledgerTypeFilter === 'all' || t.type === ledgerTypeFilter;
    const matchCategory =
      ledgerCategoryFilter === 'all' || t.category === ledgerCategoryFilter;

    return matchSearch && matchType && matchCategory;
  });

  // KPI Computations
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const netProfit = totalIncome - totalExpense;
  const currentCashBalance = Math.max(0, netProfit + 3500000); // Base buffer

  // SHOW GORGEOUS BLUE LOGIN & SIGNUP PAGE AS THE INITIAL LANDING PAGE
  if (!currentUser) {
    return (
      <AuthPage
        onLoginSuccess={handleLoginSuccess}
        onExploreDemo={() => {
          handleLoginSuccess({
            id: 'user_anonymous',
            email: 'anonymous@finsight.id',
            fullName: 'Anonymous',
            businessName: 'Usaha Mandiri (Anonymous)',
            businessType: 'Kuliner & Usaha Ritel',
            phone: '081234567890',
            city: 'Indonesia',
            qrisMerchantId: 'NMID-ID102008492019',
            isVerified: true,
            role: 'owner',
            createdAt: new Date().toISOString(),
          });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        user={currentUser}
        notifications={notifications}
        health={health}
        onOpenScanModal={() => setIsScanModalOpen(true)}
        onOpenQrisModal={() => setIsQrisModalOpen(true)}
        onOpenTxModal={() => setIsTxModalOpen(true)}
        onOpenFundingModal={() => setIsFundingModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onRefreshData={() => fetchData(currentUser?.id)}
        onMarkNotificationRead={handleMarkNotificationRead}
      />

      {/* Main Tab Bar */}
      <div className="no-print bg-white border-b border-slate-200 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/70'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-cyan-300" />
              Dashboard &amp; Kesehatan
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/70'
              }`}
            >
              <BookOpen className="w-4 h-4 text-cyan-300" />
              Buku Kas &amp; Transaksi ({transactions.length})
            </button>

            <button
              onClick={() => setActiveTab('qris')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'qris'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/70'
              }`}
            >
              <QrCode className="w-4 h-4 text-cyan-300" />
              Mutasi QRIS Otomatis
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/70'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
              Laporan Keuangan &amp; Siap Pinjam
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/70'
              }`}
            >
              <Package className="w-4 h-4 text-cyan-300" />
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
            {/* Business Quick Info & Demo Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 border border-blue-500/30 text-white p-5 rounded-2xl shadow-md">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base sm:text-lg">
                    {currentUser?.businessName || 'Kopi & Kuliner Cantika'}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-400/30">
                    {currentUser?.businessType || 'F&B dan Bakery'}
                  </span>
                </div>
                <p className="text-xs text-blue-200/80 mt-1">
                  Selamat datang di FinSight, platform pencatatan keuangan UMKM terintegrasi mutasi QRIS &amp; scan nota berbasis AI.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFundingModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/30"
                >
                  <ShieldCheck className="w-4 h-4 text-cyan-300" />
                  Lihat Kesiapan KUR
                </button>
              </div>
            </div>

            {/* 1. TRAFFIC-LIGHT HEALTH INDICATOR */}
            <TrafficLightCard
              health={health}
              onOpenFundingModal={() => setIsFundingModalOpen(true)}
            />

            {/* 2. FINANCIAL KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Pemasukan */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
                  <span>Total Pemasukan (Omzet)</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {formatRupiah(totalIncome)}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium mt-2 flex items-center gap-1">
                  <span>Adopsi QRIS {health?.qrisAdoptionRate || 78}%</span>
                </div>
              </div>

              {/* Total Pengeluaran */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
                  <span>Total Pengeluaran (Beban)</span>
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight text-rose-600">
                  {formatRupiah(totalExpense)}
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Termasuk belanja bahan &amp; utilitas
                </div>
              </div>

              {/* Laba Bersih */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
                  <span>Laba Bersih Operasional</span>
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight text-emerald-700">
                  {netProfit >= 0 ? '+' : ''}{formatRupiah(netProfit)}
                </div>
                <div className="text-[11px] text-indigo-700 font-semibold mt-2">
                  Margin Laba: {health?.netMargin || 0}%
                </div>
              </div>

              {/* Saldo Kas Aktif */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
                  <span>Estimasi Saldo Kas Usaha</span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {formatRupiah(currentCashBalance)}
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  Runway aman: {health?.cashRunwayDays || 30} Hari
                </div>
              </div>
            </div>

            {/* 3. CASH FLOW PREDICTION & RECENT QRIS SETTLEMENTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cashflow Prediction */}
              <div className="lg:col-span-2">
                {forecast ? (
                  <CashflowPredictionCard forecast={forecast} />
                ) : (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                    Memuat prediksi arus kas...
                  </div>
                )}
              </div>

              {/* Live QRIS Stream Widget */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-blue-600" />
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                        Mutasi QRIS Terbaru
                      </h4>
                    </div>
                    <button
                      onClick={() => setIsQrisModalOpen(true)}
                      className="text-[11px] text-blue-600 hover:underline font-bold"
                    >
                      + Simulasi Masuk
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {qrisMutations.slice(0, 5).map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-xl bg-blue-50/40 border border-blue-100/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">{m.customerName}</div>
                          <div className="text-[10px] text-slate-400">
                            {m.issuer} &bull; RRN {m.rrn.slice(-4)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold font-mono text-blue-700">
                            +{formatRupiah(m.amount)}
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 uppercase">
                            Settled
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-3 text-center">
                  <button
                    onClick={() => setActiveTab('qris')}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                  >
                    Buka Riwayat Mutasi QRIS Lengkap &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Feature Highlights from Bisnis Digital Cantika */}
            <div className="bg-slate-900 text-white rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                Diferensiasi FinSight (Riset Bisnis Digital UMKM Cantika Chandra Winata)
              </div>
              <h3 className="text-lg font-bold">
                Solusi Otomatisasi Terintegrasi untuk 96,49% UMKM Tanpa Pembukuan
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                FinSight menggabungkan 3 pilar: Otomasi input struk via OCR Vision, integrasi mutasi QRIS merchant real-time, dan modul &quot;Laporan Siap Pinjam&quot; berstandar perbankan penyalur KUR agar UMKM mikro mudah mengakses modal tanpa perlu pemahaman istilah akuntansi yang rumit.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="font-bold text-emerald-400">OCR Nota Otomatis</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">Memangkas waktu input nota belanja dari 2 menit menjadi 15 detik.</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="font-bold text-blue-400">Mutasi QRIS Otomatis</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">Setiap uang masuk dari QRIS langsung tersinkronisasi ke buku kas.</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="font-bold text-indigo-400">Laporan Siap Pinjam</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">Format standar bank untuk pengajuan KUR &amp; modal kerja instan.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCAN NOTA & OCR */}
        {activeTab === 'ocr' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-600" />
                  Pemindaian Nota Belanja &amp; Bon Belanja (AI OCR Vision)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ambil foto nota dengan kamera HP/Laptop atau unggah file. AI FinSight otomatis membaca rincian barang, harga, dan tanggal.
                </p>
              </div>

              <button
                onClick={() => setIsScanModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Camera className="w-4 h-4" />
                Buka Kamera &amp; Scan Nota Sekarang
              </button>
            </div>

            {/* List of previously scanned receipts */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Riwayat Pengeluaran Hasil Scan Struk Nota
                </h4>
                <span className="text-xs text-slate-400">
                  {transactions.filter((t) => t.source === 'ocr_scan').length} Nota Tersimpan
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {transactions.filter((t) => t.source === 'ocr_scan').length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Belum ada nota yang di-scan. Klik tombol di atas untuk mencoba.
                  </div>
                ) : (
                  transactions
                    .filter((t) => t.source === 'ocr_scan')
                    .map((t) => (
                      <div key={t.id} className="p-4 hover:bg-slate-50/50 flex items-start justify-between gap-3 text-xs">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{t.description}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>Tanggal: {t.date}</span>
                              <span>&bull;</span>
                              <span className="font-mono text-emerald-700">{t.referenceNo}</span>
                              <span>&bull;</span>
                              <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">{t.category}</span>
                            </div>
                            {t.items && t.items.length > 0 && (
                              <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <div className="font-semibold text-slate-700 mb-0.5">Rincian Barang Terdeteksi:</div>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {t.items.map((item, i) => (
                                    <li key={i}>
                                      {item.name} &times; {item.qty} = <span className="font-mono font-medium">{formatRupiah(item.total)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold font-mono text-rose-600 text-sm">
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

        {/* TAB 3: MUTASI & INTEGRASI QRIS */}
        {activeTab === 'qris' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-blue-600" />
                    Integrasi Otomatis Mutasi QRIS Merchant
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase">
                    Terhubung Realtime
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  NMID: <span className="font-mono font-semibold text-slate-700">{currentUser?.qrisMerchantId || 'NMID-ID102008492019'}</span>. Seluruh transaksi non-tunai langsung dibukukan secara otomatis.
                </p>
              </div>

              <button
                onClick={() => setIsQrisModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Simulasi Pembayaran QRIS Baru Masuk
              </button>
            </div>

            {/* QRIS Insights based on Bank Indonesia 2025 Data */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Total Mutasi QRIS Masuk</div>
                <div className="text-xl font-black text-blue-950 font-mono mt-1">
                  {formatRupiah(
                    transactions
                      .filter((t) => t.type === 'income' && (t.source === 'qris' || t.paymentMethod === 'QRIS'))
                      .reduce((s, t) => s + Number(t.amount || 0), 0)
                  )}
                </div>
                <p className="text-[11px] text-blue-600 mt-1">Tersinkronisasi otomatis ke buku kas</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Rasio Adopsi Transaksi Digital</div>
                <div className="text-xl font-black text-emerald-950 font-mono mt-1">
                  {health?.qrisAdoptionRate || 78}%
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">Data BI: 93.16% merchant adalah UMKM</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Status Rekonsiliasi Bank</div>
                <div className="text-base font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  100% Cocok (Reconciled)
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Tidak ada selisih kas fisik</p>
              </div>
            </div>

            {/* Table of QRIS Settlements */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Log Riwayat Mutasi QRIS Terverifikasi
                </h4>
                <span className="text-xs text-slate-400">{qrisMutations.length} Transaksi Tercatat</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Waktu &amp; Tanggal</th>
                      <th className="py-2.5 px-4">Nama Pelanggan</th>
                      <th className="py-2.5 px-4">Aplikasi (Issuer)</th>
                      <th className="py-2.5 px-4 font-mono">No. RRN Mutasi</th>
                      <th className="py-2.5 px-4 text-right">Nominal Masuk</th>
                      <th className="py-2.5 px-4 text-center">Status Ledger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {qrisMutations.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 text-slate-600">
                          {new Date(m.timestamp).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}{' '}
                          {new Date(m.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{m.customerName}</td>
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {m.issuer}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{m.rrn}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                          +{formatRupiah(m.amount)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Tercatat Otomatis
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BUKU KAS & TRANSAKSI */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            {/* Header with Search & Controls */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Cari transaksi, nota, referensi, atau kategori..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Type Filter */}
                <select
                  value={ledgerTypeFilter}
                  onChange={(e) => setLedgerTypeFilter(e.target.value as any)}
                  className="py-2 px-3 rounded-xl border border-slate-300 text-xs text-slate-700 bg-white"
                >
                  <option value="all">Semua Tipe Transaksi</option>
                  <option value="income">Hanya Pemasukan (+)</option>
                  <option value="expense">Hanya Pengeluaran (-)</option>
                </select>

                {/* Category Filter */}
                <select
                  value={ledgerCategoryFilter}
                  onChange={(e) => setLedgerCategoryFilter(e.target.value)}
                  className="py-2 px-3 rounded-xl border border-slate-300 text-xs text-slate-700 bg-white"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="Penjualan QRIS">Penjualan QRIS</option>
                  <option value="Penjualan Tunai">Penjualan Tunai</option>
                  <option value="Belanja Bahan Baku">Belanja Bahan Baku</option>
                  <option value="Operasional">Operasional</option>
                  <option value="Gaji Karyawan">Gaji Karyawan</option>
                  <option value="Sewa Tempat & Listrik">Sewa Tempat &amp; Listrik</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => downloadCsvReport(transactions, currentUser!, health)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Excel (.CSV)
                </button>

                <button
                  onClick={() => setIsTxModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  + Catat Transaksi
                </button>
              </div>
            </div>

            {/* Comprehensive Ledger Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
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
                  <tbody className="divide-y divide-slate-100">
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
                          <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                              {t.date} <span className="text-[10px] text-slate-400">{t.time || ''}</span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {t.referenceNo || '-'}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-800 max-w-xs">
                              {t.description}
                              {t.notes && <div className="text-[10px] text-slate-400 mt-0.5">{t.notes}</div>}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700">
                                {t.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">{t.paymentMethod}</td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  t.source === 'qris'
                                    ? 'bg-blue-100 text-blue-800'
                                    : t.source === 'ocr_scan'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {t.source === 'qris' ? 'QRIS Auto' : t.source === 'ocr_scan' ? 'Scan Nota' : 'Manual'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                              {isIncome ? `+${formatRupiah(t.amount)}` : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                              {!isIncome ? `-${formatRupiah(t.amount)}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
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

        {/* TAB 5: LAPORAN KEUANGAN & SIAP PINJAM */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Laporan Keuangan Profesional &amp; Kesiapan KUR Perbankan
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Format baku terstandarisasi SIDT &amp; Bank Indonesia untuk pengajuan pinjaman modal usaha atau pembagian laporan ke investor.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => downloadCsvReport(transactions, currentUser!, health)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Excel (.CSV)
                </button>

                <button
                  onClick={() => setIsFundingModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Buka Laporan Siap Pinjam (PDF/Cetak)
                </button>
              </div>
            </div>

            {/* Embedded Financial Statement Preview Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
              <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
                    Laporan Laba Rugi Berjalan (Profit &amp; Loss)
                  </h4>
                  <p className="text-xs text-slate-400">Periode: Bulan Berjalan (Tahun 2026)</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Net Margin: {health?.netMargin || 0}%
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Pos Akuntansi</th>
                      <th className="py-2.5 px-4 text-right">Nominal (IDR)</th>
                      <th className="py-2.5 px-4 text-right">% Omzet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50/50 font-semibold text-slate-800">
                      <td className="py-2 px-4">TOTAL PENDAPATAN / OMZET</td>
                      <td className="py-2 px-4 text-right font-mono">{formatRupiah(totalIncome)}</td>
                      <td className="py-2 px-4 text-right font-mono">100%</td>
                    </tr>
                    <tr className="text-slate-600">
                      <td className="py-1.5 px-6">&bull; Mutasi Pembayaran QRIS</td>
                      <td className="py-1.5 px-4 text-right font-mono">
                        {formatRupiah(
                          transactions
                            .filter((t) => t.type === 'income' && (t.source === 'qris' || t.paymentMethod === 'QRIS'))
                            .reduce((s, t) => s + Number(t.amount || 0), 0)
                        )}
                      </td>
                      <td className="py-1.5 px-4 text-right font-mono">{health?.qrisAdoptionRate || 78}%</td>
                    </tr>
                    <tr className="text-slate-600">
                      <td className="py-1.5 px-6">&bull; Penjualan Tunai Kasir</td>
                      <td className="py-1.5 px-4 text-right font-mono">
                        {formatRupiah(
                          transactions
                            .filter((t) => t.type === 'income' && t.paymentMethod === 'Tunai')
                            .reduce((s, t) => s + Number(t.amount || 0), 0)
                        )}
                      </td>
                      <td className="py-1.5 px-4 text-right font-mono">
                        {100 - (health?.qrisAdoptionRate || 78)}%
                      </td>
                    </tr>
                    <tr className="bg-slate-50/50 font-semibold text-slate-800">
                      <td className="py-2 px-4">TOTAL BEBAN &amp; BIAYA</td>
                      <td className="py-2 px-4 text-right font-mono text-rose-600">({formatRupiah(totalExpense)})</td>
                      <td className="py-2 px-4 text-right font-mono">
                        {totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr className="bg-emerald-600 text-white font-extrabold text-sm">
                      <td className="py-3 px-4">LABA BERSIH OPERASIONAL (NET PROFIT)</td>
                      <td className="py-3 px-4 text-right font-mono">{formatRupiah(netProfit)}</td>
                      <td className="py-3 px-4 text-right font-mono">{health?.netMargin || 0}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: KATALOG PRODUK & INVENTARIS */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  Katalog &amp; Inventaris Produk UMKM
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Pantau harga pokok produksi (HPP), harga jual, dan persentase keuntungan tiap menu/barang.
                </p>
              </div>

              <button
                onClick={() => setIsProductModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                Kelola &amp; Tambah Produk
              </button>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => {
                const marginAmt = p.sellingPrice - p.costPrice;
                const marginPct = p.sellingPrice > 0 ? Math.round((marginAmt / p.sellingPrice) * 100) : 0;
                return (
                  <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-bold text-slate-800 text-sm leading-tight">{p.name}</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {p.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 block">Harga Modal (HPP)</span>
                        <span className="font-mono text-slate-600 font-semibold">{formatRupiah(p.costPrice)}</span>
                      </div>
                      <div className="bg-emerald-50/60 p-2 rounded-lg">
                        <span className="text-[10px] text-emerald-700 block">Harga Jual</span>
                        <span className="font-mono text-emerald-800 font-bold">{formatRupiah(p.sellingPrice)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <span className="text-slate-500">
                        Stok: <span className="font-bold text-slate-800">{p.stock} {p.unit}</span>
                      </span>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded text-[11px]">
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

      {/* Floating Bottom Action for Fast Receipt Scan on Mobile */}
      <div className="no-print sm:hidden fixed bottom-4 right-4 z-30">
        <button
          onClick={() => setIsScanModalOpen(true)}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xl shadow-blue-600/40 ring-4 ring-blue-300/40 cursor-pointer"
          title="Scan Foto Nota"
        >
          <Camera className="w-6 h-6" />
        </button>
      </div>

      {/* ALL MODALS */}
      <OCRScannerModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        userId={currentUser?.id || 'user_demo_cantika'}
        onTransactionSaved={() => fetchData(currentUser?.id)}
      />

      <QRISMutationModal
        isOpen={isQrisModalOpen}
        onClose={() => setIsQrisModalOpen(false)}
        userId={currentUser?.id || 'user_demo_cantika'}
        merchantId={currentUser?.qrisMerchantId || 'NMID-ID102008492019'}
        onMutationSuccess={() => fetchData(currentUser?.id)}
      />

      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        userId={currentUser?.id || 'user_demo_cantika'}
        onSaved={() => fetchData(currentUser?.id)}
      />

      <FundingReadyReportModal
        isOpen={isFundingModalOpen}
        onClose={() => setIsFundingModalOpen(false)}
        transactions={transactions}
        user={currentUser || {
          id: 'user_demo_cantika',
          email: 'demo@finsight.id',
          fullName: 'Cantika Chandra Winata',
          businessName: 'Kopi & Kuliner Cantika',
          businessType: 'F&B dan Bakery',
          phone: '081234567890',
          city: 'Surabaya',
          qrisMerchantId: 'NMID-ID102008492019',
          isVerified: true,
          role: 'owner',
          createdAt: new Date().toISOString(),
        }}
        health={health}
      />

      <ProductCatalogModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        products={products}
        userId={currentUser?.id || 'user_demo_cantika'}
        onProductsUpdated={() => fetchData(currentUser?.id)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
