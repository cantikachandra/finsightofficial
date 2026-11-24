import React from 'react';
import { CashflowForecast } from '../types';
import { Sparkles, TrendingUp, ArrowUpRight, ArrowDownRight, Lightbulb } from 'lucide-react';
import { formatRupiah } from '../utils/exportReport';

interface CashflowPredictionCardProps {
  forecast: CashflowForecast;
}

export const CashflowPredictionCard: React.FC<CashflowPredictionCardProps> = ({ forecast }) => {
  const isSurplus = forecast.netProjectedCash >= 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              Prediksi Arus Kas FinSight ({forecast.period})
            </h3>
            <p className="text-xs text-slate-400">
              {forecast.basisLabel || 'Moving Average -> Proyeksi Periode Berikutnya'}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
          Tingkat Keyakinan {forecast.confidence}%
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Income Projection */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Estimasi Pemasukan</span>
          </div>
          <div className="text-base font-bold text-slate-800 dark:text-white font-mono tabular-nums">
            {formatRupiah(forecast.projectedIncome)}
          </div>
        </div>

        {/* Expense Projection */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Estimasi Beban</span>
          </div>
          <div className="text-base font-bold text-slate-800 dark:text-white font-mono tabular-nums">
            {formatRupiah(forecast.projectedExpense)}
          </div>
        </div>

        {/* Net Cash */}
        <div className={`p-3 rounded-xl border ${isSurplus ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50' : 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50'}`}>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <TrendingUp className={`w-4 h-4 ${isSurplus ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} />
            <span>Proyeksi Kas Bersih</span>
          </div>
          <div className={`text-base font-bold font-mono tabular-nums ${isSurplus ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
            {isSurplus ? '+' : ''}{formatRupiah(forecast.netProjectedCash)}
          </div>
        </div>
      </div>

      {/* Decision recommendation for purchasing / restocking */}
      <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2.5">
        <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-950 dark:text-indigo-200 font-medium leading-relaxed">
          <span className="font-bold text-indigo-900 dark:text-indigo-300">Saran Belanja Stok:</span> {forecast.advice}
        </p>
      </div>
    </div>
  );
};
