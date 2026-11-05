export interface User {
  id: string;
  email: string;
  fullName: string;
  businessName: string;
  businessType: string;
  phone: string;
  city: string;
  qrisMerchantId: string;
  isVerified: boolean;
  role: 'owner' | 'staff';
  createdAt: string;
}

export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  | 'Penjualan QRIS'
  | 'Penjualan Tunai'
  | 'Penjualan Online'
  | 'Belanja Bahan Baku'
  | 'Operasional'
  | 'Gaji Karyawan'
  | 'Sewa Tempat & Listrik'
  | 'Pemasaran & Promosi'
  | 'Peralatan & Aset'
  | 'Lain-lain';

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  time?: string;
  description: string;
  category: TransactionCategory;
  type: TransactionType;
  amount: number;
  source: 'qris' | 'ocr_scan' | 'manual';
  paymentMethod: 'QRIS' | 'Tunai' | 'Transfer Bank' | 'Kartu';
  referenceNo: string;
  receiptImage?: string;
  items?: Array<{ name: string; qty: number; price: number; total: number }>;
  notes?: string;
  createdAt: string;
}

export interface QRISMutation {
  id: string;
  userId: string;
  timestamp: string;
  amount: number;
  customerName: string;
  issuer: 'GoPay' | 'OVO' | 'ShopeePay' | 'Dana' | 'BCA QRIS' | 'Mandiri Livin' | 'BRImo' | 'LinkAja' | 'Lainnya';
  rrn: string; // Retrieval Reference Number
  status: 'settled' | 'pending';
  syncedToLedger: boolean;
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
  type: 'income' | 'expense' | 'qris' | 'health_alert' | 'system' | 'report';
  amount?: number;
  isRead: boolean;
  createdAt: string;
}

export type HealthStatus = 'hijau' | 'kuning' | 'merah';

export interface HealthMetric {
  status: HealthStatus;
  score: number; // 0-100
  title: string;
  explanation: string;
  recommendation: string;
  netMargin: number; // percentage
  cashRunwayDays: number;
  qrisAdoptionRate: number; // percentage of revenue via QRIS
  cashflowStability: 'Stabil' | 'Moderat' | 'Fluktuatif';
  fundingReadinessLevel: 'Level 1 (Pemula)' | 'Level 2 (Berkembang)' | 'Level 3 (Siap KUR / Bankable)';
}

export interface CashflowForecast {
  period: string; // e.g. "Minggu Depan", "2 Minggu ke Depan"
  projectedIncome: number;
  projectedExpense: number;
  netProjectedCash: number;
  confidence: number;
  advice: string;
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
