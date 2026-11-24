import { Transaction, GeneralLedgerAccount, TrialBalanceRow } from '../types';

/**
 * Generates official Indonesian SAK EMKM General Ledger Accounts (Buku Besar)
 * and Trial Balance (Neraca Saldo) from recorded transactions.
 */
export function buildGeneralLedger(transactions: Transaction[]): {
  accounts: GeneralLedgerAccount[];
  trialBalance: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
} {
  // Sort transactions chronologically
  const sortedTxs = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Initialize Standard Chart of Accounts (Bagan Akun Standar SAK EMKM)
  const kasTunai: GeneralLedgerAccount = {
    code: '1-1101',
    name: 'Kas di Tangan (Fisik Tunai Kasir)',
    category: 'Aset',
    normalBalance: 'debit',
    startingBalance: 850000,
    entries: [],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 850000,
  };

  const bankNonTunai: GeneralLedgerAccount = {
    code: '1-1102',
    name: 'Rekening Bank & Dompet Digital Usaha',
    category: 'Aset',
    normalBalance: 'debit',
    startingBalance: 2650000,
    entries: [],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 2650000,
  };

  const piutangUsaha: GeneralLedgerAccount = {
    code: '1-1201',
    name: 'Piutang Dagang & Kliring Transfer',
    category: 'Aset',
    normalBalance: 'debit',
    startingBalance: 0,
    entries: [],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };

  const persediaan: GeneralLedgerAccount = {
    code: '1-1301',
    name: 'Persediaan Bahan Baku & Barang Dagang',
    category: 'Aset',
    normalBalance: 'debit',
    startingBalance: 1850000,
    entries: [],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 1850000,
  };

  const peralatan: GeneralLedgerAccount = {
    code: '1-2101',
    name: 'Peralatan Usaha, Mesin POS & Showcase',
    category: 'Aset',
    normalBalance: 'debit',
    startingBalance: 14500000,
    entries: [],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 14500000,
  };

  const utangUsaha: GeneralLedgerAccount = {
    code: '2-1101',
    name: 'Utang Usaha ke Pemasok / Supplier',
    category: 'Kewajiban',
    normalBalance: 'credit',
    startingBalance: 650000,
    entries: [],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 650000,
  };

  const modalPemilik: GeneralLedgerAccount = {
    code: '3-1101',
    name: 'Modal Awal Disetor Pemilik',
    category: 'Ekuitas',
    normalBalance: 'credit',
    startingBalance: 19200000,
    entries: [],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 19200000,
  };

  const pendapatanNonTunai: GeneralLedgerAccount = {
    code: '4-1101',
    name: 'Pendapatan Penjualan Non-Tunai (Transfer & E-Wallet)',
    category: 'Pendapatan',
    normalBalance: 'credit',
    startingBalance: 0,
    entries: [],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };

  const pendapatanTunai: GeneralLedgerAccount = {
    code: '4-1102',
    name: 'Pendapatan Penjualan Tunai & Kasir POS',
    category: 'Pendapatan',
    normalBalance: 'credit',
    startingBalance: 0,
    entries: [],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };

  const hppBahan: GeneralLedgerAccount = {
    code: '5-1101',
    name: 'Beban Pokok Penjualan - Bahan Baku',
    category: 'Beban',
    normalBalance: 'debit',
    startingBalance: 0,
    entries: [],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };

  const bebanGaji: GeneralLedgerAccount = {
    code: '6-1101',
    name: 'Beban Gaji Karyawan',
    category: 'Beban',
    normalBalance: 'debit',
    startingBalance: 0,
    entries: [],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };

  const bebanUtilitas: GeneralLedgerAccount = {
    code: '6-1102',
    name: 'Beban Listrik, Air & Utilitas',
    category: 'Beban',
    normalBalance: 'debit',
    startingBalance: 0,
    entries: [],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };

  const bebanSewa: GeneralLedgerAccount = {
    code: '6-1103',
    name: 'Beban Sewa Tempat Usaha',
    category: 'Beban',
    normalBalance: 'debit',
    startingBalance: 0,
    entries: [],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };

  const bebanPromosi: GeneralLedgerAccount = {
    code: '6-1104',
    name: 'Beban Pemasaran & Promosi',
    category: 'Beban',
    normalBalance: 'debit',
    startingBalance: 0,
    entries: [],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };

  // Helper function to append entry to an account
  const postEntry = (
    acc: GeneralLedgerAccount,
    entry: {
      id: string;
      date: string;
      referenceNo: string;
      description: string;
      debit: number;
      credit: number;
    }
  ) => {
    acc.totalDebit += entry.debit;
    acc.totalCredit += entry.credit;

    if (acc.normalBalance === 'debit') {
      acc.endingBalance += entry.debit - entry.credit;
    } else {
      acc.endingBalance += entry.credit - entry.debit;
    }

    acc.entries.push({
      ...entry,
      balance: acc.endingBalance,
    });
  };

  // Process all transactions into double-entry ledger accounts
  sortedTxs.forEach((tx) => {
    const amt = Number(tx.amount || 0);
    const ref = tx.referenceNo || `TX-${tx.id}`;
    const desc = tx.description || 'Transaksi Usaha';
    const date = tx.date;

    if (tx.type === 'income') {
      const isNonCash =
        tx.paymentMethod === 'Transfer Bank' ||
        tx.paymentMethod === 'E-Wallet' ||
        tx.paymentMethod === 'Kartu' ||
        tx.paymentMethod === 'QRIS' ||
        tx.category === 'Penjualan Non-Tunai' ||
        tx.category === 'Penjualan Online';

      if (isNonCash) {
        postEntry(bankNonTunai, {
          id: `${tx.id}_dr`,
          date,
          referenceNo: ref,
          description: `Penerimaan Non-Tunai (${tx.paymentMethod || 'Transfer'}): ${desc}`,
          debit: amt,
          credit: 0,
        });

        postEntry(pendapatanNonTunai, {
          id: `${tx.id}_cr`,
          date,
          referenceNo: ref,
          description: `Penjualan Non-Tunai: ${desc}`,
          debit: 0,
          credit: amt,
        });
      } else {
        postEntry(kasTunai, {
          id: `${tx.id}_dr`,
          date,
          referenceNo: ref,
          description: `Penerimaan Kas Tunai: ${desc}`,
          debit: amt,
          credit: 0,
        });

        postEntry(pendapatanTunai, {
          id: `${tx.id}_cr`,
          date,
          referenceNo: ref,
          description: `Penjualan Tunai / Kasir POS: ${desc}`,
          debit: 0,
          credit: amt,
        });
      }
    } else {
      // Expense transactions
      const isCash = tx.paymentMethod === 'Tunai';
      const targetCashAcc = isCash ? kasTunai : bankNonTunai;

      postEntry(targetCashAcc, {
        id: `${tx.id}_cr`,
        date,
        referenceNo: ref,
        description: `Pengeluaran via ${tx.paymentMethod || 'Tunai'}: ${desc}`,
        debit: 0,
        credit: amt,
      });

      if (tx.category === 'Belanja Bahan Baku') {
        postEntry(hppBahan, {
          id: `${tx.id}_dr`,
          date,
          referenceNo: ref,
          description: `Beban HPP Bahan Baku: ${desc}`,
          debit: amt,
          credit: 0,
        });
      } else if (tx.category === 'Gaji Karyawan') {
        postEntry(bebanGaji, {
          id: `${tx.id}_dr`,
          date,
          referenceNo: ref,
          description: `Beban Gaji Karyawan: ${desc}`,
          debit: amt,
          credit: 0,
        });
      } else if (tx.category === 'Sewa Tempat & Listrik' || tx.category === 'Operasional') {
        if ((desc || '').toLowerCase().includes('sewa')) {
          postEntry(bebanSewa, {
            id: `${tx.id}_dr`,
            date,
            referenceNo: ref,
            description: `Beban Sewa Tempat: ${desc}`,
            debit: amt,
            credit: 0,
          });
        } else {
          postEntry(bebanUtilitas, {
            id: `${tx.id}_dr`,
            date,
            referenceNo: ref,
            description: `Beban Listrik & Utilitas: ${desc}`,
            debit: amt,
            credit: 0,
          });
        }
      } else if (tx.category === 'Pemasaran & Promosi') {
        postEntry(bebanPromosi, {
          id: `${tx.id}_dr`,
          date,
          referenceNo: ref,
          description: `Beban Pemasaran: ${desc}`,
          debit: amt,
          credit: 0,
        });
      } else {
        postEntry(bebanUtilitas, {
          id: `${tx.id}_dr`,
          date,
          referenceNo: ref,
          description: `Beban Operasional Lain: ${desc}`,
          debit: amt,
          credit: 0,
        });
      }
    }
  });

  const allAccounts: GeneralLedgerAccount[] = [
    kasTunai,
    bankNonTunai,
    piutangUsaha,
    persediaan,
    peralatan,
    utangUsaha,
    modalPemilik,
    pendapatanNonTunai,
    pendapatanTunai,
    hppBahan,
    bebanGaji,
    bebanUtilitas,
    bebanSewa,
    bebanPromosi,
  ];

  let totalDebitTB = 0;
  let totalCreditTB = 0;

  const trialBalance: TrialBalanceRow[] = allAccounts.map((acc) => {
    let debit = 0;
    let credit = 0;

    if (acc.normalBalance === 'debit') {
      debit = acc.endingBalance;
      totalDebitTB += debit;
    } else {
      credit = acc.endingBalance;
      totalCreditTB += credit;
    }

    return {
      code: acc.code,
      name: acc.name,
      category: acc.category,
      debit,
      credit,
    };
  });

  return {
    accounts: allAccounts,
    trialBalance,
    totalDebit: totalDebitTB,
    totalCredit: totalCreditTB,
  };
}
