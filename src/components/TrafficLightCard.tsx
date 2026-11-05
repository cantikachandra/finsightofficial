import React from 'react';
import { HealthMetric } from '../types';
import { ShieldCheck, AlertTriangle, XCircle, TrendingUp, Calendar, QrCode, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TrafficLightCardProps {
  health: HealthMetric | null;
  onOpenFundingModal: () => void;
}

export const TrafficLightCard: React.FC<TrafficLightCardProps> = ({
  health,
  onOpenFundingModal,
}) => {
  if (!health) return null;

  const isGreen = health.status === 'hijau';
  const isYellow = health.status === 'kuning';
  const isRed = health.status === 'merah';

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Top Banner */}
      <div
        className={`px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ${
          isGreen
            ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border-emerald-100'
            : isYellow
            ? 'bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-transparent border-amber-100'
            : 'bg-gradient-to-r from-rose-500/10 via-red-500/10 to-transparent border-rose-100'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Traffic Light Visual Widget */}
          <div className="bg-slate-900 px-2.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-inner border border-slate-700">
            {/* Red Light */}
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                isRed
                  ? 'bg-rose-500 ring-4 ring-rose-500/40 shadow-sm animate-pulse'
                  : 'bg-rose-950/60 opacity-40'
              }`}
            />
            {/* Yellow Light */}
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                isYellow
                  ? 'bg-amber-400 ring-4 ring-amber-400/40 shadow-sm animate-pulse'
                  : 'bg-amber-950/60 opacity-40'
              }`}
            />
            {/* Green Light */}
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                isGreen
                  ? 'bg-emerald-400 ring-4 ring-emerald-400/40 shadow-sm animate-pulse'
                  : 'bg-emerald-950/60 opacity-40'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Indikator Kesehatan Usaha (Traffic-Light)
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  isGreen
                    ? 'bg-emerald-100 text-emerald-800'
                    : isYellow
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                Zona {health.status.toUpperCase()}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-800 mt-0.5">{health.title}</h3>
          </div>
        </div>

        {/* Score Badge */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="text-right">
            <div className="text-[11px] text-slate-400 font-medium">FinSight Score</div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
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
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                : 'bg-slate-800 hover:bg-slate-900 text-white'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-200" />
            Laporan Siap Pinjam Bank
          </button>
        </div>
      </div>

      {/* Main Body with 4 Pillars */}
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Margin */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Margin Laba Bersih</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-800 font-mono">
              {health.netMargin > 0 ? `+${health.netMargin}%` : `${health.netMargin}%`}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Standar UMKM Sehat &gt; 15%</p>
          </div>

          {/* Cash Runway */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Ketahanan Kas (Runway)</span>
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-xl font-bold text-slate-800 font-mono">
              {health.cashRunwayDays} Hari
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Estimasi cadangan kas usaha</p>
          </div>

          {/* QRIS Share */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Adopsi Mutasi QRIS</span>
              <QrCode className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-bold text-slate-800 font-mono">
              {health.qrisAdoptionRate}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Tercatat digital tanpa manual</p>
          </div>

          {/* Funding Readiness */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Kesiapan KUR / Investor</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-sm font-bold text-emerald-700 truncate mt-1">
              {health.fundingReadinessLevel}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Verifikasi bankable terstandar</p>
          </div>
        </div>

        {/* Narrative & Recommendation */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-700">{health.explanation}</p>
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-emerald-700">Rekomendasi Tindakan:</span> {health.recommendation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
