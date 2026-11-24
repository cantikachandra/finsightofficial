export interface User {
  id: string;
  email: string;
  fullName: string;
  businessName: string;
  businessType: string;
  phone: string;
  city: string;
  isVerified: boolean;
  role: 'owner' | 'staff' | 'admin';
  createdAt: string;
  passwordHash?: string; // Disertakan khusus pada tampilan database Admin
  themePreference?: 'light' | 'dark';
}

export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  | 'Penjualan Kasir POS'
  | 'Penjualan Tunai'
  | 'Penjualan Non-Tunai'
  | 'Penjualan Online'
  | 'Belanja Bahan Baku'
  | 'Operasional'
  | 'Gaji Karyawan'
  | 'Sewa Tempat & Listrik'
  | 'Pemasaran & Promosi'
  | 'Peralatan & Aset'
  | 'Lain-lain';

export interface TransactionItem {
  productId?: string;
  name: string;
  qty: number;
  price: number;
  total: number;
}

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  time?: string;
  description: string;
  category: TransactionCategory | string;
  type: TransactionType;
  amount: number;
  source: 'pos' | 'ocr_scan' | 'manual' | string;
  paymentMethod: 'Tunai' | 'Transfer Bank' | 'E-Wallet' | 'Kartu' | string;
  referenceNo: string;
  receiptImage?: string;
  items?: TransactionItem[];
  cartItems?: TransactionItem[];
  notes?: string;
  createdAt: string;
}

export interface ProductItem {
  id: string;
  userId: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  unit: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'income' | 'expense' | 'health_alert' | 'system' | 'report' | 'pos';
  amount?: number;
  isRead: boolean;
  createdAt: string;
}

export type AnalysisPeriod = '1m' | '3m' | '6m' | '1y';

export type HealthStatus = 'hijau' | 'kuning' | 'merah';

export interface CashflowForecast {
  period: string;
  basisLabel?: string;
  projectedIncome: number;
  projectedExpense: number;
  netProjectedCash: number;
  confidence: number;
  advice: string;
}

export interface HealthMetric {
  status: HealthStatus;
  score: number; // 0-100
  title: string;
  explanation: string;
  recommendation: string;
  netMargin: number; // percentage
  cashRunwayDays: number;
  digitalAdoptionRate: number; // percentage of digital/non-tunai & POS revenue
  cashflowStability: 'Stabil' | 'Moderat' | 'Fluktuatif';
  fundingReadinessLevel: 'Level 1 (Pemula)' | 'Level 2 (Berkembang)' | 'Level 3 (Siap KUR / Bankable)';
  period?: AnalysisPeriod;
  periodLabel?: string;
  periodDays?: number;
  transactionCount?: number;
  periodIncome?: number;
  periodExpense?: number;
  periodNetProfit?: number;
  forecast?: CashflowForecast;
}

export interface IncomeStatement {
  period: string;
  revenue: {
    nonCash: number;
    cash: number;
    online: number;
    totalRevenue: number;
  };
  cogs: {
    rawMaterials: number;
    inventoryUsage: number;
    totalCogs: number;
  };
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: {
    utilities: number;
    salaries: number;
    rent: number;
    marketing: number;
    other: number;
    totalExpenses: number;
  };
  netOperatingIncome: number;
  netMargin: number;
}

export interface BalanceSheet {
  period: string;
  assets: {
    cashInHand: number;
    bankAndNonCash: number;
    accountsReceivable: number;
    inventory: number;
    equipment: number;
    totalAssets: number;
  };
  liabilities: {
    accountsPayable: number;
    accruedExpenses: number;
    totalLiabilities: number;
  };
  equity: {
    initialCapital: number;
    retainedEarnings: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export interface DailyCashLedgerRow {
  no: number;
  id: string;
  date: string;
  time: string;
  referenceNo: string;
  description: string;
  category: string;
  paymentMethod: string;
  type: TransactionType;
  incomeAmount: number;
  expenseAmount: number;
  runningBalance: number;
  source: string;
  notes?: string;
}

export interface EmailVerificationLog {
  id: string;
  email: string;
  code: string;
  purpose: 'registration' | 'password_reset';
  sentAt: string;
  expiresAt: string;
  isUsed: boolean;
}

// BUKU BESAR (GENERAL LEDGER) STANDAR SAK EMKM
export interface GeneralLedgerEntry {
  id: string;
  date: string;
  referenceNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface GeneralLedgerAccount {
  code: string;
  name: string;
  category: 'Aset' | 'Kewajiban' | 'Ekuitas' | 'Pendapatan' | 'Beban';
  normalBalance: 'debit' | 'credit';
  startingBalance: number;
  entries: GeneralLedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  endingBalance: number;
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  category: string;
  debit: number;
  credit: number;
}

// CHATBOT & ADMIN SUPPORT THREADS
export interface SupportChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'admin';
  senderName: string;
  text: string;
  isAi?: boolean;
  createdAt: string;
}

export interface SupportChatThread {
  id: string;
  userId?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  businessName?: string;
  topic: string;
  status: 'open' | 'escalated' | 'replied' | 'resolved';
  escalatedToAdmin: boolean;
  unreadByAdmin: boolean;
  messages: SupportChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserFinancialSummary {
  user: User;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  transactionCount: number;
  productCount: number;
  healthStatus: HealthStatus;
  healthScore: number;
  transactions: Transaction[];
  health: HealthMetric;
}
