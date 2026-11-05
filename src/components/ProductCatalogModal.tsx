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

  if (!isOpen) return null;

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sellingPrice) return;

    setLoading(true);
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
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus produk ini dari katalog?')) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      onProductsUpdated();
    } catch (err: any) {
      alert('Gagal menghapus produk');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Inventaris &amp; Katalog Produk UMKM</h3>
              <p className="text-xs text-slate-400">Kelola Menu, HPP, Margin, dan Stok Bahan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-slate-500">
              Total <span className="font-bold text-slate-800">{products.length}</span> Produk Terdaftar
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {showAddForm ? 'Batal Tambah' : 'Tambah Produk'}
            </button>
          </div>

          {/* Form Tambah Produk */}
          {showAddForm && (
            <form onSubmit={handleAddProduct} className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Form Tambah Produk Baru</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-500 block mb-1">Nama Produk / Menu</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Es Kopi Susu Creamy"
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Kategori</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Contoh: Minuman Kopi"
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Harga Modal (HPP) Rp</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="6500"
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Harga Jual Rp</label>
                  <input
                    type="number"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="18000"
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Simpan Produk
                </button>
              </div>
            </form>
          )}

          {/* Table of Products */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] sticky top-0">
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
              <tbody className="divide-y divide-slate-100">
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
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-slate-800">{p.name}</td>
                        <td className="py-2 px-3 text-slate-500">{p.category}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{formatRupiah(p.costPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">{formatRupiah(p.sellingPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">
                          +{marginPct}%
                        </td>
                        <td className="py-2 px-3 text-center text-slate-700">
                          {p.stock} {p.unit}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
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
