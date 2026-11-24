@extends('layouts.app')

@section('title', 'Dashboard FinSight UMKM')

@section('content')
<div class="space-y-6">
    <!-- Top Greeting & Glowing Gradient Balance Card (Inspired by Reference UI) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Blue Glowing Card -->
        <div class="lg:col-span-2 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 p-6 sm:p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            <div class="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

            <div>
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-xs uppercase tracking-wider font-semibold text-blue-100/90">Estimasi Saldo Kas Berjalan</span>
                        <div class="text-xs text-blue-200 mt-0.5">{{ session('user')->business_name ?? 'Usaha Mandiri (Anonymous)' }}</div>
                    </div>
                    <div class="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                    </div>
                </div>

                <div class="text-3xl sm:text-4xl font-black font-mono tracking-tight mt-3">
                    Rp 4.195.000
                </div>

                <div class="inline-flex items-center gap-1.5 text-xs text-emerald-300 font-bold mt-2 bg-emerald-500/20 px-2.5 py-1 rounded-full">
                    <span>&uarr; +18.4% pertumbuhan omzet bulan ini</span>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-3 pt-6 border-t border-white/20">
                <a href="/reports" class="px-4 py-2 rounded-xl bg-white text-blue-700 text-xs font-bold shadow-md hover:bg-blue-50 transition-colors">
                    Lihat Laporan Lengkap &rarr;
                </a>
                <a href="/reports/export-excel" class="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors">
                    Unduh Excel (.CSV)
                </a>
            </div>
        </div>

        <!-- Quick Status Card -->
        <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between mb-4">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Kelayakan KUR</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">HIJAU</span>
                </div>
                <div class="text-2xl font-black text-slate-900 font-mono">Skor 86 / 100</div>
                <p class="text-xs text-slate-500 mt-2 leading-relaxed">
                    Pembukuan Anda telah memenuhi syarat standar perbankan penyalur Kredit Usaha Rakyat (KUR) dan SIDT Kemenkop-UKM.
                </p>
            </div>

            <div class="pt-4 border-t border-slate-100">
                <div class="text-xs font-semibold text-slate-700">Akun Terhubung:</div>
                <div class="text-[11px] text-slate-400 font-mono mt-0.5">NMID-ID102008492019 (QRIS Aktif)</div>
            </div>
        </div>
    </div>
</div>
@endsection
