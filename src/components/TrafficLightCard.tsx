import React from 'react';
import { AnalysisPeriod, HealthMetric } from '../types';
import { ShieldCheck, TrendingUp, Calendar, CreditCard, Award, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TrafficLightCardProps {
  health: HealthMetric | null;
  selectedPeriod?: AnalysisPeriod;
  onChangePeriod?: (period: AnalysisPeriod) => void;
  periodLoading?: boolean;
  onOpenFundingModal: () => void;
}

const PERIOD_OPTIONS: Array<{ key: AnalysisPeriod; label: string; sub: string }> = [
  { key: '1m', label: '1 Bulan', sub: '30 Hari' },
  { key: '3m', label: 'Triwulan', sub: '3 Bulan' },
  { key: '6m', label: 'Setengah Tahun', sub: '6 Bulan' },
  { key: '1y', label: '1 Tahun', sub: '12 Bulan' },
];

export const TrafficLightCard: React.FC<TrafficLightCardProps> = ({
  health,
  selectedPeriod = '1m',
  onChangePeriod,
  periodLoading = false,
  onOpenFundingModal,
}) => {
  if (!health) return null;

  const isGreen = health.status === 'hijau';
  const isYellow = health.status === 'kuning';
  const isRed = health.status === 'merah';
  const activePeriod = health.period || selectedPeriod;

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Period Selector Bar */}
      {onChangePeriod && (
        <div className="px-6 py-3 bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Kurun Waktu Deteksi &amp; Analisis Keuangan:</span>
            {typeof health.transactionCount === 'number' && (
              <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                ({health.transactionCount} transaksi)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {PERIOD_OPTIONS.map((opt) => {
              const isSelected = activePeriod === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={periodLoading}
                  onClick={() => onChangePeriod(opt.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`text-[10px] font-normal ${
                      isSelected ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    ({opt.sub})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div
        className={`px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ${
          isGreen
            ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border-emerald-100 dark:border-emerald-900/50'
            : isYellow
            ? 'bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-transparent border-amber-100 dark:border-amber-900/50'
            : 'bg-gradient-to-r from-rose-500/10 via-red-500/10 to-transparent border-rose-100 dark:border-rose-900/50'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Traffic Light Visual Widget */}
          <div className="bg-slate-900 px-2.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-inner border border-slate-700">
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                isRed
                  ? 'bg-rose-500 ring-4 ring-rose-500/40 shadow-sm'
                  : 'bg-rose-950/60 opacity-40'
              }`}
            />
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                isYellow
                  ? 'bg-amber-400 ring-4 ring-amber-400/40 shadow-sm'
                  : 'bg-amber-950/60 opacity-40'
              }`}
            />
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                isGreen
                  ? 'bg-emerald-400 ring-4 ring-emerald-400/40 shadow-sm'
                  : 'bg-emerald-950/60 opacity-40'
              }`}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Indikator Kesehatan Usaha ({health.periodLabel || '1 Bulan Terakhir'})
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-md font-bold uppercase ${
                  isGreen
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                    : isYellow
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                    : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                }`}
              >
                Zona {health.status.toUpperCase()}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mt-0.5">{health.title}</h3>
          </div>
        </div>

        {/* Score Badge */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="text-right">
            <div className="text-[11px] text-slate-400 font-medium">FinSight Score</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono tabular-nums">
              {health.score}
              <span className="text-xs font-normal text-slate-400">/100</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (isGreen) triggerConfetti();
              onOpenFundingModal();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
              isGreen
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white'
            }`}
          >
            <Award className="w-4 h-4 text-blue-200" />
            Laporan Siap Pinjam Bank
          </button>
        </div>
      </div>

      {/* Main Body with 4 Pillars */}
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Margin */}
          <div className="bg-slate-50/70 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
              <span>Margin Laba Bersih</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-white font-mono tabular-nums">
              {health.netMargin > 0 ? `+${health.netMargin}%` : `${health.netMargin}%`}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Standar UMKM Sehat &gt; 15%</p>
          </div>

          {/* Cash Runway */}
          <div className="bg-slate-50/70 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
              <span>Ketahanan Kas (Runway)</span>
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-white font-mono tabular-nums">
              {health.cashRunwayDays} Hari
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Estimasi cadangan kas usaha</p>
          </div>

          {/* Digital POS & Non-Tunai Share */}
          <div className="bg-slate-50/70 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
              <span>Pencatatan Kasir &amp; Non-Tunai</span>
              <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-white font-mono tabular-nums">
              {health.digitalAdoptionRate}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Tercatat terstruktur di sistem</p>
          </div>

          {/* Funding Readiness */}
          <div className="bg-slate-50/70 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
              <span>Kesiapan KUR / Investor</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate mt-1">
              {health.fundingReadinessLevel}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Verifikasi bankable terstandar</p>
          </div>
        </div>

        {/* Narrative & Recommendation */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{health.explanation}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Rekomendasi Tindakan:</span> {health.recommendation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
