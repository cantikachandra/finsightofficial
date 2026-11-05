import React, { useState } from 'react';
import { PlusCircle, X, ArrowUpRight, ArrowDownRight, Check } from 'lucide-react';
import { TransactionCategory, TransactionType } from '../types';
import { playIncomeSound, playExpenseSound, sendBrowserNotification } from '../utils/notification';
import { formatRupiah } from '../utils/exportReport';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSaved: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSaved,
}) => {
  const [type, setType] = useState<TransactionType>('income');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<TransactionCategory>('Penjualan Tunai');
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS' | 'Transfer Bank' | 'Kartu'>('Tunai');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const incomeCategories: TransactionCategory[] = [
    'Penjualan Tunai',
    'Penjualan QRIS',
    'Penjualan Online',
    'Lain-lain',
  ];

  const expenseCategories: TransactionCategory[] = [
    'Belanja Bahan Baku',
    'Operasional',
    'Gaji Karyawan',
    'Sewa Tempat & Listrik',
    'Pemasaran & Promosi',
    'Peralatan & Aset',
    'Lain-lain',
  ];

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income') {
      setCategory('Penjualan Tunai');
    } else {
      setCategory('Belanja Bahan Baku');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || Number(amount) <= 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          date,
          description,
          category,
          type,
          amount: Number(amount),
          source: 'manual',
          paymentMethod,
          notes,
        }),
      });

      if (!res.ok) throw new Error('Gagal mencatat transaksi');

      if (type === 'income') {
        playIncomeSound();
        sendBrowserNotification('Pemasukan Berhasil Dicatat! 💰', {
          body: `${description}: ${formatRupiah(Number(amount))} via ${paymentMethod}`,
        });
      } else {
        playExpenseSound();
        sendBrowserNotification('Pengeluaran Berhasil Dicatat 🧾', {
          body: `${description}: ${formatRupiah(Number(amount))} (${category})`,
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Catat Transaksi Manual</h3>
              <p className="text-xs text-slate-400">Pencatatan Cepat FinSight</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Income / Expense Switch */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Pemasukan (Uang Masuk)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              Pengeluaran (Beban)
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nominal Transaksi (Rp)
            </label>
            <input
              type="number"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className="w-full text-xl font-bold font-mono py-2.5 px-3 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan Transaksi
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'income' ? 'Contoh: Penjualan 8 Paket Kopi & Dimsum' : 'Contoh: Beli Gas Elpiji 3kg & Es Batu'}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                className="w-full py-2 px-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {(type === 'income' ? incomeCategories : expenseCategories).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Metode Bayar</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full py-2 px-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="Tunai">Tunai / Cash</option>
                <option value="QRIS">QRIS Merchant</option>
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="Kartu">Kartu Debit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <Check className="w-4 h-4" />
            {loading ? 'Menyimpan...' : 'Simpan Transaksi & Kirim Notifikasi'}
          </button>
        </form>
      </div>
    </div>
  );
};
