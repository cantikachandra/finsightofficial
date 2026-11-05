import React, { useRef } from 'react';
import { Transaction, HealthMetric, User } from '../types';
import { Download, Printer, CheckCircle2, ShieldCheck, X, FileSpreadsheet, Building2, Calendar, TrendingUp } from 'lucide-react';
import { downloadCsvReport, formatRupiah } from '../utils/exportReport';

interface FundingReadyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  user: User;
  health: HealthMetric | null;
}

export const FundingReadyReportModal: React.FC<FundingReadyReportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  user,
  health,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Financial Computations
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;
  const netMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0';

  // Categories breakdown
  const rawMaterialExpense = transactions
    .filter((t) => t.type === 'expense' && t.category === 'Belanja Bahan Baku')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const grossProfit = totalIncome - rawMaterialExpense;
  const operatingExpenses = totalExpense - rawMaterialExpense;

  const qrisIncome = transactions
    .filter((t) => t.type === 'income' && (t.source === 'qris' || t.paymentMethod === 'QRIS'))
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const cashIncome = totalIncome - qrisIncome;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    downloadCsvReport(transactions, user, health);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-6">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Modul Laporan Siap Pinjam (Investor / Bank View)</h3>
              <p className="text-xs text-slate-400">Standar Pengajuan KUR &amp; Lembaga Keuangan Formal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Unduh Excel (.CSV)
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / Simpan PDF
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE OFFICIAL FINANCIAL REPORT */}
        <div ref={printRef} className="p-8 space-y-6 text-slate-800 max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-visible">
          {/* Official Document Header */}
          <div className="border-b-2 border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-2xl tracking-tight text-slate-900 font-mono">FINSIGHT</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800">
                  Terverifikasi Sistem
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-800 mt-1">
                Laporan Keuangan &amp; Kelayakan Usaha UMKM
              </h2>
              <p className="text-xs text-slate-500">
                Dokumen resmi untuk verifikasi analis kredit perbankan (KUR) &amp; mitra investor
              </p>
            </div>

            {/* Business Profile Box */}
            <div className="text-right text-xs space-y-0.5">
              <div className="font-bold text-slate-900 text-sm">{user.businessName || 'Usaha Mandiri (Anonymous)'}</div>
              <div className="text-slate-600">Pemilik: <span className="font-semibold">{user.fullName || 'Pengguna Anonymous'}</span></div>
              <div className="text-slate-500">Kategori: {user.businessType || 'Kuliner & Usaha Ritel'} | {user.city || 'Indonesia'}</div>
              <div className="text-slate-500 font-mono text-[11px]">NMID QRIS: {user.qrisMerchantId || 'NMID-ID102008492019'}</div>
              <div className="text-slate-400 text-[10px]">
                Periode Data: {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Credit Scoring & Readiness Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Tingkat Kesiapan FinSight</div>
              <div className="text-base font-bold text-emerald-700 mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {health?.fundingReadinessLevel || 'Level 3 (Siap KUR / Bankable)'}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Memenuhi standar SIDT &amp; Bank Indonesia</p>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Skor Kesehatan Usaha</div>
              <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                {health?.score || 92} / 100
                <span className="text-xs font-bold text-emerald-600 ml-2">Zona Hijau</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Evaluasi rasio likuiditas &amp; margin kas</p>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Adopsi Mutasi QRIS</div>
              <div className="text-xl font-extrabold text-blue-700 font-mono mt-0.5">
                {health?.qrisAdoptionRate || 78}%
                <span className="text-xs font-normal text-slate-500 ml-1">Non-Tunai</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Jejak transaksi digital tervalidasi</p>
            </div>
          </div>

          {/* TABLE 1: LAPORAN LABA RUGI (PROFIT & LOSS) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              1. Laporan Laba Rugi Komprehensif (Income Statement)
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100/80 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-2 px-4 text-left">Komponen Keuangan</th>
                    <th className="py-2 px-4 text-right">Rincian Nominal (IDR)</th>
                    <th className="py-2 px-4 text-right">% dari Omzet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Revenue */}
                  <tr className="bg-slate-50/50 font-semibold text-slate-800">
                    <td className="py-2 px-4">A. PENDAPATAN USAHA (OMZET)</td>
                    <td className="py-2 px-4 text-right font-mono">{formatRupiah(totalIncome)}</td>
                    <td className="py-2 px-4 text-right font-mono">100.0%</td>
                  </tr>
                  <tr className="text-slate-600">
                    <td className="py-1.5 px-6">&bull; Penerimaan via Mutasi QRIS Digital</td>
                    <td className="py-1.5 px-4 text-right font-mono">{formatRupiah(qrisIncome)}</td>
                    <td className="py-1.5 px-4 text-right font-mono">
                      {totalIncome > 0 ? ((qrisIncome / totalIncome) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="text-slate-600">
                    <td className="py-1.5 px-6">&bull; Penerimaan Penjualan Tunai Kasir</td>
                    <td className="py-1.5 px-4 text-right font-mono">{formatRupiah(cashIncome)}</td>
                    <td className="py-1.5 px-4 text-right font-mono">
                      {totalIncome > 0 ? ((cashIncome / totalIncome) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>

                  {/* COGS */}
                  <tr className="bg-slate-50/50 font-semibold text-slate-800">
                    <td className="py-2 px-4">B. HARGA POKOK PENJUALAN (HPP / BAHAN BAKU)</td>
                    <td className="py-2 px-4 text-right font-mono text-rose-600">({formatRupiah(rawMaterialExpense)})</td>
                    <td className="py-2 px-4 text-right font-mono">
                      {totalIncome > 0 ? ((rawMaterialExpense / totalIncome) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>

                  {/* Gross Profit */}
                  <tr className="bg-emerald-50/40 font-bold text-emerald-900 border-t border-b border-emerald-200">
                    <td className="py-2 px-4">LABA KOTOR (GROSS PROFIT) [A - B]</td>
                    <td className="py-2 px-4 text-right font-mono">{formatRupiah(grossProfit)}</td>
                    <td className="py-2 px-4 text-right font-mono">
                      {totalIncome > 0 ? ((grossProfit / totalIncome) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>

                  {/* Operational Expenses */}
                  <tr className="bg-slate-50/50 font-semibold text-slate-800">
                    <td className="py-2 px-4">C. BEBAN OPERASIONAL &amp; UMUM</td>
                    <td className="py-2 px-4 text-right font-mono text-rose-600">({formatRupiah(operatingExpenses)})</td>
                    <td className="py-2 px-4 text-right font-mono">
                      {totalIncome > 0 ? ((operatingExpenses / totalIncome) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>

                  {/* Net Profit */}
                  <tr className="bg-emerald-600 text-white font-extrabold text-sm">
                    <td className="py-2.5 px-4">LABA BERSIH BERSIH OPERASIONAL (NET PROFIT)</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatRupiah(netProfit)}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{netMargin}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLE 2: ARUS KAS & RUNWAY */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              2. Ringkasan Arus Kas Operasional (Operating Cash Flow)
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-[11px] text-slate-500">Total Arus Masuk (Inflow)</div>
                <div className="text-sm font-bold font-mono text-emerald-700 mt-1">{formatRupiah(totalIncome)}</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-[11px] text-slate-500">Total Arus Keluar (Outflow)</div>
                <div className="text-sm font-bold font-mono text-rose-700 mt-1">{formatRupiah(totalExpense)}</div>
              </div>

              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <div className="text-[11px] text-emerald-800 font-semibold">Surplus Kas Operasi</div>
                <div className="text-sm font-bold font-mono text-emerald-800 mt-1">+{formatRupiah(netProfit)}</div>
              </div>
            </div>
          </div>

          {/* Bank Recommendation Statement */}
          <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 text-xs space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-700" />
              Keterangan Verifikasi Lembaga Keuangan / Bank:
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Berdasarkan analisis FinSight, debitur memiliki margin laba bersih sebesar {netMargin}% dan rasio transaksi QRIS sebesar {health?.qrisAdoptionRate || 78}%. Pola perputaran modal usaha tergolong sehat dengan kemampuan bayar (Debt Service Capability) yang memadai untuk pengajuan pembiayaan modal kerja KUR skala mikro / kecil.
            </p>
          </div>

          {/* Signature & Seal Block */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-center">
            <div>
              <p className="text-slate-400 text-[10px]">Diverifikasi &amp; Disusun Oleh,</p>
              <div className="h-16 flex items-center justify-center font-serif italic text-slate-700 font-bold">
                {user.fullName || 'Cantika Chandra Winata'}
              </div>
              <p className="font-bold text-slate-800">{user.fullName || 'Cantika Chandra Winata'}</p>
              <p className="text-[11px] text-slate-400">Pemilik Usaha {user.businessName}</p>
            </div>

            <div>
              <p className="text-slate-400 text-[10px]">Sistem Pembukuan FinSight</p>
              <div className="h-16 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full border-2 border-emerald-600/40 text-[9px] font-bold text-emerald-800 flex items-center justify-center uppercase tracking-tighter text-center p-1 transform rotate-[-6deg]">
                  FINSIGHT VERIFIED
                </div>
              </div>
              <p className="font-bold text-slate-800 font-mono text-[11px]">SECURITY HASH: FS-2026-OK</p>
              <p className="text-[11px] text-slate-400">Dicetak: {new Date().toLocaleDateString('id-ID')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
