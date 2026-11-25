import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  CheckCircle2,
  Clock,
  Camera,
  PlusCircle,
  Package,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import { ProductItem, Transaction, TransactionItem } from '../types';
import { formatRupiah } from '../utils/exportReport';
import { playIncomeSound, sendBrowserNotification } from '../utils/notification';
import { parseApiResponse } from '../utils/api';

interface CashierPOSViewProps {
  userId: string;
  products: ProductItem[];
  transactions: Transaction[];
  onTransactionSaved: () => void;
  onOpenProductModal: () => void;
  onOpenTxModal: () => void;
  onOpenScanModal: () => void;
}

export const CashierPOSView: React.FC<CashierPOSViewProps> = ({
  userId,
  products,
  transactions,
  onTransactionSaved,
  onOpenProductModal,
  onOpenTxModal,
  onOpenScanModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [cart, setCart] = useState<Array<{ product: ProductItem; qty: number }>>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'Transfer Bank' | 'E-Wallet' | 'Kartu'>('Tunai');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<{
    referenceNo: string;
    total: number;
    time: string;
    date: string;
    paymentMethod: string;
    itemCount: number;
    change: number;
  } | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(['Semua']);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const addToCart = (product: ProductItem) => {
    setErrorMsg(null);
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.product.id === productId ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.product.sellingPrice || 0) * item.qty, 0);
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const changeAmount = useMemo(() => {
    if (paymentMethod !== 'Tunai' || cashReceived === '') return 0;
    return Number(cashReceived) - subtotal;
  }, [paymentMethod, cashReceived, subtotal]);

  const handleCheckout = async () => {
    if (cart.length === 0 || subtotal <= 0) {
      setErrorMsg('Pilih minimal 1 produk dari katalog sebelum memproses pembayaran.');
      return;
    }

    if (paymentMethod === 'Tunai' && cashReceived !== '' && Number(cashReceived) < subtotal) {
      setErrorMsg('Nominal uang tunai diterima lebih kecil dari total tagihan.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const checkoutTime = new Date();
    const dateStr = checkoutTime.toISOString().split('T')[0];
    const timeStr = checkoutTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const cartItemsPayload: TransactionItem[] = cart.map((c) => ({
      productId: c.product.id,
      name: c.product.name,
      qty: c.qty,
      price: Number(c.product.sellingPrice),
      total: Number(c.product.sellingPrice) * c.qty,
    }));

    const summaryDesc =
      'Kasir POS: ' +
      cartItemsPayload.map((i) => `${i.name} (${i.qty}x)`).join(', ');

    const txCategory =
      paymentMethod === 'Tunai' ? 'Penjualan Kasir POS' : 'Penjualan Non-Tunai';

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          date: dateStr,
          time: timeStr,
          description: summaryDesc,
          category: txCategory,
          type: 'income',
          amount: subtotal,
          source: 'pos',
          paymentMethod,
          notes: customerNote.trim() || `Checkout Kasir POS (${totalItems} item) pada ${timeStr}`,
          cartItems: cartItemsPayload,
        }),
      });

      const data = await parseApiResponse(res);
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mencatat transaksi kasir.');
      }

      playIncomeSound();
      sendBrowserNotification('Transaksi Kasir Berhasil! 🛒', {
        body: `${formatRupiah(subtotal)} (${totalItems} item) via ${paymentMethod} telah masuk ke Buku Kas & Laporan.`,
      });

      setLastReceipt({
        referenceNo: data.transaction?.referenceNo || 'POS-' + Date.now(),
        total: subtotal,
        time: timeStr,
        date: dateStr,
        paymentMethod,
        itemCount: totalItems,
        change: Math.max(0, changeAmount),
      });

      setCart([]);
      setCashReceived('');
      setCustomerNote('');
      onTransactionSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan transaksi kasir.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setDeletingProductId(productId);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus produk dari katalog.');
      }
      setCart((prev) => prev.filter((c) => c.product.id !== productId));
      setConfirmDeleteId(null);
      onTransactionSaved();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menghapus produk dari katalog.');
    } finally {
      setDeletingProductId(null);
    }
  };

  const recentPosTxs = useMemo(
    () => transactions.filter((t) => t.source === 'pos').slice(0, 5),
    [transactions]
  );

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Kasir POS &amp; Pilih Katalog Produk
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Klik produk pada katalog untuk menambahkan ke keranjang. Waktu transaksi dan stok produk otomatis tercatat ke Buku Kas &amp; Laporan Keuangan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 text-xs font-mono font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              {now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} &middot;{' '}
              {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenProductModal}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Kelola Katalog</span>
          </button>

          <button
            type="button"
            onClick={onOpenTxModal}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Input Manual</span>
          </button>

          <button
            type="button"
            onClick={onOpenScanModal}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Scan Nota (OCR)</span>
          </button>
        </div>
      </div>

      {/* Main Split: Catalog Grid (Left) + Cashier Cart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Product Catalog Selection */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Search & Category Tabs */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama produk atau menu di katalog..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Clickable Product Cards */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
              <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {products.length === 0
                    ? 'Katalog Produk Masih Kosong'
                    : 'Tidak Ada Produk yang Cocok'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tambahkan produk jualan Anda terlebih dahulu agar langsung bisa dipilih saat transaksi kasir.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenProductModal}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Produk Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredProducts.map((product) => {
                const inCart = cart.find((c) => c.product.id === product.id);
                const outOfStock = Number(product.stock || 0) <= 0;
                const isConfirmingDelete = confirmDeleteId === product.id;
                const isDeleting = deletingProductId === product.id;
                return (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        addToCart(product);
                      }
                    }}
                    className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      inCart
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          {inCart && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-xs font-bold font-mono">
                              {inCart.qty}x
                            </span>
                          )}
                          {isConfirmingDelete ? (
                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleDeleteProduct(product.id)}
                                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[10px] font-bold cursor-pointer"
                              >
                                {isDeleting ? '...' : 'Hapus'}
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-semibold cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(product.id);
                              }}
                              title="Hapus item dari katalog"
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {product.category || 'Umum'} &middot; Stok:{' '}
                        <span className={outOfStock ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-700 dark:text-slate-200 font-semibold'}>
                          {product.stock} {product.unit}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-base font-extrabold text-blue-700 dark:text-blue-400 font-mono tabular-nums">
                        {formatRupiah(product.sellingPrice)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/50 px-2.5 py-1 rounded-lg">
                        <Plus className="w-3.5 h-3.5" />
                        Pilih
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent POS Transactions */}
          {recentPosTxs.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Transaksi Kasir POS Terbaru
                </h4>
                <span className="text-[11px] text-slate-400">{recentPosTxs.length} catatan terakhir</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentPosTxs.map((tx) => (
                  <div key={tx.id} className="px-5 py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{tx.description}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {tx.date} {tx.time ? `· ${tx.time}` : ''} &middot; {tx.referenceNo} &middot; {tx.paymentMethod}
                      </div>
                    </div>
                    <div className="font-bold font-mono text-emerald-700 dark:text-emerald-400 shrink-0 tabular-nums">
                      +{formatRupiah(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Active Cashier Checkout Cart */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 sticky top-32">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Keranjang Kasir</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {totalItems} item dipilih
              </p>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Kosongkan
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {lastReceipt && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Transaksi Kasir Tercatat!
              </div>
              <div className="text-[11px] text-emerald-800/90 font-mono">
                Ref: {lastReceipt.referenceNo} &middot; {lastReceipt.date} {lastReceipt.time}
              </div>
              <div className="flex items-center justify-between font-semibold pt-1">
                <span>Total ({lastReceipt.paymentMethod})</span>
                <span className="font-mono">{formatRupiah(lastReceipt.total)}</span>
              </div>
              {lastReceipt.change > 0 && (
                <div className="flex items-center justify-between text-[11px]">
                  <span>Kembalian Tunai</span>
                  <span className="font-mono font-bold">{formatRupiah(lastReceipt.change)}</span>
                </div>
              )}
            </div>
          )}

          {/* Cart Items */}
          {cart.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 space-y-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/40">
              <ShoppingCart className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
              <p>Belum ada produk dipilih.</p>
              <p className="text-[11px]">Klik produk di sebelah kiri untuk mulai transaksi.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto pr-1">
              {cart.map(({ product, qty }) => (
                <div key={product.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{product.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {formatRupiah(product.sellingPrice)} &times; {qty} ={' '}
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {formatRupiah(Number(product.sellingPrice) * qty)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateCartQty(product.id, -1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(product.id, 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(product.id)}
                      className="w-7 h-7 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer ml-0.5"
                      title="Hapus dari keranjang"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'Tunai' as const, label: 'Tunai', icon: Banknote },
                { id: 'Transfer Bank' as const, label: 'Transfer Bank', icon: Wallet },
                { id: 'E-Wallet' as const, label: 'E-Wallet', icon: Smartphone },
                { id: 'Kartu' as const, label: 'Kartu Debit', icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-900 dark:text-blue-200'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Tendered & Change */}
          {paymentMethod === 'Tunai' && subtotal > 0 && (
            <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Uang Tunai Diterima (Opsional untuk hitung kembalian)
              </label>
              <input
                type="number"
                min={0}
                value={cashReceived}
                onChange={(e) =>
                  setCashReceived(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder={`Minimal ${subtotal.toLocaleString('id-ID')}`}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <div className="flex flex-wrap gap-1.5">
                {[subtotal, 50000, 100000, 200000].map((amt, i) => (
                  <button
                    key={`${amt}-${i}`}
                    type="button"
                    onClick={() => setCashReceived(amt)}
                    className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    {i === 0 ? 'Uang Pas' : formatRupiah(amt)}
                  </button>
                ))}
              </div>
              {cashReceived !== '' && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">Kembalian</span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      changeAmount >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {changeAmount >= 0
                      ? formatRupiah(changeAmount)
                      : `Kurang ${formatRupiah(Math.abs(changeAmount))}`}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <input
              type="text"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Catatan kasir / nama pelanggan (opsional)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Total & Pay Button */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Total Tagihan
              </span>
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
                {formatRupiah(subtotal)}
              </span>
            </div>

            <button
              type="button"
              disabled={submitting || cart.length === 0}
              onClick={handleCheckout}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting ? 'Memproses Transaksi...' : 'Bayar & Catat Transaksi Kasir'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
