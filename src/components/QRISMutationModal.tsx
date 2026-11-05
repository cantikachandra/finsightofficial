import React, { useState } from 'react';
import { QrCode, Zap, Check, ArrowRight, ShieldCheck, X } from 'lucide-react';
import { playIncomeSound, sendBrowserNotification } from '../utils/notification';
import { formatRupiah } from '../utils/exportReport';

interface QRISMutationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  merchantId: string;
  onMutationSuccess: () => void;
}

export const QRISMutationModal: React.FC<QRISMutationModalProps> = ({
  isOpen,
  onClose,
  userId,
  merchantId,
  onMutationSuccess,
}) => {
  const [amount, setAmount] = useState<number>(45000);
  const [customerName, setCustomerName] = useState('Anisa Maharani');
  const [issuer, setIssuer] = useState('ShopeePay');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickAmounts = [25000, 45000, 68000, 110000, 185000];

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/qris/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount,
          customerName,
          issuer,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Simulasi QRIS gagal');

      // Audio feedback
      playIncomeSound();

      // Trigger web and mobile push notification
      sendBrowserNotification(`Pembayaran QRIS Diterima! ⚡`, {
        body: `Uang masuk ${formatRupiah(amount)} dari ${customerName} (${issuer}). Saldo usaha otomatis diperbarui.`,
      });

      onMutationSuccess();
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
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Simulasi Integrasi Mutasi QRIS</h3>
              <p className="text-xs text-blue-100">Bank Indonesia QRIS Merchant Aggregator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
              <div>
                <span className="font-bold">Merchant ID:</span> {merchantId || 'NMID-ID102008492019'}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-200/80 font-bold text-[10px] text-blue-800">
              Terhubung Realtime
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nominal Transaksi Pelanggan (Rp)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full text-lg font-bold font-mono py-2.5 px-3 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className={`text-[11px] font-mono px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                    amount === amt
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {formatRupiah(amt)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Pembeli / Pelanggan
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: Rian Pratama"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Aplikasi Pembayaran QRIS (Issuer)
            </label>
            <select
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ShopeePay">ShopeePay</option>
              <option value="GoPay">GoPay (GoTo)</option>
              <option value="BCA QRIS">BCA mobile / QRIS</option>
              <option value="Mandiri Livin">Livin by Mandiri</option>
              <option value="OVO">OVO Payment</option>
              <option value="Dana">DANA Indonesia</option>
              <option value="BRImo">BRImo (Bank BRI)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={loading || amount <= 0}
              onClick={handleSimulate}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              {loading ? 'Memproses Mutasi...' : 'Kirim Pembayaran QRIS & Picu Notifikasi'}
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Pemasukan langsung otomatis masuk ke buku kas tanpa input manual.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
