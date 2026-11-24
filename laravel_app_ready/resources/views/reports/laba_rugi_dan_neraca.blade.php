@extends('layouts.app')

@section('title', 'Laporan Laba Rugi & Neraca Keuangan - FinSight UMKM')

@section('content')
<div class="space-y-6">
    <!-- Header Bar -->
    <div class="no-print bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <div class="flex items-center gap-2">
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                    Standar SAK EMKM &amp; Bank Indonesia
                </span>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Neraca Seimbang (Balanced)
                </span>
            </div>
            <h1 class="text-xl font-black text-slate-900 mt-2">Laporan Keuangan &amp; Buku Kas Harian</h1>
            <p class="text-xs text-slate-500 mt-0.5">
                {{ $user->business_name ?? 'Usaha Mandiri (Anonymous)' }} &bull; Periode: {{ date('F Y') }}
            </p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
            <!-- Unduh Excel -->
            <a
                href="/reports/export-excel"
                class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
                <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Unduh Excel (.XLSX)
            </a>

            <!-- Cetak PDF -->
            <button
                onclick="window.print()"
                class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                Cetak / Simpan PDF
            </button>
        </div>
    </div>

    <!-- TABEL 1: LAPORAN LABA RUGI (INCOME STATEMENT) -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
                <h3 class="font-black text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    1. Laporan Laba Rugi Operasional (Income Statement)
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">Memantau keuntungan kotor, beban operasional, dan laba bersih</p>
            </div>
            <span class="font-mono font-bold text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Net Margin: {{ $incomeStatement->net_margin }}%
            </span>
        </div>

        <div class="p-5">
            <div class="space-y-4">
                <!-- Pendapatan -->
                <div>
                    <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">A. Pendapatan Penjualan (Revenue)</div>
                    <div class="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                        <div class="p-2.5 flex justify-between">
                            <span class="text-slate-600">Pendapatan Mutasi QRIS (Otomatis Bank)</span>
                            <span class="font-mono font-semibold text-slate-800">Rp {{ number_format($incomeStatement->qris_revenue, 0, ',', '.') }}</span>
                        </div>
                        <div class="p-2.5 flex justify-between">
                            <span class="text-slate-600">Pendapatan Tunai Kasir</span>
                            <span class="font-mono font-semibold text-slate-800">Rp {{ number_format($incomeStatement->cash_revenue, 0, ',', '.') }}</span>
                        </div>
                        <div class="p-2.5 bg-blue-50/50 flex justify-between font-bold text-blue-900">
                            <span>TOTAL PENDAPATAN (OMZET)</span>
                            <span class="font-mono">Rp {{ number_format($incomeStatement->total_revenue, 0, ',', '.') }}</span>
                        </div>
                    </div>
                </div>

                <!-- HPP -->
                <div>
                    <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">B. Beban Pokok Penjualan (HPP / COGS)</div>
                    <div class="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                        <div class="p-2.5 flex justify-between">
                            <span class="text-slate-600">Belanja Bahan Baku &amp; Persediaan (Hasil Scan Nota)</span>
                            <span class="font-mono font-semibold text-rose-600">Rp {{ number_format($incomeStatement->raw_materials_cogs, 0, ',', '.') }}</span>
                        </div>
                        <div class="p-2.5 bg-slate-50 flex justify-between font-bold text-slate-800">
                            <span>TOTAL BEBAN POKOK PENJUALAN</span>
                            <span class="font-mono text-rose-600">Rp {{ number_format($incomeStatement->total_cogs, 0, ',', '.') }}</span>
                        </div>
                    </div>
                </div>

                <!-- Laba Kotor -->
                <div class="p-3 rounded-xl bg-blue-50 border border-blue-100 flex justify-between items-center text-xs font-bold text-blue-950">
                    <span>LABA KOTOR (GROSS PROFIT)</span>
                    <span class="font-mono text-base">Rp {{ number_format($incomeStatement->gross_profit, 0, ',', '.') }} (Margin: {{ $incomeStatement->gross_margin }}%)</span>
                </div>

                <!-- Beban Operasional -->
                <div>
                    <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">C. Beban Operasional (OPEX)</div>
                    <div class="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                        <div class="p-2.5 flex justify-between">
                            <span class="text-slate-600">Beban Listrik, Air &amp; Utilitas</span>
                            <span class="font-mono font-semibold text-slate-800">Rp {{ number_format($incomeStatement->utilities_exp, 0, ',', '.') }}</span>
                        </div>
                        <div class="p-2.5 flex justify-between">
                            <span class="text-slate-600">Beban Gaji Karyawan</span>
                            <span class="font-mono font-semibold text-slate-800">Rp {{ number_format($incomeStatement->salaries_exp, 0, ',', '.') }}</span>
                        </div>
                        <div class="p-2.5 flex justify-between">
                            <span class="text-slate-600">Beban Sewa Tempat</span>
                            <span class="font-mono font-semibold text-slate-800">Rp {{ number_format($incomeStatement->rent_exp, 0, ',', '.') }}</span>
                        </div>
                        <div class="p-2.5 bg-rose-50/50 flex justify-between font-bold text-rose-900">
                            <span>TOTAL BEBAN OPERASIONAL</span>
                            <span class="font-mono">Rp {{ number_format($incomeStatement->total_operating_expenses, 0, ',', '.') }}</span>
                        </div>
                    </div>
                </div>

                <!-- Laba Bersih -->
                <div class="p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center text-xs font-bold shadow-md">
                    <div>
                        <div class="text-blue-100 text-[10px] uppercase tracking-wider">Hasil Akhir Laba Rugi</div>
                        <div class="text-sm font-black">LABA BERSIH OPERASIONAL (NET PROFIT)</div>
                    </div>
                    <span class="font-mono text-xl font-black">Rp {{ number_format($incomeStatement->net_operating_income, 0, ',', '.') }}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- TABEL 2: NERACA (LAPORAN POSISI KEUANGAN) -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
                <h3 class="font-black text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    2. Neraca Keuangan (Laporan Posisi Keuangan - SAK EMKM)
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">Kondisi riil aset, kewajiban (utang), dan modal bersih pemilik</p>
            </div>
            <span class="font-mono font-bold text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                ASET = KEWAJIBAN + EKUITAS
            </span>
        </div>

        <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Kolom Aktiva (Aset) -->
            <div class="space-y-3">
                <div class="font-bold text-xs text-slate-700 uppercase tracking-wider border-b pb-2">Aset (Harta Usaha)</div>
                <div class="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                    <div class="p-2.5 flex justify-between">
                        <span class="text-slate-600">Kas di Tangan (Fisik Tunai)</span>
                        <span class="font-mono font-semibold text-slate-800">Rp {{ number_format($balanceSheet->cash_in_hand, 0, ',', '.') }}</span>
                    </div>
                    <div class="p-2.5 flex justify-between">
                        <span class="text-slate-600">Bank &amp; Saldo QRIS Merchant</span>
                        <span class="font-mono font-semibold text-slate-800">Rp {{ number_format($balanceSheet->bank_and_qris, 0, ',', '.') }}</span>
                    </div>
                    <div class="p-2.5 flex justify-between">
                        <span class="text-slate-600">Piutang QRIS (Settlement Berjalan)</span>
                        <span class="font-mono font-semibold text-slate-800">Rp {{ number_format($balanceSheet->accounts_receivable, 0, ',', '.') }}</span>
                    </div>
                    <div class="p-2.5 flex justify-between">
                        <span class="text-slate-600">Persediaan Produk &amp; Bahan Baku</span>
                        <span class="font-mono font-semibold text-slate-800">Rp {{ number_format($balanceSheet->inventory_value, 0, ',', '.') }}</span>
                    </div>
                    <div class="p-2.5 flex justify-between">
                        <span class="text-slate-600">Peralatan, Mesin POS &amp; Showcase</span>
                        <span class="font-mono font-semibold text-slate-800">Rp {{ number_format($balanceSheet->equipment_value, 0, ',', '.') }}</span>
                    </div>
                    <div class="p-3 bg-emerald-50/70 flex justify-between font-bold text-emerald-950">
                        <span>TOTAL ASET (AKTIVA)</span>
                        <span class="font-mono text-sm">Rp {{ number_format($balanceSheet->total_assets, 0, ',', '.') }}</span>
                    </div>
                </div>
            </div>

            <!-- Kolom Pasiva (Kewajiban & Ekuitas) -->
            <div class="space-y-3">
                <div class="font-bold text-xs text-slate-700 uppercase tracking-wider border-b pb-2">Kewajiban &amp; Ekuitas (Pasiva)</div>
                <div class="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                    <div class="p-2.5 flex justify-between">
                        <span class="text-slate-600">Utang Usaha ke Pemasok / Supplier</span>
                        <span class="font-mono font-semibold text-slate-800">Rp {{ number_format($balanceSheet->accounts_payable, 0, ',', '.') }}</span>
                    </div>
                    <div class="p-2.5 flex justify-between">
                        <span class="text-slate-600">Beban Akrual Terutang (Gaji/Sewa)</span>
                        <span class="font-mono font-semibold text-slate-800">Rp {{ number_format($balanceSheet->accrued_expenses, 0, ',', '.') }}</span>
                    </div>
                    <div class="p-2.5 bg-slate-50 flex justify-between font-semibold text-slate-800">
                        <span>Total Liabilitas (Utang)</span>
                        <span class="font-mono">Rp {{ number_format($balanceSheet->total_liabilities, 0, ',', '.') }}</span>
                    </div>
                    <div class="p-2.5 flex justify-between">
                        <span class="text-slate-600">Modal Bersih Awal Pemilik</span>
                        <span class="font-mono font-semibold text-slate-800">Rp {{ number_format($balanceSheet->initial_capital, 0, ',', '.') }}</span>
                    </div>
                    <div class="p-2.5 flex justify-between">
                        <span class="text-slate-600">Laba Ditahan (Retained Earnings)</span>
                        <span class="font-mono font-semibold text-emerald-700">Rp {{ number_format($balanceSheet->retained_earnings, 0, ',', '.') }}</span>
                    </div>
                    <div class="p-3 bg-emerald-50/70 flex justify-between font-bold text-emerald-950">
                        <span>TOTAL LIABILITAS &amp; EKUITAS</span>
                        <span class="font-mono text-sm">Rp {{ number_format($balanceSheet->total_liabilities_and_equity, 0, ',', '.') }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- TABEL 3: BUKU BESAR PENDAPATAN DAN KAS HARIAN -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
                <h3 class="font-black text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    3. Tabel Pendapatan dan Kas Harian (Buku Besar)
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">Pencatatan setiap arus masuk/keluar dengan saldo berjalan (Running Balance)</p>
            </div>
            <span class="text-xs font-bold text-slate-500">
                Total {{ count($calculatedLedgers) }} Transaksi
            </span>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                        <th class="py-3 px-3">No</th>
                        <th class="py-3 px-3">Tanggal &amp; Jam</th>
                        <th class="py-3 px-3">No Referensi</th>
                        <th class="py-3 px-4">Keterangan Transaksi</th>
                        <th class="py-3 px-3">Kategori</th>
                        <th class="py-3 px-3">Metode</th>
                        <th class="py-3 px-3 text-right">Debit (Masuk)</th>
                        <th class="py-3 px-3 text-right">Kredit (Keluar)</th>
                        <th class="py-3 px-4 text-right">Saldo Kas</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    @forelse($calculatedLedgers as $row)
                        <tr class="hover:bg-slate-50/60">
                            <td class="py-2.5 px-3 text-slate-400 font-mono">{{ $row->no }}</td>
                            <td class="py-2.5 px-3 whitespace-nowrap text-slate-600">
                                {{ $row->date }} <span class="text-[10px] text-slate-400">{{ $row->time }}</span>
                            </td>
                            <td class="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {{ $row->reference_no }}
                            </td>
                            <td class="py-2.5 px-4 font-semibold text-slate-800 max-w-xs">
                                {{ $row->description }}
                            </td>
                            <td class="py-2.5 px-3">
                                <span class="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium text-slate-700">
                                    {{ $row->category }}
                                </span>
                            </td>
                            <td class="py-2.5 px-3 text-slate-600">{{ $row->payment_method }}</td>
                            <td class="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                                {{ $row->income > 0 ? '+Rp ' . number_format($row->income, 0, ',', '.') : '-' }}
                            </td>
                            <td class="py-2.5 px-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                                {{ $row->expense > 0 ? '-Rp ' . number_format($row->expense, 0, ',', '.') : '-' }}
                            </td>
                            <td class="py-2.5 px-4 text-right font-mono font-black text-blue-900 whitespace-nowrap">
                                Rp {{ number_format($row->running_balance, 0, ',', '.') }}
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="9" class="py-8 text-center text-slate-400">Belum ada transaksi di buku kas.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
