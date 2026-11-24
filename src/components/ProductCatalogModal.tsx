import React, { useState } from 'react';
import { Package, Plus, Trash2, X, Check, TrendingUp } from 'lucide-react';
import { ProductItem } from '../types';
import { formatRupiah } from '../utils/exportReport';

interface ProductCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  userId: string;
  onProductsUpdated: () => void;
}

export const ProductCatalogModal: React.FC<ProductCatalogModalProps> = ({
  isOpen,
  onClose,
  products,
  userId,
  onProductsUpdated,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Menu Utama');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>(50);
  const [unit, setUnit] = useState('Porsi');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sellingPrice) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name,
          category,
          costPrice: Number(costPrice || 0),
          sellingPrice: Number(sellingPrice),
          stock: Number(stock || 0),
          unit,
        }),
      });

      if (!res.ok) throw new Error('Gagal menambah produk');

      setName('');
      setCostPrice('');
      setSellingPrice('');
      setShowAddForm(false);
      onProductsUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambah produk');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus produk ini dari katalog?')) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus produk');
      onProductsUpdated();
    } catch {
      setErrorMsg('Gagal menghapus produk');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 my-8">
        <div className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Inventaris &amp; Katalog Produk Kasir</h3>
              <p className="text-xs text-blue-100">Kelola Menu, HPP, Harga Jual &amp; Stok untuk Transaksi Kasir POS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Total <span className="font-bold text-slate-800 dark:text-slate-100">{products.length}</span> Produk Terdaftar
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {showAddForm ? 'Batal Tambah' : 'Tambah Produk Baru'}
            </button>
          </div>

          {/* Form Tambah Produk */}
          {showAddForm && (
            <form onSubmit={handleAddProduct} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 mb-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Form Tambah Produk Baru</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="col-span-2 sm:col-span-2">
                  <label className="text-slate-600 dark:text-slate-300 font-semibold block mb-1">Nama Produk / Menu *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Es Kopi Susu Creamy"
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-300 font-semibold block mb-1">Kategori</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Minuman / Menu Utama"
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-300 font-semibold block mb-1">Harga Modal (HPP) Rp</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="6500"
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-300 font-semibold block mb-1">Harga Jual Kasir Rp *</label>
                  <input
                    type="number"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="18000"
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-600 dark:text-slate-300 font-semibold block mb-1">Stok Awal</label>
                    <input
                      type="number"
                      min={0}
                      value={stock}
                      onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="50"
                      className="w-full py-1.5 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-300 font-semibold block mb-1">Satuan</label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="Pcs"
                      className="w-full py-1.5 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Simpan Produk ke Katalog
                </button>
              </div>
            </form>
          )}

          {/* Table of Products */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-2 px-3">Nama Produk</th>
                  <th className="py-2 px-3">Kategori</th>
                  <th className="py-2 px-3 text-right">HPP Modal</th>
                  <th className="py-2 px-3 text-right">Harga Jual</th>
                  <th className="py-2 px-3 text-right">Margin Satuan</th>
                  <th className="py-2 px-3 text-center">Stok</th>
                  <th className="py-2 px-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      Belum ada produk di katalog.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const marginAmt = p.sellingPrice - p.costPrice;
                    const marginPct = p.sellingPrice > 0 ? Math.round((marginAmt / p.sellingPrice) * 100) : 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-100">{p.name}</td>
                        <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{p.category}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-300">{formatRupiah(p.costPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-white">{formatRupiah(p.sellingPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                          +{marginPct}%
                        </td>
                        <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300">
                          {p.stock} {p.unit}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                            title="Hapus"
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
    </div>
  );
};
