import { Transaction, HealthMetric, User } from '../types';

/**
 * Utility to download structured professional financial statements in CSV format (Excel & Sheets compatible)
 */
export function downloadCsvReport(
  transactions: Transaction[],
  user: User,
  health: HealthMetric | null
) {
  const businessName = user.businessName || 'Usaha UMKM';
  const ownerName = user.fullName || 'Pemilik Usaha';
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Calculate totals
  let runningBalance = 0;
  const sortedTxs = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let totalIncome = 0;
  let totalExpense = 0;

  const rows = sortedTxs.map((t, idx) => {
    const isIncome = t.type === 'income';
    const incomeAmt = isIncome ? t.amount : 0;
    const expenseAmt = !isIncome ? t.amount : 0;
    totalIncome += incomeAmt;
    totalExpense += expenseAmt;
    runningBalance += isIncome ? t.amount : -t.amount;

    return [
      idx + 1,
      `"${t.date}"`,
      `"${t.referenceNo || '-'}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.category}"`,
      `"${t.paymentMethod}"`,
      `"${t.source.toUpperCase()}"`,
      incomeAmt,
      expenseAmt,
      runningBalance,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const netProfit = totalIncome - totalExpense;
  const netMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0';

  const csvHeader = [
    `"LAPORAN KEUANGAN & ARUS KAS USAHA UMKM - FINSIGHT"`,
    `"Nama Usaha: ${businessName}"`,
    `"Pemilik: ${ownerName} | NMID QRIS: ${user.qrisMerchantId || '-'}"`,
    `"Tanggal Cetak: ${currentDate}"`,
    `"Status Kesehatan FinSight: ${(health?.status || 'HIJAU').toUpperCase()} (Skor: ${health?.score || 92}/100 - ${health?.fundingReadinessLevel || 'Siap KUR'})"`,
    `""`,
    `"RINGKASAN EKSEKUTIF"`,
    `"Total Pemasukan","Rp ${totalIncome.toLocaleString('id-ID')}"`,
    `"Total Pengeluaran","Rp ${totalExpense.toLocaleString('id-ID')}"`,
    `"Laba Bersih Operasional","Rp ${netProfit.toLocaleString('id-ID')}"`,
    `"Margin Keuntungan","${netMargin}%"`,
    `""`,
    `"No","Tanggal","No Referensi","Keterangan Transaksi","Kategori","Metode Bayar","Sumber Input","Pemasukan (Debit)","Pengeluaran (Kredit)","Saldo Akumulasi","Catatan"`,
  ].join('\r\n');

  const csvContent = '\uFEFF' + csvHeader + '\r\n' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Laporan_Keuangan_FinSight_${businessName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formats IDR currency nicely
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
