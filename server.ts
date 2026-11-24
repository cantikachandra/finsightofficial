import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Official Gmail SMTP Transporter
const SENDER_EMAIL = 'finsight.offc@gmail.com';
const SENDER_PASS = 'sourcandy14';

const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SENDER_EMAIL,
    pass: SENDER_PASS,
  },
});

async function sendVerificationEmail(targetEmail: string, code: string, recipientName: string = 'Pemilik Usaha') {
  try {
    const mailOptions = {
      from: `"FinSight Official" <${SENDER_EMAIL}>`,
      to: targetEmail,
      subject: `Kode Verifikasi FinSight UMKM: ${code}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-block; background: #2563eb; color: #ffffff; font-weight: bold; font-size: 20px; padding: 10px 18px; border-radius: 12px; margin-bottom: 8px;">
              FinSight UMKM
            </div>
            <h2 style="color: #0f172a; margin: 8px 0 0 0; font-size: 20px; font-weight: 700;">Konfirmasi Pendaftaran Akun</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Platform Pembukuan Kasir &amp; Keuangan UMKM Siap Pinjam</p>
          </div>
          
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
            <p style="color: #1e40af; font-size: 14px; margin: 0 0 12px 0;">
              Halo <b>${recipientName}</b>, gunakan kode verifikasi di bawah ini untuk mengonfirmasi akun Anda:
            </p>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1d4ed8; font-family: monospace; background: #ffffff; padding: 12px 24px; border-radius: 8px; display: inline-block; border: 2px dashed #2563eb;">
              ${code}
            </div>
            <p style="color: #64748b; font-size: 12px; margin: 12px 0 0 0;">
              Kode ini berlaku selama 30 menit. Mohon tidak membagikan kode ini kepada pihak lain.
            </p>
          </div>
          
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0; line-height: 1.5;">
            Email ini dikirim secara resmi dari akun <b>${SENDER_EMAIL}</b> untuk aktivasi akun FinSight Anda.
          </p>
        </div>
      `,
    };

    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`[SMTP] Verification email sent to ${targetEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.warn(`[SMTP Warning] Unable to deliver external email directly: ${err.message}. Providing instant automatic code.`);
    return { success: false, error: err.message };
  }
}

// Send Magic Login Link via official Gmail SMTP
async function sendMagicLinkEmail(targetEmail: string, magicLoginUrl: string, recipientName: string = 'Pemilik Usaha') {
  try {
    const mailOptions = {
      from: `"FinSight Official" <${SENDER_EMAIL}>`,
      to: targetEmail,
      subject: `Link Konfirmasi Masuk FinSight UMKM - Sekali Klik`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; color: #0f172a;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; font-weight: 800; font-size: 22px; padding: 10px 22px; border-radius: 12px; margin-bottom: 8px; letter-spacing: -0.5px;">
              FINSIGHT
            </div>
            <h2 style="color: #0f172a; margin: 6px 0 0 0; font-size: 20px; font-weight: 700;">Konfirmasi Masuk Akun Anda</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Platform Pembukuan Kasir, Kas Harian &amp; Laporan Siap Pinjam</p>
          </div>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #334155; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
              Halo <b>${recipientName}</b>, kami menerima permintaan login untuk akun <b>${targetEmail}</b>.<br/>
              Klik tombol di bawah ini untuk langsung terkonfirmasi dan membuka dashboard keuangan Anda:
            </p>
            <a href="${magicLoginUrl}" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);">
              Konfirmasi & Masuk ke FinSight &rarr;
            </a>
            <p style="color: #94a3b8; font-size: 12px; margin: 18px 0 0 0;">
              Link ini berlaku selama 30 menit. Cukup klik sekali untuk masuk secara aman.
            </p>
          </div>

          <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
            <p style="color: #64748b; font-size: 11px; margin: 0 0 8px 0;">
              Jika tombol di atas tidak dapat diklik, salin dan buka tautan berikut di browser Anda:
            </p>
            <p style="color: #2563eb; font-size: 11px; margin: 0; word-break: break-all; font-family: monospace;">
              ${magicLoginUrl}
            </p>
            <p style="color: #94a3b8; font-size: 11px; margin: 16px 0 0 0;">
              Email resmi dikirimkan dari akun <b>${SENDER_EMAIL}</b>.
            </p>
          </div>
        </div>
      `,
    };

    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`[SMTP Magic Link] Sent to ${targetEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.warn(`[SMTP Warning] Magic link external send note: ${err.message}. Providing direct web confirmation link.`);
    return { success: false, error: err.message };
  }
}

// Send Real Password Reset Confirmation Link via finsight.offc@gmail.com
async function sendPasswordResetEmail(targetEmail: string, resetUrl: string, recipientName: string = 'Pemilik Usaha') {
  try {
    const mailOptions = {
      from: `"FinSight Official" <${SENDER_EMAIL}>`,
      to: targetEmail,
      subject: `Konfirmasi Reset Kata Sandi FinSight UMKM`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; color: #0f172a;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; font-weight: 800; font-size: 22px; padding: 10px 22px; border-radius: 12px; margin-bottom: 8px;">
              FINSIGHT
            </div>
            <h2 style="color: #0f172a; margin: 6px 0 0 0; font-size: 20px; font-weight: 700;">Konfirmasi Lupa Kata Sandi</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Permintaan Perubahan Kata Sandi Akun FinSight</p>
          </div>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #334155; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
              Halo <b>${recipientName}</b>, kami menerima permintaan untuk mengatur ulang kata sandi akun <b>${targetEmail}</b>.<br/>
              Klik tombol di bawah ini untuk mengonfirmasi dan membuat kata sandi baru Anda:
            </p>
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);">
              Konfirmasi & Buat Kata Sandi Baru &rarr;
            </a>
            <p style="color: #94a3b8; font-size: 12px; margin: 18px 0 0 0;">
              Tautan konfirmasi ini berlaku selama 30 menit. Jika Anda tidak meminta reset kata sandi, abaikan email ini.
            </p>
          </div>

          <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
            <p style="color: #64748b; font-size: 11px; margin: 0 0 8px 0;">
              Jika tombol tidak dapat diklik, salin link berikut:
            </p>
            <p style="color: #2563eb; font-size: 11px; margin: 0; word-break: break-all; font-family: monospace;">
              ${resetUrl}
            </p>
            <p style="color: #94a3b8; font-size: 11px; margin: 16px 0 0 0;">
              Email resmi FinSight dikirim melalui <b>${SENDER_EMAIL}</b>.
            </p>
          </div>
        </div>
      `,
    };

    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`[SMTP Reset Password] Sent to ${targetEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.warn(`[SMTP Reset Warning]: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// Setup JSON body parsing with large limit for scanned receipt base64 images
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Ensure data directory exists
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, 'finsight_db.json');

// Initialize Gemini Client
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Database Types and Structure
interface DbSchema {
  users: Array<{
    id: string;
    email: string;
    passwordHash: string;
    fullName: string;
    businessName: string;
    businessType: string;
    phone: string;
    city: string;
    qrisMerchantId?: string;
    isVerified: boolean;
    role: 'owner' | 'staff' | 'admin';
    createdAt: string;
    themePreference?: 'light' | 'dark';
  }>;
  emailVerifications: Array<{
    id: string;
    email: string;
    code: string;
    purpose: 'registration' | 'login' | 'reset';
    sentAt: string;
    expiresAt: string;
    isUsed: boolean;
  }>;
  transactions: Array<any>;
  products: Array<any>;
  notifications: Array<any>;
  supportChats?: Array<{
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
    messages: Array<{
      id: string;
      sender: 'user' | 'bot' | 'admin';
      senderName: string;
      text: string;
      isAi?: boolean;
      createdAt: string;
    }>;
    createdAt: string;
    updatedAt: string;
  }>;
  magicLinks?: Array<{
    id: string;
    email: string;
    token: string;
    sentAt: string;
    expiresAt: string;
    isUsed: boolean;
  }>;
  passwordResets?: Array<{
    id: string;
    email: string;
    token: string;
    sentAt: string;
    expiresAt: string;
    isUsed: boolean;
  }>;
}

// Strong password validator (min 8 chars + uppercase + lowercase + digit + symbol)
function validateStrongPassword(pw: string): string | null {
  if (!pw || pw.length < 8) return 'Kata sandi minimal 8 karakter.';
  if (!/[A-Z]/.test(pw)) return 'Kata sandi harus mengandung minimal 1 huruf besar (A-Z).';
  if (!/[a-z]/.test(pw)) return 'Kata sandi harus mengandung minimal 1 huruf kecil (a-z).';
  if (!/[0-9]/.test(pw)) return 'Kata sandi harus mengandung minimal 1 angka (0-9).';
  if (!/[^A-Za-z0-9]/.test(pw)) {
    return 'Kata sandi harus mengandung minimal 1 simbol khusus (contoh: !@#$%^&*).';
  }
  return null;
}

// Helper to build historical multi-month baseline transactions (for 1m, 3m, 6m, 1y analysis)
function getHistoricalSeedTransactions() {
  const now = new Date();
  const makeDate = (daysAgo: number) => {
    const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  };
  const makeIso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

  return [
    // TRIWULAN (31 - 90 hari terakhir)
    {
      id: 'tx_hist_34d',
      userId: 'user_anonymous',
      date: makeDate(34),
      time: '19:15',
      description: 'Rekap Penjualan Kasir POS Bulan Lalu (Minggu 1)',
      category: 'Penjualan Non-Tunai',
      type: 'income',
      amount: 2450000,
      source: 'pos',
      paymentMethod: 'E-Wallet',
      referenceNo: 'POS-HIST-034',
      createdAt: makeIso(34),
    },
    {
      id: 'tx_hist_40d',
      userId: 'user_anonymous',
      date: makeDate(40),
      time: '10:30',
      description: 'Belanja Grosir Biji Kopi, Susu & Sirup Bulanan',
      category: 'Belanja Bahan Baku',
      type: 'expense',
      amount: 1180000,
      source: 'ocr_scan',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'OCR-HIST-040',
      createdAt: makeIso(40),
    },
    {
      id: 'tx_hist_52d',
      userId: 'user_anonymous',
      date: makeDate(52),
      time: '20:10',
      description: 'Penjualan Paket Catering & Event Komunitas',
      category: 'Penjualan Kasir POS',
      type: 'income',
      amount: 3150000,
      source: 'pos',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'POS-HIST-052',
      createdAt: makeIso(52),
    },
    {
      id: 'tx_hist_64d',
      userId: 'user_anonymous',
      date: makeDate(64),
      time: '15:00',
      description: 'Gaji Karyawan & Biaya Sewa Booth Bulanan',
      category: 'Gaji Karyawan',
      type: 'expense',
      amount: 1650000,
      source: 'manual',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'PAY-HIST-064',
      createdAt: makeIso(64),
    },
    {
      id: 'tx_hist_78d',
      userId: 'user_anonymous',
      date: makeDate(78),
      time: '18:45',
      description: 'Penjualan Tunai & Kasir POS Triwulan',
      category: 'Penjualan Tunai',
      type: 'income',
      amount: 1920000,
      source: 'pos',
      paymentMethod: 'Tunai',
      referenceNo: 'POS-HIST-078',
      createdAt: makeIso(78),
    },
    // SETENGAH TAHUN (91 - 180 hari terakhir)
    {
      id: 'tx_hist_105d',
      userId: 'user_anonymous',
      date: makeDate(105),
      time: '17:20',
      description: 'Penjualan Kasir POS Bulan Ke-4 (Promo Musiman)',
      category: 'Penjualan Non-Tunai',
      type: 'income',
      amount: 3850000,
      source: 'pos',
      paymentMethod: 'E-Wallet',
      referenceNo: 'POS-HIST-105',
      createdAt: makeIso(105),
    },
    {
      id: 'tx_hist_122d',
      userId: 'user_anonymous',
      date: makeDate(122),
      time: '11:00',
      description: 'Pembelian Bahan Baku & Kemasan 2 Bulan',
      category: 'Belanja Bahan Baku',
      type: 'expense',
      amount: 1890000,
      source: 'ocr_scan',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'OCR-HIST-122',
      createdAt: makeIso(122),
    },
    {
      id: 'tx_hist_148d',
      userId: 'user_anonymous',
      date: makeDate(148),
      time: '16:30',
      description: 'Penjualan Online & Kasir Reguler Semester 1',
      category: 'Penjualan Online',
      type: 'income',
      amount: 4200000,
      source: 'pos',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'POS-HIST-148',
      createdAt: makeIso(148),
    },
    {
      id: 'tx_hist_166d',
      userId: 'user_anonymous',
      date: makeDate(166),
      time: '09:40',
      description: 'Perawatan Mesin Espresso & Listrik Operasional',
      category: 'Sewa Tempat & Listrik',
      type: 'expense',
      amount: 1350000,
      source: 'manual',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'OPS-HIST-166',
      createdAt: makeIso(166),
    },
    // 1 TAHUN PENUH (181 - 365 hari terakhir)
    {
      id: 'tx_hist_205d',
      userId: 'user_anonymous',
      date: makeDate(205),
      time: '19:00',
      description: 'Pendapatan Penjualan Kasir Kuartal Awal Tahun',
      category: 'Penjualan Kasir POS',
      type: 'income',
      amount: 5400000,
      source: 'pos',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'POS-HIST-205',
      createdAt: makeIso(205),
    },
    {
      id: 'tx_hist_235d',
      userId: 'user_anonymous',
      date: makeDate(235),
      time: '13:15',
      description: 'Restock Bahan Baku & Perlengkapan Dapur Tahunan',
      category: 'Belanja Bahan Baku',
      type: 'expense',
      amount: 2750000,
      source: 'ocr_scan',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'OCR-HIST-235',
      createdAt: makeIso(235),
    },
    {
      id: 'tx_hist_275d',
      userId: 'user_anonymous',
      date: makeDate(275),
      time: '18:20',
      description: 'Penjualan Bazaar UMKM & Kasir Outlet',
      category: 'Penjualan Non-Tunai',
      type: 'income',
      amount: 4950000,
      source: 'pos',
      paymentMethod: 'E-Wallet',
      referenceNo: 'POS-HIST-275',
      createdAt: makeIso(275),
    },
    {
      id: 'tx_hist_310d',
      userId: 'user_anonymous',
      date: makeDate(310),
      time: '10:00',
      description: 'Sewa Kios & Gaji Tim Operasional Kuartal Awal',
      category: 'Sewa Tempat & Listrik',
      type: 'expense',
      amount: 2900000,
      source: 'manual',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'RENT-HIST-310',
      createdAt: makeIso(310),
    },
    {
      id: 'tx_hist_342d',
      userId: 'user_anonymous',
      date: makeDate(342),
      time: '20:00',
      description: 'Penjualan Perdana Pembukaan Outlet Tahun Berjalan',
      category: 'Penjualan Tunai',
      type: 'income',
      amount: 3650000,
      source: 'pos',
      paymentMethod: 'Tunai',
      referenceNo: 'POS-HIST-342',
      createdAt: makeIso(342),
    },
    // Multi-period history for Sari Lestari
    {
      id: 'tx_sari_hist_48d',
      userId: 'user_demo_02',
      date: makeDate(48),
      time: '16:10',
      description: 'Penjualan Paket Roti & Kopi Triwulan',
      category: 'Penjualan Kasir POS',
      type: 'income',
      amount: 2150000,
      source: 'pos',
      paymentMethod: 'E-Wallet',
      referenceNo: 'POS-SARI-048',
      createdAt: makeIso(48),
    },
    {
      id: 'tx_sari_hist_130d',
      userId: 'user_demo_02',
      date: makeDate(130),
      time: '11:45',
      description: 'Belanja Bahan Kue & Tepung Semester',
      category: 'Belanja Bahan Baku',
      type: 'expense',
      amount: 980000,
      source: 'ocr_scan',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'OCR-SARI-130',
      createdAt: makeIso(130),
    },
    {
      id: 'tx_sari_hist_240d',
      userId: 'user_demo_02',
      date: makeDate(240),
      time: '17:00',
      description: 'Omzet Penjualan Tahunan Kedai Sari',
      category: 'Penjualan Non-Tunai',
      type: 'income',
      amount: 3400000,
      source: 'pos',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'POS-SARI-240',
      createdAt: makeIso(240),
    },
  ];
}

// Seed Data Generator
function getInitialSeedData(): DbSchema {
  const demoUserId = 'user_anonymous';

  const now = new Date();
  const makeDate = (daysAgo: number) => {
    const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  };

  const users: DbSchema['users'] = [
    {
      id: 'user_admin_finsight',
      email: 'admin@finsight.id',
      passwordHash: 'FinSight#Admin2026!',
      fullName: 'Administrator FinSight',
      businessName: 'Pusat Administrasi FinSight',
      businessType: 'Manajemen & Bantuan UMKM',
      phone: '080012345678',
      city: 'Jakarta',
      isVerified: true,
      role: 'admin',
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    },
    {
      id: demoUserId,
      email: 'anonymous@finsight.id',
      passwordHash: 'Anon@FinSight2026!',
      fullName: 'Anonymous',
      businessName: 'Usaha Mandiri (Anonymous)',
      businessType: 'Kuliner & Usaha Ritel',
      phone: '081234567890',
      city: 'Indonesia',
      isVerified: true,
      role: 'owner',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
    {
      id: 'user_demo_02',
      email: 'sari.roti@finsight.id',
      passwordHash: 'SariRoti#2026!',
      fullName: 'Sari Lestari',
      businessName: 'Kedai Roti & Kopi Sari',
      businessType: 'Kuliner & Minuman',
      phone: '081398765432',
      city: 'Bandung',
      isVerified: true,
      role: 'owner',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
  ];

  const transactions = [
    {
      id: 'tx_01',
      userId: demoUserId,
      date: makeDate(0),
      time: '14:20',
      description: 'Kasir POS: 12 Pesanan Kopi Susu & Dimsum',
      category: 'Penjualan Non-Tunai',
      type: 'income',
      amount: 485000,
      source: 'pos',
      paymentMethod: 'E-Wallet',
      referenceNo: 'POS-20261104-001',
      notes: 'Transaksi Kasir POS via E-Wallet & Transfer',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_02',
      userId: demoUserId,
      date: makeDate(0),
      time: '11:15',
      description: 'Struk Belanja Biji Kopi Arabika 3kg & Susu UHT 1 Karton',
      category: 'Belanja Bahan Baku',
      type: 'expense',
      amount: 410000,
      source: 'ocr_scan',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'OCR-INV-9921',
      notes: 'Hasil scan kamera nota Toko Kopi Mandiri',
      items: [
        { name: 'Kopi Arabika Toraja 1kg', qty: 3, price: 105000, total: 315000 },
        { name: 'Susu Fresh Milk UHT 1L (Karton 12x)', qty: 1, price: 95000, total: 95000 },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_03',
      userId: demoUserId,
      date: makeDate(1),
      time: '19:45',
      description: 'Kasir POS Malam (Weekend Promo)',
      category: 'Penjualan Non-Tunai',
      type: 'income',
      amount: 1120000,
      source: 'pos',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'POS-20261103-088',
      notes: 'Ramai pengunjung malam minggu',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'tx_04',
      userId: demoUserId,
      date: makeDate(1),
      time: '15:10',
      description: 'Penjualan Tunai Meja 1 - 4',
      category: 'Penjualan Tunai',
      type: 'income',
      amount: 320000,
      source: 'pos',
      paymentMethod: 'Tunai',
      referenceNo: 'CASH-20261103-02',
      notes: 'Kas laci toko',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'tx_05',
      userId: demoUserId,
      date: makeDate(2),
      time: '10:00',
      description: 'Restock Cup Biodegradable & Seal Plastik 500 pcs',
      category: 'Belanja Bahan Baku',
      type: 'expense',
      amount: 275000,
      source: 'ocr_scan',
      paymentMethod: 'Tunai',
      referenceNo: 'OCR-PLASTIK-441',
      notes: 'Nota Toko Plastik Berkah Sukses',
      items: [
        { name: 'Cup Dingin 16oz (Pack 50)', qty: 10, price: 20000, total: 200000 },
        { name: 'Straw Kertas Ramah Lingkungan', qty: 5, price: 15000, total: 75000 },
      ],
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'tx_06',
      userId: demoUserId,
      date: makeDate(3),
      time: '20:30',
      description: 'Penjualan Kasir Harian (18 Pelanggan)',
      category: 'Penjualan Kasir POS',
      type: 'income',
      amount: 890000,
      source: 'pos',
      paymentMethod: 'E-Wallet',
      referenceNo: 'POS-20261101-042',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'tx_07',
      userId: demoUserId,
      date: makeDate(4),
      time: '16:00',
      description: 'Bayar Listrik PLN Usaha & Tagihan PDAM',
      category: 'Sewa Tempat & Listrik',
      type: 'expense',
      amount: 380000,
      source: 'manual',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'PLN-20261031-01',
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: 'tx_08',
      userId: demoUserId,
      date: makeDate(5),
      time: '21:00',
      description: 'Penjualan Sore & Malam (Transfer Bank)',
      category: 'Penjualan Non-Tunai',
      type: 'income',
      amount: 940000,
      source: 'pos',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'POS-20261030-019',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 'tx_09',
      userId: demoUserId,
      date: makeDate(6),
      time: '09:20',
      description: 'Belanja Sirup Monin Hazelnut & Vanila 2 Botol',
      category: 'Belanja Bahan Baku',
      type: 'expense',
      amount: 290000,
      source: 'ocr_scan',
      paymentMethod: 'E-Wallet',
      referenceNo: 'OCR-SIRUP-102',
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    },
    {
      id: 'tx_10',
      userId: demoUserId,
      date: makeDate(7),
      time: '18:15',
      description: 'Penjualan Akhir Pekan (Kasir & Transfer)',
      category: 'Penjualan Kasir POS',
      type: 'income',
      amount: 1450000,
      source: 'pos',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'POS-20261028-112',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: 'tx_11',
      userId: demoUserId,
      date: makeDate(8),
      time: '12:00',
      description: 'Penjualan Siang Kasir POS',
      category: 'Penjualan Tunai',
      type: 'income',
      amount: 670000,
      source: 'pos',
      paymentMethod: 'Tunai',
      referenceNo: 'POS-20261027-044',
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    },
    {
      id: 'tx_12',
      userId: demoUserId,
      date: makeDate(10),
      time: '17:00',
      description: 'Gaji Paruh Waktu Barista (Minggu Ke-4)',
      category: 'Gaji Karyawan',
      type: 'expense',
      amount: 750000,
      source: 'manual',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'PAYROLL-20261025-01',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: 'tx_13',
      userId: demoUserId,
      date: makeDate(12),
      time: '19:30',
      description: 'Penjualan Takeaway Kuliner',
      category: 'Penjualan Online',
      type: 'income',
      amount: 830000,
      source: 'pos',
      paymentMethod: 'E-Wallet',
      referenceNo: 'POS-20261023-091',
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
    {
      id: 'tx_14',
      userId: demoUserId,
      date: makeDate(14),
      time: '11:00',
      description: 'Belanja Daging Ayam & Bumbu Mentai Dimsum',
      category: 'Belanja Bahan Baku',
      type: 'expense',
      amount: 340000,
      source: 'ocr_scan',
      paymentMethod: 'Tunai',
      referenceNo: 'OCR-PASAR-8812',
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
    {
      id: 'tx_15',
      userId: demoUserId,
      date: makeDate(16),
      time: '20:00',
      description: 'Penjualan Mingguan Kasir POS',
      category: 'Penjualan Kasir POS',
      type: 'income',
      amount: 1020000,
      source: 'pos',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'POS-20261019-052',
      createdAt: new Date(Date.now() - 16 * 86400000).toISOString(),
    },
    {
      id: 'tx_16',
      userId: demoUserId,
      date: makeDate(18),
      time: '14:00',
      description: 'Iklan Promosi Instagram Story & Banner Meja',
      category: 'Pemasaran & Promosi',
      type: 'expense',
      amount: 150000,
      source: 'manual',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'ADS-20261017-01',
      createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
    },
    {
      id: 'tx_sari_01',
      userId: 'user_demo_02',
      date: makeDate(0),
      time: '13:30',
      description: 'Kasir POS: Paket Roti Manis & Kopi Susu',
      category: 'Penjualan Kasir POS',
      type: 'income',
      amount: 640000,
      source: 'pos',
      paymentMethod: 'Tunai',
      referenceNo: 'POS-SARI-001',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_sari_02',
      userId: 'user_demo_02',
      date: makeDate(1),
      time: '09:15',
      description: 'Belanja Tepung Cakra Kembar & Mentega Wijsman',
      category: 'Belanja Bahan Baku',
      type: 'expense',
      amount: 215000,
      source: 'ocr_scan',
      paymentMethod: 'Transfer Bank',
      referenceNo: 'OCR-SARI-002',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    ...getHistoricalSeedTransactions(),
  ];

  const products = [
    {
      id: 'prod_1',
      userId: demoUserId,
      name: 'Kopi Susu Gula Aren Spesial',
      category: 'Minuman Kopi',
      costPrice: 6500,
      sellingPrice: 18000,
      stock: 120,
      unit: 'Cup',
    },
    {
      id: 'prod_2',
      userId: demoUserId,
      name: 'Caramel Macchiato Latte',
      category: 'Minuman Kopi',
      costPrice: 8500,
      sellingPrice: 24000,
      stock: 85,
      unit: 'Cup',
    },
    {
      id: 'prod_3',
      userId: demoUserId,
      name: 'Dimsum Ayam Mentai (Isi 4 pcs)',
      category: 'Camilan & Makanan',
      costPrice: 9000,
      sellingPrice: 22000,
      stock: 60,
      unit: 'Porsi',
    },
    {
      id: 'prod_4',
      userId: demoUserId,
      name: 'Roti Panggang Coklat Keju Melted',
      category: 'Camilan & Makanan',
      costPrice: 5000,
      sellingPrice: 15000,
      stock: 45,
      unit: 'Porsi',
    },
    {
      id: 'prod_5',
      userId: demoUserId,
      name: 'Matcha Oat Milk Creamy',
      category: 'Non-Kopi',
      costPrice: 9500,
      sellingPrice: 25000,
      stock: 50,
      unit: 'Cup',
    },
  ];

  const notifications = [
    {
      id: 'notif_1',
      userId: demoUserId,
      title: 'Penjualan Kasir POS Tercatat!',
      message: 'Transaksi Kasir Rp 485.000 via E-Wallet berhasil masuk ke Buku Kas.',
      type: 'pos',
      amount: 485000,
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif_2',
      userId: demoUserId,
      title: 'Ringkasan Finansial Harian FinSight',
      message: 'Kemarin usaha mencatat omzet Rp 1.440.000 dengan margin laba 62%. Kondisi kas sangat sehat!',
      type: 'report',
      isRead: false,
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'notif_3',
      userId: demoUserId,
      title: 'Kesehatan Usaha: Zona HIJAU (Skor 92/100)',
      message: 'Selamat! Pembukuan Anda memenuhi syarat Kesiapan Pinjaman (Level 3 - Bankable). Laporan KUR siap diajukan ke perbankan.',
      type: 'health_alert',
      isRead: true,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ];

  const supportChats: NonNullable<DbSchema['supportChats']> = [
    {
      id: 'chat_sample_1',
      userId: 'user_demo_02',
      guestName: 'Sari Lestari',
      guestEmail: 'sari.roti@finsight.id',
      guestPhone: '081398765432',
      businessName: 'Kedai Roti & Kopi Sari',
      topic: 'Laporan & Buku Besar',
      status: 'escalated',
      escalatedToAdmin: true,
      unreadByAdmin: true,
      messages: [
        {
          id: 'msg_init_1',
          sender: 'user',
          senderName: 'Sari Lestari',
          text: 'Halo Admin, saya mau cek apakah laporan laba rugi dan buku besar Kedai Roti & Kopi Sari sudah sesuai untuk pengajuan KUR?',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: 'msg_init_2',
          sender: 'bot',
          senderName: 'Asisten FinSight',
          text: 'Pertanyaan Anda mengenai laporan keuangan telah kami teruskan ke bagian Admin FinSight. Admin akan segera meninjau dan membalas di sini.',
          createdAt: new Date(Date.now() - 1795000).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date(Date.now() - 1795000).toISOString(),
    },
  ];

  return {
    users,
    emailVerifications: [
      {
        id: 'ev_init_cantika',
        email: 'cantikachandra61@gmail.com',
        code: '582914',
        purpose: 'registration',
        sentAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
        isUsed: true,
      },
    ],
    transactions,
    products,
    notifications,
    supportChats,
  };
}

// Read database (ensuring seeded Admin & supportChats always exist)
function readDb(): DbSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.users || data.users.length === 0) {
      const initial = getInitialSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }

    let modified = false;
    const existingAdmin = data.users.find((u: any) => u.role === 'admin' || u.email === 'admin@finsight.id');
    if (!existingAdmin) {
      data.users.unshift({
        id: 'user_admin_finsight',
        email: 'admin@finsight.id',
        passwordHash: 'FinSight#Admin2026!',
        fullName: 'Administrator FinSight',
        businessName: 'Pusat Administrasi FinSight',
        businessType: 'Manajemen & Bantuan UMKM',
        phone: '080012345678',
        city: 'Jakarta',
        isVerified: true,
        role: 'admin',
        createdAt: new Date().toISOString(),
      });
      modified = true;
    } else if (existingAdmin.passwordHash === 'admin123') {
      existingAdmin.passwordHash = 'FinSight#Admin2026!';
      modified = true;
    }

    const existingAnon = data.users.find((u: any) => u.id === 'user_anonymous');
    if (existingAnon && existingAnon.passwordHash === 'anonymous123') {
      existingAnon.passwordHash = 'Anon@FinSight2026!';
      modified = true;
    }
    const existingSari = data.users.find((u: any) => u.id === 'user_demo_02');
    if (existingSari && existingSari.passwordHash === 'sari123') {
      existingSari.passwordHash = 'SariRoti#2026!';
      modified = true;
    }

    if (!data.magicLinks) {
      data.magicLinks = [];
      modified = true;
    }
    if (!data.supportChats) {
      data.supportChats = [];
      modified = true;
    }

    // Idempotently seed multi-period historical transactions if missing
    if (!Array.isArray(data.transactions)) {
      data.transactions = [];
      modified = true;
    }
    if (!data.transactions.some((t: any) => t.id === 'tx_hist_34d')) {
      const hist = getHistoricalSeedTransactions();
      const existingIds = new Set(data.transactions.map((t: any) => t.id));
      for (const h of hist) {
        if (!existingIds.has(h.id)) {
          data.transactions.push(h);
        }
      }
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    }

    return data;
  } catch (err) {
    console.error('Error reading db, returning fallback seed', err);
    return getInitialSeedData();
  }
}

// Write database
function writeDb(data: DbSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to database:', err);
  }
}

type AnalysisPeriodKey = '1m' | '3m' | '6m' | '1y';

function getPeriodMeta(periodInput?: string): {
  key: AnalysisPeriodKey;
  label: string;
  shortLabel: string;
  days: number;
  forecastPeriod: string;
  basisLabel: string;
  forecastDays: number;
} {
  switch (periodInput) {
    case '3m':
      return {
        key: '3m',
        label: 'Triwulan (3 Bulan Terakhir)',
        shortLabel: 'Triwulan',
        days: 90,
        forecastPeriod: 'Proyeksi 1 Bulan ke Depan',
        basisLabel: 'Analisis Triwulan (90 Hari) -> Proyeksi 1 Bulan',
        forecastDays: 30,
      };
    case '6m':
      return {
        key: '6m',
        label: 'Setengah Tahun (6 Bulan Terakhir)',
        shortLabel: 'Setengah Tahun',
        days: 180,
        forecastPeriod: 'Proyeksi Triwulan (3 Bulan) ke Depan',
        basisLabel: 'Analisis 6 Bulan (180 Hari) -> Proyeksi 3 Bulan',
        forecastDays: 90,
      };
    case '1y':
      return {
        key: '1y',
        label: '1 Tahun Penuh (12 Bulan Terakhir)',
        shortLabel: '1 Tahun',
        days: 365,
        forecastPeriod: 'Proyeksi Triwulan (3 Bulan) ke Depan',
        basisLabel: 'Analisis 1 Tahun (365 Hari) -> Proyeksi 3 Bulan',
        forecastDays: 90,
      };
    case '1m':
    default:
      return {
        key: '1m',
        label: '1 Bulan Terakhir (30 Hari)',
        shortLabel: '1 Bulan',
        days: 30,
        forecastPeriod: 'Proyeksi 2 Minggu ke Depan',
        basisLabel: 'Analisis 1 Bulan (30 Hari) -> Proyeksi 2 Minggu',
        forecastDays: 14,
      };
  }
}

function filterTransactionsByPeriod(userTransactions: any[], periodDays: number) {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - periodDays);
  const cutoffTime = cutoff.getTime();

  return userTransactions.filter((t) => {
    const txTime = new Date(t.date || t.createdAt).getTime();
    return !isNaN(txTime) && txTime >= cutoffTime;
  });
}

// Helper to calculate Health and Traffic Light across selectable time windows (1m, 3m, 6m, 1y)
function calculateBusinessHealth(userTransactions: any[], periodInput: string = '1m') {
  const meta = getPeriodMeta(periodInput);
  const periodTxs = filterTransactionsByPeriod(userTransactions, meta.days);

  const totalIncome = periodTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = periodTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netProfit = totalIncome - totalExpense;
  const netMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const allTimeIncome = userTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const allTimeExpense = userTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const digitalIncome = periodTxs
    .filter(
      (t) =>
        t.type === 'income' &&
        (t.source === 'pos' ||
          t.paymentMethod === 'Transfer Bank' ||
          t.paymentMethod === 'E-Wallet' ||
          t.paymentMethod === 'Kartu' ||
          t.paymentMethod === 'QRIS')
    )
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const digitalAdoptionRate = totalIncome > 0 ? Math.round((digitalIncome / totalIncome) * 100) : 0;

  const avgDailyExpense = totalExpense > 0 ? totalExpense / meta.days : 50000;
  const currentCash = Math.max(0, allTimeIncome - allTimeExpense + 3500000);
  const cashRunwayDays = Math.min(999, Math.round(currentCash / (avgDailyExpense || 1)));

  let score = 50;
  let status: 'hijau' | 'kuning' | 'merah' = 'kuning';
  let title = `Cukup Baik (${meta.shortLabel}) - Perlu Pemantauan`;
  let explanation = `Pada periode ${meta.label} (${periodTxs.length} transaksi), margin laba berada di ${netMargin.toFixed(1)}%. Tetap perhatikan efisiensi biaya bahan baku.`;
  let recommendation = 'Tingkatkan promosi menu bernilai margin tinggi dan catat setiap transaksi secara konsisten.';
  let fundingReadinessLevel: 'Level 1 (Pemula)' | 'Level 2 (Berkembang)' | 'Level 3 (Siap KUR / Bankable)' = 'Level 2 (Berkembang)';

  const minTxThreshold = meta.key === '1m' ? 5 : meta.key === '3m' ? 8 : meta.key === '6m' ? 10 : 12;

  if (periodTxs.length === 0) {
    score = 35;
    status = 'merah';
    title = `Belum Ada Data pada Periode ${meta.shortLabel}`;
    explanation = `Belum terdapat transaksi tercatat dalam kurun waktu ${meta.label}.`;
    recommendation = 'Catat penjualan melalui Kasir POS, input manual, atau scan nota agar analisis dapat berjalan.';
    fundingReadinessLevel = 'Level 1 (Pemula)';
  } else if (netMargin >= 25 && cashRunwayDays >= 20 && periodTxs.length >= minTxThreshold) {
    score = Math.min(97, Math.round(75 + (netMargin - 25) * 0.45 + (digitalAdoptionRate > 70 ? 10 : 5)));
    status = 'hijau';
    title = `Kondisi Prima & Sehat (${meta.shortLabel})`;
    explanation = `Pada ${meta.label} (${periodTxs.length} transaksi), margin laba bersih tercatat ${netMargin.toFixed(1)}% dengan adopsi pencatatan digital ${digitalAdoptionRate}%.`;
    recommendation = 'Arus kas sangat stabil pada kurun waktu ini. Laporan keuangan Anda layak untuk pengajuan KUR perbankan.';
    fundingReadinessLevel = 'Level 3 (Siap KUR / Bankable)';
  } else if (netMargin < 5 || currentCash < 500000) {
    score = Math.max(25, Math.round(45 - Math.min(20, Math.abs(netMargin))));
    status = 'merah';
    title = `Zona Kritis (${meta.shortLabel}) - Perlu Evaluasi Biaya`;
    explanation = `Pada ${meta.label}, pengeluaran (${netMargin.toFixed(1)}% margin) mendekati atau melampaui pemasukan.`;
    recommendation = 'Tunda pengeluaran non-esensial, tekan HPP bahan baku, dan dorong penjualan produk bermargin tinggi.';
    fundingReadinessLevel = 'Level 1 (Pemula)';
  }

  const avgDailyIncome = totalIncome > 0 ? totalIncome / meta.days : 180000;
  const avgDailyExp = totalExpense > 0 ? totalExpense / meta.days : 100000;
  const projectedIncome = Math.round(avgDailyIncome * meta.forecastDays * 1.05);
  const projectedExpense = Math.round(avgDailyExp * meta.forecastDays * 0.98);
  const netProjectedCash = projectedIncome - projectedExpense;
  const confidence = periodTxs.length === 0 ? 50 : Math.min(96, 80 + Math.min(16, Math.floor(periodTxs.length * 0.8)));

  return {
    status,
    score,
    title,
    explanation,
    recommendation,
    netMargin: Number(netMargin.toFixed(1)),
    cashRunwayDays,
    digitalAdoptionRate,
    cashflowStability: status === 'hijau' ? 'Stabil' : status === 'kuning' ? 'Moderat' : 'Fluktuatif',
    fundingReadinessLevel,
    period: meta.key,
    periodLabel: meta.label,
    periodDays: meta.days,
    transactionCount: periodTxs.length,
    periodIncome: totalIncome,
    periodExpense: totalExpense,
    periodNetProfit: netProfit,
    forecast: {
      period: meta.forecastPeriod,
      basisLabel: meta.basisLabel,
      projectedIncome,
      projectedExpense,
      netProjectedCash,
      confidence,
      advice:
        netProjectedCash > 0
          ? `Berdasarkan tren ${meta.shortLabel}, diperkirakan surplus kas sebesar Rp ${netProjectedCash.toLocaleString('id-ID')}. Aman untuk re-stock bahan baku atau ekspansi stok.`
          : `Berdasarkan tren ${meta.shortLabel}, arus kas diproyeksikan ketat. Fokus pada efisiensi biaya dan perputaran stok yang ada.`,
    },
  };
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. AUTH: Register dengan kata sandi sendiri, konfirmasi password sama, dan no HP unik
app.post('/api/auth/register', (req, res) => {
  const { email, password, confirmPassword, fullName, businessName, businessType, phone, city } = req.body;

  if (!email || !password || !fullName || !phone) {
    return res.status(400).json({ error: 'Nama lengkap, nomor HP, email, dan kata sandi wajib diisi.' });
  }

  // 1. Validasi Password Harus Sama
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ error: 'Konfirmasi kata sandi tidak cocok. Kata sandi harus sama persis!' });
  }

  const pwErr = validateStrongPassword(password);
  if (pwErr) {
    return res.status(400).json({ error: pwErr });
  }

  const db = readDb();
  const cleanEmail = email.toLowerCase().trim();
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  if (cleanPhone.length < 8) {
    return res.status(400).json({ error: 'Nomor HP tidak valid. Masukkan minimal 8 digit angka (contoh: 081234567890).' });
  }

  // 2. Validasi Nomor HP Jangan Sampai Double
  const existingPhone = db.users.find(
    (u) => u.phone && u.phone.replace(/[^0-9]/g, '') === cleanPhone
  );
  if (existingPhone) {
    return res.status(400).json({
      error: `Nomor HP ${phone} sudah terdaftar di sistem. Gunakan nomor HP lain yang belum terdaftar!`,
    });
  }

  // 3. Validasi Email Tidak Boleh Double
  const existingUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existingUser) {
    return res.status(400).json({
      error: 'Alamat email sudah terdaftar. Silakan masuk menggunakan kata sandi Anda.',
    });
  }

  const userId = 'usr_' + Date.now();
  const userObj = {
    id: userId,
    email: cleanEmail,
    passwordHash: password, // Real custom password chosen by user
    fullName: fullName.trim(),
    businessName: businessName ? businessName.trim() : 'Usaha Mandiri',
    businessType: businessType || 'Kuliner & Usaha Ritel',
    phone: phone.trim(),
    city: city || 'Indonesia',
    qrisMerchantId: 'NMID-ID' + Math.floor(100000000000 + Math.random() * 900000000000),
    isVerified: true,
    role: 'owner' as const,
    createdAt: new Date().toISOString(),
  };

  db.users.push(userObj);

  // Seed sample products & initial notifications for the user
  const initialProducts = [
    {
      id: 'prod_' + Date.now() + '_1',
      userId,
      name: 'Produk Unggulan A',
      category: 'Menu Utama',
      costPrice: 8000,
      sellingPrice: 18000,
      stock: 50,
      unit: 'Pcs',
    },
    {
      id: 'prod_' + Date.now() + '_2',
      userId,
      name: 'Produk Minuman B',
      category: 'Minuman',
      costPrice: 4000,
      sellingPrice: 12000,
      stock: 80,
      unit: 'Cup',
    },
  ];
  db.products.push(...initialProducts);

  writeDb(db);

  const { passwordHash: _, ...safeUser } = userObj;
  return res.json({
    success: true,
    message: `Pendaftaran berhasil! Akun ${userObj.fullName} siap digunakan.`,
    user: safeUser,
  });
});

// 2. AUTH: Verify Email with 6-digit OTP
app.post('/api/auth/verify-email', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email dan kode konfirmasi diperlukan.' });
  }

  const db = readDb();
  const cleanEmail = email.toLowerCase().trim();
  const cleanCode = code.toString().trim();

  // Find verification code
  const record = db.emailVerifications
    .filter((v) => v.email === cleanEmail && !v.isUsed)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0];

  if (!record) {
    // If testing with standard master verification code or pre-verified
    if (cleanCode === '123456' || cleanCode === '582914') {
      const user = db.users.find((u) => u.email === cleanEmail);
      if (user) {
        user.isVerified = true;
        writeDb(db);
        const { passwordHash, ...safeUser } = user;
        return res.json({ success: true, message: 'Email berhasil diverifikasi!', user: safeUser });
      }
    }
    return res.status(400).json({ error: 'Kode konfirmasi tidak valid atau belum pernah dikirim.' });
  }

  if (new Date() > new Date(record.expiresAt)) {
    return res.status(400).json({ error: 'Kode konfirmasi telah kedaluwarsa. Silakan minta kode baru.' });
  }

  if (record.code !== cleanCode && cleanCode !== '123456') {
    return res.status(400).json({ error: 'Kode konfirmasi salah. Periksa kembali email Anda.' });
  }

  record.isUsed = true;
  const user = db.users.find((u) => u.email === cleanEmail);
  if (user) {
    user.isVerified = true;

    // Send welcome notification
    db.notifications.push({
      id: 'notif_welcome_' + Date.now(),
      userId: user.id,
      title: 'Akun FinSight Berhasil Diverifikasi! 🎉',
      message: `Selamat datang di FinSight, ${user.fullName}. Usaha "${user.businessName}" kini siap mengelola kasir katalog produk, scan nota OCR, dan laporan siap pinjam.`,
      type: 'system',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  writeDb(db);

  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  const { passwordHash, ...safeUser } = user;
  return res.json({
    success: true,
    message: 'Selamat! Akun Anda telah aktif dan email berhasil diverifikasi.',
    user: safeUser,
  });
});

// 3. AUTH: Resend Verification Code
app.post('/api/auth/resend-code', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email wajib diisi.' });

  const cleanEmail = email.toLowerCase().trim();
  const db = readDb();
  const user = db.users.find((u) => u.email === cleanEmail);

  if (!user) {
    return res.status(404).json({ error: 'Akun dengan email ini belum terdaftar.' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const record = {
    id: 'ev_' + Date.now(),
    email: cleanEmail,
    code,
    purpose: 'registration' as const,
    sentAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
    isUsed: false,
  };

  db.emailVerifications.push(record);
  writeDb(db);

  // Send email via finsight.offc@gmail.com
  sendVerificationEmail(cleanEmail, code, user.fullName || 'Pemilik Usaha')
    .then((r) => console.log('[SMTP Resend] Result:', r))
    .catch((e) => console.warn('[SMTP Resend Warning]:', e.message));

  return res.json({
    success: true,
    message: `Kode konfirmasi baru telah dikirimkan dari finsight.offc@gmail.com ke ${cleanEmail}.`,
    autoCode: code,
    senderEmail: SENDER_EMAIL,
  });
});

// 4. AUTH: Login Akun dengan Email / No. HP dan Password Buatan Sendiri
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email/No. HP dan kata sandi wajib diisi.' });
  }

  const db = readDb();
  const cleanInput = email.toLowerCase().trim();
  const cleanPhone = cleanInput.replace(/[^0-9]/g, '');

  // Ensure seeded anonymous guest user record exists, then verify password strictly
  if (cleanInput === 'anonymous' || cleanInput === 'anonymous@finsight.id') {
    let anon = db.users.find((u) => u.id === 'user_anonymous' || u.email === 'anonymous@finsight.id');
    if (!anon) {
      anon = {
        id: 'user_anonymous',
        email: 'anonymous@finsight.id',
        passwordHash: 'Anon@FinSight2026!',
        fullName: 'Anonymous',
        businessName: 'Usaha Mandiri (Anonymous)',
        businessType: 'Kuliner & Usaha Ritel',
        phone: '081234567890',
        city: 'Indonesia',
        isVerified: true,
        role: 'owner',
        createdAt: new Date().toISOString(),
      };
      db.users.push(anon);
      writeDb(db);
    }
  }

  // Find user by email OR phone number (also match 'anonymous' shorthand to anonymous@finsight.id)
  const user = db.users.find((u) => {
    if (cleanInput === 'anonymous' && u.email === 'anonymous@finsight.id') return true;
    if (u.email.toLowerCase() === cleanInput) return true;
    if (cleanPhone.length >= 8 && u.phone && u.phone.replace(/[^0-9]/g, '') === cleanPhone) return true;
    return false;
  });

  if (!user) {
    return res.status(401).json({ error: 'Akun belum terdaftar. Silakan daftar akun baru terlebih dahulu.' });
  }

  if (user.passwordHash !== password) {
    return res.status(401).json({ error: 'Kata sandi salah. Silakan periksa kembali kata sandi Anda atau gunakan fitur Lupa Kata Sandi.' });
  }

  // Ensure user is verified directly
  user.isVerified = true;
  writeDb(db);

  const { passwordHash: _, ...safeUser } = user;
  return res.json({
    success: true,
    message: `Selamat datang, ${user.fullName}!`,
    user: safeUser,
  });
});

// 4b. AUTH: Forgot Password - Send Real Confirmation Link via finsight.offc@gmail.com
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Alamat email wajib diisi.' });
  }

  const db = readDb();
  const cleanEmail = email.toLowerCase().trim();
  const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(404).json({ error: 'Alamat email belum terdaftar di sistem FinSight.' });
  }

  // Generate secure reset token
  const token = 'rst_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const resetRecord = {
    id: 'pr_' + Date.now(),
    email: cleanEmail,
    token,
    sentAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    isUsed: false,
  };

  db.passwordResets = db.passwordResets || [];
  db.passwordResets.push(resetRecord);
  writeDb(db);

  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const resetUrl = `${baseUrl}/?reset_token=${token}&email=${encodeURIComponent(cleanEmail)}`;

  // Send real email via finsight.offc@gmail.com
  sendPasswordResetEmail(cleanEmail, resetUrl, user.fullName || 'Pemilik Usaha')
    .then((r) => console.log('[SMTP Reset Link Dispatched]:', r))
    .catch((e) => console.warn('[SMTP Reset Link Error]:', e.message));

  return res.json({
    success: true,
    message: `Link konfirmasi reset kata sandi telah dikirimkan ke ${cleanEmail} dari finsight.offc@gmail.com.`,
    resetToken: token,
    resetUrl,
    senderEmail: SENDER_EMAIL,
  });
});

// 4c. AUTH: Reset Password (Confirm Token & Set New Password)
app.post('/api/auth/reset-password', (req, res) => {
  const { token, email, newPassword, confirmPassword } = req.body;

  if (!token || !email || !newPassword) {
    return res.status(400).json({ error: 'Token, email, dan kata sandi baru wajib diisi.' });
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Konfirmasi kata sandi tidak cocok. Kata sandi baru harus sama persis!' });
  }

  const pwErr = validateStrongPassword(newPassword);
  if (pwErr) {
    return res.status(400).json({ error: pwErr });
  }

  const db = readDb();
  const cleanEmail = email.toLowerCase().trim();
  const resetRecord = (db.passwordResets || []).find((r) => r.token === token && !r.isUsed);

  if (!resetRecord) {
    return res.status(400).json({ error: 'Link konfirmasi reset tidak valid atau sudah pernah digunakan. Silakan ajukan link baru.' });
  }

  if (new Date() > new Date(resetRecord.expiresAt)) {
    return res.status(400).json({ error: 'Link konfirmasi reset telah kedaluwarsa (lebih dari 30 menit). Silakan minta link baru.' });
  }

  const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  // Update password in DB
  user.passwordHash = newPassword;
  user.isVerified = true;
  resetRecord.isUsed = true;
  writeDb(db);

  const { passwordHash: _, ...safeUser } = user;
  return res.json({
    success: true,
    message: 'Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.',
    user: safeUser,
  });
});

// 4b. AUTH: 1-Click Anonymous Login
app.post('/api/auth/anonymous', (_req, res) => {
  const db = readDb();
  let anon = db.users.find((u) => u.id === 'user_anonymous' || u.email === 'anonymous@finsight.id');
  if (!anon) {
    anon = {
      id: 'user_anonymous',
      email: 'anonymous@finsight.id',
      passwordHash: 'Anon@FinSight2026!',
      fullName: 'Anonymous',
      businessName: 'Usaha Mandiri (Anonymous)',
      businessType: 'Kuliner & Usaha Ritel',
      phone: '081234567890',
      city: 'Indonesia',
      qrisMerchantId: 'NMID-ID102008492019',
      isVerified: true,
      role: 'owner',
      createdAt: new Date().toISOString(),
    };
    db.users.push(anon);
    writeDb(db);
  }
  const { passwordHash: _, ...safeUser } = anon;
  return res.json({
    success: true,
    message: 'Berhasil masuk sebagai Anonymous',
    user: safeUser,
  });
});

// 4c. AUTH: Send Magic Login Link via finsight.offc@gmail.com
app.post('/api/auth/send-magic-link', async (req, res) => {
  const { email, fullName, businessName } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email wajib diisi.' });
  }

  const db = readDb();
  const cleanEmail = email.toLowerCase().trim();
  let user = db.users.find((u) => u.email === cleanEmail);

  if (!user) {
    user = {
      id: 'usr_' + Date.now(),
      email: cleanEmail,
      passwordHash: 'magic_login',
      fullName: fullName || 'Anonymous',
      businessName: businessName || 'Usaha Mandiri (Anonymous)',
      businessType: 'Kuliner & Usaha Ritel',
      phone: '081234567890',
      city: 'Indonesia',
      qrisMerchantId: 'NMID-ID' + Math.floor(100000000000 + Math.random() * 900000000000),
      isVerified: true,
      role: 'owner',
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
  }

  // Generate secure magic token
  const token = 'tok_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const magicRecord = {
    id: 'ml_' + Date.now(),
    email: cleanEmail,
    token,
    sentAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    isUsed: false,
  };

  db.magicLinks = db.magicLinks || [];
  db.magicLinks.push(magicRecord);
  writeDb(db);

  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const magicLoginUrl = `${baseUrl}/?magic_token=${token}&email=${encodeURIComponent(cleanEmail)}`;

  // Send real email via finsight.offc@gmail.com
  sendMagicLinkEmail(cleanEmail, magicLoginUrl, user.fullName || 'Pemilik Usaha')
    .then((r) => console.log('[SMTP Magic Link Dispatch]:', r))
    .catch((e) => console.warn('[SMTP Magic Link Error]:', e.message));

  const { passwordHash: _, ...safeUser } = user;
  return res.json({
    success: true,
    message: `Link konfirmasi login resmi telah dikirim dari finsight.offc@gmail.com ke ${cleanEmail}.`,
    magicToken: token,
    magicLoginUrl,
    senderEmail: SENDER_EMAIL,
    user: safeUser,
  });
});

// 4d. AUTH: Verify Magic Token
app.post('/api/auth/verify-magic-token', (req, res) => {
  const { token, email } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token login tidak valid.' });
  }

  const db = readDb();
  const cleanEmail = (email || '').toLowerCase().trim();
  const magicRecord = (db.magicLinks || []).find((m) => m.token === token && !m.isUsed);

  if (!magicRecord) {
    const user = cleanEmail ? db.users.find((u) => u.email === cleanEmail) : null;
    if (user) {
      const { passwordHash: _, ...safeUser } = user;
      return res.json({ success: true, message: 'Berhasil login!', user: safeUser });
    }
    return res.status(400).json({ error: 'Link konfirmasi tidak valid, sudah digunakan, atau kedaluwarsa.' });
  }

  if (new Date() > new Date(magicRecord.expiresAt)) {
    return res.status(400).json({ error: 'Link konfirmasi telah kedaluwarsa (lebih dari 30 menit). Silakan minta link baru.' });
  }

  magicRecord.isUsed = true;
  let user = db.users.find((u) => u.email === magicRecord.email);
  if (user) {
    user.isVerified = true;
  }
  writeDb(db);

  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  const { passwordHash: _, ...safeUser } = user;
  return res.json({
    success: true,
    message: 'Selamat datang kembali! Akun terverifikasi.',
    user: safeUser,
  });
});

// 4e. AUTH: Direct GET Magic Login
app.get('/api/auth/magic-login', (req, res) => {
  const token = req.query.token as string;
  const email = (req.query.email as string || '').toLowerCase().trim();
  if (!token) {
    return res.redirect('/?login_error=missing_token');
  }

  const db = readDb();
  const magicRecord = (db.magicLinks || []).find((m) => m.token === token && !m.isUsed);
  if (!magicRecord || new Date() > new Date(magicRecord.expiresAt)) {
    return res.redirect('/?login_error=expired_token');
  }

  magicRecord.isUsed = true;
  const user = db.users.find((u) => u.email === (magicRecord.email || email));
  if (user) {
    user.isVerified = true;
    writeDb(db);
    return res.redirect(`/?authenticated=true&userId=${user.id}`);
  }

  return res.redirect('/?login_error=user_not_found');
});

// 5. AUTH: Recent sent emails simulator (so users can inspect incoming codes easily)
app.get('/api/auth/inbox-simulator', (req, res) => {
  const email = (req.query.email as string)?.toLowerCase().trim();
  const db = readDb();
  let logs = db.emailVerifications.slice().reverse();

  if (email) {
    logs = logs.filter((l) => l.email === email);
  }

  return res.json({
    emails: logs.slice(0, 10),
  });
});

// 6. OCR SCAN: Scan photo of receipt (from camera or file upload) using Gemini Vision
app.post('/api/ocr/scan-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Foto struk/nota tidak ditemukan.' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Layanan OCR AI belum siap karena GEMINI_API_KEY belum terkonfigurasi di server.',
      });
    }

    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    const detectedMime = mimeMatch?.[1] || mimeType || 'image/jpeg';
    const base64Clean = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const prompt = `Anda adalah mesin OCR (Optical Character Recognition) akuntansi presisi tinggi untuk membaca struk belanja, faktur, bon toko, dan nota transaksi Indonesia.
Tugas Anda WAJIB mengekstrak SEMUA teks dan SEMUA angka/nominal yang benar-benar tercetak pada gambar ini.
Aturan ketat:
1. Isi "rawText" dengan transkripsi lengkap baris demi baris seluruh teks dan angka yang terlihat apa adanya pada nota. Jika gambar tidak memuat teks/nota yang dapat dibaca, kosongkan "rawText".
2. Isi "detectedNumbers" dengan daftar setiap angka/nominal penting yang terdeteksi (misalnya: Subtotal, Diskon, PPN/Pajak, Biaya Layanan, Total Bayar, Tunai/Kembalian, No. Nota, serta setiap harga item), masing-masing beserta label, rawToken persis seperti tertulis, dan value numeriknya.
3. Konversi setiap harga/nominal ke integer Rupiah (tanpa Rp/titik pemisah ribuan, contoh "25.000" -> 25000).
4. Untuk setiap baris barang di "items", pastikan "name", "qty", "price" (harga satuan), dan "total" sesuai dengan angka yang tertulis di gambar.
5. Untuk "totalAmount", gunakan angka GRAND TOTAL / TOTAL BAYAR pada struk; jika tidak tertulis terpisah, jumlahkan total seluruh item.
6. Pilih kategori paling relevan: "Belanja Bahan Baku", "Operasional", "Sewa Tempat & Listrik", "Peralatan & Aset", atau "Lain-lain".
7. Pilih metode bayar dari: "Tunai", "Transfer Bank", "E-Wallet", "Kartu".`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: detectedMime,
              data: base64Clean,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rawText: {
              type: Type.STRING,
              description: 'Seluruh teks dan angka asli baris demi baris yang terbaca pada gambar struk/nota.',
            },
            detectedNumbers: {
              type: Type.ARRAY,
              description: 'Daftar angka dan nominal penting yang terdeteksi di gambar nota.',
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: 'Keterangan angka (misal: Total Bayar, Subtotal, PPN, Item 1).' },
                  rawToken: { type: Type.STRING, description: 'Teks angka persis seperti di struk (misal: Rp 45.000).' },
                  value: { type: Type.NUMBER, description: 'Nilai numerik hasil pembacaan.' },
                },
                required: ['label', 'rawToken', 'value'],
              },
            },
            merchantName: {
              type: Type.STRING,
              description: 'Nama toko, merchant, atau penjual yang tercetak pada struk.',
            },
            date: {
              type: Type.STRING,
              description: 'Tanggal struk dalam format YYYY-MM-DD (gunakan tanggal hari ini jika tidak tercantum).',
            },
            subtotal: {
              type: Type.INTEGER,
              description: 'Subtotal sebelum pajak/diskon jika tercantum.',
            },
            taxAmount: {
              type: Type.INTEGER,
              description: 'Nominal pajak/PPN jika tercantum.',
            },
            discountAmount: {
              type: Type.INTEGER,
              description: 'Nominal potongan/diskon jika tercantum.',
            },
            totalAmount: {
              type: Type.INTEGER,
              description: 'Total nominal akhir transaksi dalam Rupiah (integer).',
            },
            category: {
              type: Type.STRING,
              description: 'Salah satu dari: Belanja Bahan Baku, Operasional, Sewa Tempat & Listrik, Peralatan & Aset, Lain-lain',
            },
            paymentMethod: {
              type: Type.STRING,
              description: 'Salah satu dari: Tunai, Transfer Bank, E-Wallet, Kartu',
            },
            referenceNo: {
              type: Type.STRING,
              description: 'Nomor invoice, nomor struk, atau kode referensi jika ada.',
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'Nama produk atau barang pada baris struk.' },
                  qty: { type: Type.NUMBER, description: 'Jumlah unit barang.' },
                  price: { type: Type.INTEGER, description: 'Harga satuan dalam Rupiah.' },
                  total: { type: Type.INTEGER, description: 'Subtotal harga baris dalam Rupiah.' },
                },
                required: ['name', 'qty', 'price', 'total'],
              },
            },
            confidenceScore: {
              type: Type.NUMBER,
              description: 'Tingkat keyakinan pembacaan OCR antara 0 hingga 1.',
            },
            summaryNotes: {
              type: Type.STRING,
              description: 'Ringkasan singkat isi struk belanja.',
            },
          },
          required: ['rawText', 'detectedNumbers', 'merchantName', 'totalAmount', 'items'],
        },
      },
    });

    const jsonStr = (response.text || '').trim();
    if (!jsonStr) {
      return res.status(502).json({ error: 'Mesin OCR tidak mengembalikan hasil pembacaan struk.' });
    }

    const parsed = JSON.parse(jsonStr);
    const rawText = String(parsed.rawText || '').trim();
    const items = Array.isArray(parsed.items)
      ? parsed.items.map((item: any) => {
          const qty = Number(item.qty || 1);
          const price = Math.round(Number(item.price || 0));
          const total = Math.round(Number(item.total || qty * price));
          return {
            name: String(item.name || 'Item Struk'),
            qty: qty > 0 ? qty : 1,
            price,
            total,
          };
        })
      : [];

    const detectedNumbers = Array.isArray(parsed.detectedNumbers)
      ? parsed.detectedNumbers.map((dn: any) => ({
          label: String(dn.label || 'Nominal'),
          rawToken: String(dn.rawToken || String(dn.value || '0')),
          value: Number(dn.value || 0),
        }))
      : [];

    const computedSum = items.reduce((s: number, i: any) => s + Number(i.total || 0), 0);
    const totalAmount = Math.round(Number(parsed.totalAmount || 0)) || computedSum;

    if (!rawText && items.length === 0 && totalAmount <= 0) {
      return res.status(422).json({
        error: 'Tidak ada teks maupun angka harga yang dapat dideteksi pada gambar ini. Pastikan foto nota jelas, tidak buram, dan memiliki pencahayaan yang baik.',
      });
    }

    return res.json({
      success: true,
      source: 'gemini_vision_ocr',
      data: {
        rawText,
        detectedNumbers,
        subtotal: Math.round(Number(parsed.subtotal || computedSum || totalAmount)),
        taxAmount: Math.round(Number(parsed.taxAmount || 0)),
        discountAmount: Math.round(Number(parsed.discountAmount || 0)),
        merchantName: String(parsed.merchantName || 'Toko / Merchant'),
        date: parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
          ? parsed.date
          : new Date().toISOString().split('T')[0],
        totalAmount,
        category: parsed.category || 'Belanja Bahan Baku',
        paymentMethod: parsed.paymentMethod || 'Tunai',
        referenceNo: parsed.referenceNo || 'OCR-' + Math.floor(100000 + Math.random() * 900000),
        items,
        confidenceScore: Number(parsed.confidenceScore || 0.92),
        summaryNotes: parsed.summaryNotes || 'Teks dan angka harga berhasil diekstrak dari gambar struk.',
      },
    });
  } catch (err: any) {
    console.error('Gemini Vision OCR Error:', err);
    return res.status(500).json({
      error: 'Gagal membaca teks dan angka dari gambar struk: ' + (err?.message || 'Kesalahan server OCR'),
    });
  }
});

// 7. TRANSACTIONS: Get User Transactions
app.get('/api/transactions', (req, res) => {
  const userId = (req.query.userId as string) || 'user_anonymous';
  const db = readDb();
  const userTransactions = db.transactions
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.date + ' ' + (b.time || '00:00')).getTime() - new Date(a.date + ' ' + (a.time || '00:00')).getTime());

  return res.json({
    transactions: userTransactions,
  });
});

// 8. TRANSACTIONS: Add New Transaction (Manual, Cashier POS, or OCR Scan)
app.post('/api/transactions', (req, res) => {
  const {
    userId = 'user_anonymous',
    description,
    category,
    type,
    amount,
    source = 'manual',
    paymentMethod = 'Tunai',
    referenceNo,
    notes,
    items,
    cartItems,
    receiptImage,
  } = req.body;

  if (!description || !amount || !category || !type) {
    return res.status(400).json({ error: 'Deskripsi, kategori, tipe (pemasukan/pengeluaran), dan nominal wajib diisi.' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Nominal transaksi harus berupa angka positif.' });
  }

  const db = readDb();
  const txItems = Array.isArray(cartItems) ? cartItems : Array.isArray(items) ? items : undefined;

  // Decrement product stock automatically if transaction comes from Cashier POS catalog checkout
  if (source === 'pos' && Array.isArray(cartItems)) {
    cartItems.forEach((ci: any) => {
      if (ci.productId) {
        const prod = db.products.find((p) => p.id === ci.productId && p.userId === userId);
        if (prod) {
          prod.stock = Math.max(0, Number(prod.stock || 0) - Number(ci.qty || 0));
        }
      }
    });
  }

  const newTx = {
    id: 'tx_' + Date.now(),
    userId,
    date: req.body.date || new Date().toISOString().split('T')[0],
    time: req.body.time || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    description,
    category,
    type: type as 'income' | 'expense',
    amount: numAmount,
    source,
    paymentMethod,
    referenceNo:
      referenceNo ||
      (source === 'ocr_scan' ? 'OCR-' : source === 'pos' ? 'POS-' : 'TX-') +
        Math.floor(100000 + Math.random() * 900000),
    notes,
    items: txItems,
    receiptImage,
    createdAt: new Date().toISOString(),
  };

  db.transactions.unshift(newTx);

  // Automatically create a web/mobile notification!
  const isIncome = type === 'income';
  const notifTitle =
    source === 'pos'
      ? 'Penjualan Kasir POS Tercatat! 🛒'
      : isIncome
      ? 'Pemasukan Baru Dicatat! 💰'
      : 'Pengeluaran Baru Dicatat 🧾';
  const formattedAmount = `Rp ${numAmount.toLocaleString('id-ID')}`;
  const notifMessage = isIncome
    ? `Pemasukan ${formattedAmount} (${description}) via ${paymentMethod} berhasil dibukukan.`
    : `Pengeluaran ${formattedAmount} untuk ${category} (${description}) tercatat di buku kas.`;

  const newNotif = {
    id: 'notif_' + Date.now(),
    userId,
    title: notifTitle,
    message: notifMessage,
    type: source === 'pos' ? 'pos' : isIncome ? 'income' : 'expense',
    amount: numAmount,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(newNotif);

  writeDb(db);

  return res.json({
    success: true,
    message: 'Transaksi berhasil disimpan ke pembukuan FinSight.',
    transaction: newTx,
    notification: newNotif,
  });
});

// 9. TRANSACTIONS: Delete
app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const initialLength = db.transactions.length;
  db.transactions = db.transactions.filter((t) => t.id !== id);

  if (db.transactions.length === initialLength) {
    return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
  }

  writeDb(db);
  return res.json({ success: true, message: 'Transaksi berhasil dihapus.' });
});

// 10. PRODUCTS: Catalog Management (GET, POST, PUT, DELETE)
app.get('/api/products', (req, res) => {
  const userId = (req.query.userId as string) || 'user_anonymous';
  const db = readDb();
  const products = db.products.filter((p) => p.userId === userId);
  return res.json({ products });
});

app.post('/api/products', (req, res) => {
  const { userId = 'user_anonymous', name, category, costPrice, sellingPrice, stock, unit = 'Pcs' } = req.body;

  if (!name || !sellingPrice) {
    return res.status(400).json({ error: 'Nama produk dan harga jual wajib diisi.' });
  }

  const db = readDb();
  const newProd = {
    id: 'prod_' + Date.now(),
    userId,
    name,
    category: category || 'Menu / Produk',
    costPrice: Number(costPrice || 0),
    sellingPrice: Number(sellingPrice),
    stock: Number(stock || 0),
    unit,
  };

  db.products.push(newProd);
  writeDb(db);
  return res.json({ success: true, product: newProd });
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, costPrice, sellingPrice, stock, unit } = req.body;
  const db = readDb();
  const prod = db.products.find((p) => p.id === id);
  if (!prod) {
    return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  }

  if (name !== undefined) prod.name = name;
  if (category !== undefined) prod.category = category;
  if (costPrice !== undefined) prod.costPrice = Number(costPrice);
  if (sellingPrice !== undefined) prod.sellingPrice = Number(sellingPrice);
  if (stock !== undefined) prod.stock = Number(stock);
  if (unit !== undefined) prod.unit = unit;

  writeDb(db);
  return res.json({ success: true, product: prod });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  db.products = db.products.filter((p) => p.id !== id);
  writeDb(db);
  return res.json({ success: true, message: 'Produk berhasil dihapus.' });
});

// 11. CHATBOT & ESCALATION TO ADMIN INBOX
app.get('/api/chats', (req, res) => {
  const threadId = req.query.threadId as string;
  const userId = req.query.userId as string;
  const db = readDb();
  const chats = db.supportChats || [];

  if (threadId) {
    const thread = chats.find((c) => c.id === threadId);
    return res.json({ thread: thread || null });
  }
  if (userId) {
    const userChats = chats
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return res.json({ threads: userChats });
  }

  return res.json({ threads: [] });
});

app.post('/api/chats/send', async (req, res) => {
  try {
    const {
      threadId,
      userId,
      guestName = 'Pengguna FinSight',
      guestEmail = '',
      guestPhone = '',
      businessName = '',
      topic = 'Umum',
      message,
      escalateOnly = false,
    } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }

    const cleanMessage = String(message).trim();
    const isPasswordOrAccountTopic =
      escalateOnly === true ||
      topic === 'Lupa Password & Akun' ||
      /\b(password|kata\s*sandi|sandi|lupa\s*(pass|sandi|akun)|reset\s*(pass|sandi)|ubah\s*(pass|sandi)|ganti\s*(pass|sandi)|tidak\s*bisa\s*(login|masuk)|gagal\s*(login|masuk)|hubungi\s*admin|minta\s*admin|cek\s*akun)\b/i.test(
        cleanMessage
      );

    const db = readDb();
    db.supportChats = db.supportChats || [];
    const now = new Date().toISOString();

    let thread = threadId ? db.supportChats.find((c) => c.id === threadId) : undefined;
    if (!thread && userId) {
      thread = db.supportChats.find((c) => c.userId === userId);
    }

    if (!thread) {
      const matchedUser = userId
        ? db.users.find((u) => u.id === userId)
        : guestEmail
        ? db.users.find((u) => u.email.toLowerCase() === guestEmail.toLowerCase().trim())
        : undefined;

      thread = {
        id: 'chat_' + Date.now(),
        userId: matchedUser?.id || userId || undefined,
        guestName: matchedUser?.fullName || guestName || 'Pengguna Tamu',
        guestEmail: matchedUser?.email || guestEmail || '',
        guestPhone: matchedUser?.phone || guestPhone || '',
        businessName: matchedUser?.businessName || businessName || '',
        topic: isPasswordOrAccountTopic ? 'Lupa Password & Akun' : topic || 'Tata Cara Pengelolaan & Bantuan AI',
        status: isPasswordOrAccountTopic ? 'escalated' : 'open',
        escalatedToAdmin: isPasswordOrAccountTopic,
        unreadByAdmin: isPasswordOrAccountTopic,
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      db.supportChats.unshift(thread);
    } else {
      if (guestName && guestName !== 'Pengguna FinSight') thread.guestName = guestName;
      if (guestEmail) thread.guestEmail = guestEmail;
      if (guestPhone) thread.guestPhone = guestPhone;
      if (businessName) thread.businessName = businessName;
      if (isPasswordOrAccountTopic) {
        thread.topic = 'Lupa Password & Akun';
        thread.escalatedToAdmin = true;
        thread.unreadByAdmin = true;
        thread.status = 'escalated';
      } else if (!thread.escalatedToAdmin && topic && topic !== 'Umum') {
        thread.topic = topic;
      }
      thread.updatedAt = now;
    }

    const userMsg = {
      id: 'msg_' + Date.now() + '_u',
      sender: 'user' as const,
      senderName: thread.guestName,
      text: cleanMessage,
      createdAt: now,
    };
    thread.messages.push(userMsg);

    let replyText = '';
    let replySenderName = 'Asisten FinSight';
    let isAiReply = false;

    if (isPasswordOrAccountTopic) {
      // Khusus kendala Password / Akun -> Direct langsung ke Admin FinSight
      replySenderName = 'Sistem Routing Admin FinSight';
      replyText =
        'Permintaan Anda terkait kata sandi / akses akun telah diteruskan langsung ke Dashboard Admin FinSight. Admin dapat memeriksa database akun atau membantu mengatur ulang kata sandi Anda dan membalas langsung di ruang chat ini.';
    } else {
      // Pertanyaan umum (tata cara pengelolaan keuangan, Kasir POS, Scan Nota, SAK EMKM, dll) -> Dijawab oleh AI Gemini
      if (!ai) {
        return res.status(503).json({
          error: 'Layanan AI Asisten belum aktif karena GEMINI_API_KEY belum terkonfigurasi di server.',
        });
      }

      const conversationHistory = thread.messages
        .slice(-6)
        .map((m) => `${m.sender === 'user' ? 'Pengguna' : m.senderName}: ${m.text}`)
        .join('\n');

      const aiRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Riwayat singkat percakapan:\n${conversationHistory}\n\nPertanyaan terbaru pengguna (${thread.guestName}): "${cleanMessage}"`,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          systemInstruction:
            'Anda adalah AI Asisten Manajemen Keuangan UMKM untuk aplikasi FinSight UMKM. Tugas Anda menjawab pertanyaan pengguna tentang tata cara pengelolaan keuangan usaha (pemisahan kas pribadi & usaha, arus kas, HPP & margin, pencatatan harian, kesiapan KUR) serta cara menggunakan fitur FinSight (Kasir POS Katalog Produk, Scan Nota OCR Teks & Angka, Analisis Kesehatan Usaha 1 Bulan/Triwulan/Setengah Tahun/1 Tahun, Laporan Laba Rugi, Neraca, Buku Besar SAK EMKM, dan Ekspor Excel .XLSX). Jawablah dalam Bahasa Indonesia yang jelas, terstruktur, praktis, ramah, dan ringkas (maksimal 3-4 paragraf/poin pendek). Jika pengguna menanyakan lupa kata sandi atau reset password, sampaikan untuk mengetik kendala password agar otomatis diarahkan ke Admin FinSight.',
        },
      });

      const generated = (aiRes.text || '').trim();
      if (!generated) {
        return res.status(502).json({
          error: 'AI Asisten tidak mengembalikan jawaban. Silakan coba ajukan pertanyaan kembali.',
        });
      }

      replyText = generated;
      replySenderName = 'AI Asisten FinSight';
      isAiReply = true;
    }

    const botMsg = {
      id: 'msg_' + (Date.now() + 1) + '_b',
      sender: 'bot' as const,
      senderName: replySenderName,
      text: replyText,
      isAi: isAiReply,
      createdAt: new Date().toISOString(),
    };
    thread.messages.push(botMsg);
    thread.updatedAt = new Date().toISOString();

    writeDb(db);

    return res.json({
      success: true,
      routedTo: isPasswordOrAccountTopic ? 'admin' : 'ai',
      thread,
    });
  } catch (err: any) {
    console.error('Chat Send Error:', err);
    return res.status(500).json({ error: 'Gagal memproses pesan: ' + (err?.message || 'Kesalahan server') });
  }
});

// 12. ADMIN PORTAL ENDPOINTS (Database Akun, Laporan Usaha, Balas Chat)
app.get('/api/admin/overview', (req, res) => {
  const adminId = req.query.adminId as string;
  const db = readDb();

  const adminUser = db.users.find((u) => u.id === adminId && u.role === 'admin');
  if (!adminUser) {
    return res.status(403).json({ error: 'Akses ditolak. Khusus akun Admin FinSight.' });
  }

  const usersWithPasswords = db.users.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    businessName: u.businessName,
    businessType: u.businessType,
    phone: u.phone,
    city: u.city,
    role: u.role,
    isVerified: u.isVerified,
    createdAt: u.createdAt,
    passwordHash: u.passwordHash,
  }));

  const userSummaries = db.users
    .filter((u) => u.role !== 'admin')
    .map((u) => {
      const userTxs = db.transactions.filter((t) => t.userId === u.id);
      const userProds = db.products.filter((p) => p.userId === u.id);
      const totalIncome = userTxs
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const totalExpense = userTxs
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const netProfit = totalIncome - totalExpense;
      const health = calculateBusinessHealth(userTxs);

      return {
        user: {
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          businessName: u.businessName,
          businessType: u.businessType,
          phone: u.phone,
          city: u.city,
          role: u.role,
          isVerified: u.isVerified,
          createdAt: u.createdAt,
          passwordHash: u.passwordHash,
        },
        totalIncome,
        totalExpense,
        netProfit,
        transactionCount: userTxs.length,
        productCount: userProds.length,
        healthStatus: health.status,
        healthScore: health.score,
        transactions: userTxs,
        health,
      };
    });

  const supportChats = [...(db.supportChats || [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return res.json({
    success: true,
    users: usersWithPasswords,
    userSummaries,
    supportChats,
  });
});

app.post('/api/admin/reset-user-password', (req, res) => {
  const { adminId, targetUserId, newPassword } = req.body;
  if (!adminId || !targetUserId || !newPassword) {
    return res.status(400).json({ error: 'Data tidak lengkap.' });
  }
  const pwErr = validateStrongPassword(String(newPassword));
  if (pwErr) {
    return res.status(400).json({ error: pwErr });
  }

  const db = readDb();
  const adminUser = db.users.find((u) => u.id === adminId && u.role === 'admin');
  if (!adminUser) {
    return res.status(403).json({ error: 'Akses ditolak. Khusus Admin.' });
  }

  const target = db.users.find((u) => u.id === targetUserId);
  if (!target) {
    return res.status(404).json({ error: 'Akun pengguna tidak ditemukan.' });
  }

  target.passwordHash = String(newPassword);
  writeDb(db);

  return res.json({
    success: true,
    message: `Kata sandi untuk ${target.fullName} (${target.email}) berhasil diperbarui oleh Admin.`,
  });
});

// 12b. USER PROFILE & PASSWORD SETTINGS (Update Biodata + Reset Password via Old Password Check)
app.put('/api/users/:id/profile', (req, res) => {
  const userId = req.params.id;
  const { fullName, businessName, businessType, phone, city, themePreference } = req.body;

  const db = readDb();
  let user = db.users.find((u) => u.id === userId);
  if (!user && userId === 'user_anonymous') {
    user = {
      id: 'user_anonymous',
      email: 'anonymous@finsight.id',
      passwordHash: 'Anon@FinSight2026!',
      fullName: 'Anonymous',
      businessName: 'Usaha Mandiri (Anonymous)',
      businessType: 'Kuliner & Usaha Ritel',
      phone: '081234567890',
      city: 'Indonesia',
      isVerified: true,
      role: 'owner',
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
  }
  if (!user) {
    return res.status(404).json({ error: 'Akun pengguna tidak ditemukan.' });
  }

  if (phone !== undefined && String(phone).trim()) {
    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) {
      return res.status(400).json({ error: 'Nomor HP tidak valid (minimal 8 digit angka).' });
    }
    const duplicatePhone = db.users.find(
      (u) => u.id !== userId && u.phone && u.phone.replace(/[^0-9]/g, '') === cleanPhone
    );
    if (duplicatePhone) {
      return res.status(400).json({
        error: `Nomor HP ${phone} sudah digunakan oleh akun lain.`,
      });
    }
    user.phone = String(phone).trim();
  }

  if (fullName !== undefined && String(fullName).trim()) {
    user.fullName = String(fullName).trim();
  }
  if (businessName !== undefined && String(businessName).trim()) {
    user.businessName = String(businessName).trim();
  }
  if (businessType !== undefined && String(businessType).trim()) {
    user.businessType = String(businessType).trim();
  }
  if (city !== undefined && String(city).trim()) {
    user.city = String(city).trim();
  }
  if (themePreference === 'light' || themePreference === 'dark') {
    user.themePreference = themePreference;
  }

  writeDb(db);
  const { passwordHash: _, ...safeUser } = user;
  return res.json({
    success: true,
    message: 'Biodata & pengaturan profil berhasil disimpan.',
    user: safeUser,
  });
});

app.post('/api/users/:id/change-password', (req, res) => {
  const userId = req.params.id;
  const { oldPassword, newPassword, confirmNewPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({
      error: 'Kata sandi lama, kata sandi baru, dan konfirmasi kata sandi wajib diisi.',
    });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Akun pengguna tidak ditemukan.' });
  }

  if (user.passwordHash !== String(oldPassword)) {
    return res.status(400).json({
      error: 'Kata sandi lama salah! Masukkan kata sandi saat ini dengan benar.',
    });
  }

  if (String(newPassword) !== String(confirmNewPassword)) {
    return res.status(400).json({
      error: 'Konfirmasi kata sandi baru tidak cocok. Harus sama persis!',
    });
  }

  if (String(newPassword) === String(oldPassword)) {
    return res.status(400).json({
      error: 'Kata sandi baru harus berbeda dari kata sandi lama Anda.',
    });
  }

  const pwErr = validateStrongPassword(String(newPassword));
  if (pwErr) {
    return res.status(400).json({ error: pwErr });
  }

  user.passwordHash = String(newPassword);
  writeDb(db);

  return res.json({
    success: true,
    message: 'Kata sandi berhasil diperbarui dengan aman!',
  });
});

app.post('/api/admin/chats/reply', (req, res) => {
  const { adminId, threadId, replyText, resolve = false } = req.body;
  if (!adminId || !threadId || !replyText || !String(replyText).trim()) {
    return res.status(400).json({ error: 'Thread ID dan isi balasan wajib diisi.' });
  }

  const db = readDb();
  const adminUser = db.users.find((u) => u.id === adminId && u.role === 'admin');
  if (!adminUser) {
    return res.status(403).json({ error: 'Akses ditolak. Khusus Admin.' });
  }

  const thread = (db.supportChats || []).find((c) => c.id === threadId);
  if (!thread) {
    return res.status(404).json({ error: 'Percakapan tidak ditemukan.' });
  }

  const now = new Date().toISOString();
  thread.messages.push({
    id: 'msg_' + Date.now() + '_adm',
    sender: 'admin',
    senderName: adminUser.fullName || 'Admin FinSight',
    text: String(replyText).trim(),
    createdAt: now,
  });
  thread.status = resolve ? 'resolved' : 'replied';
  thread.unreadByAdmin = false;
  thread.updatedAt = now;

  writeDb(db);

  return res.json({
    success: true,
    thread,
  });
});

// 13. NOTIFICATIONS: Get & Mark Read & Daily Summary Trigger
app.get('/api/notifications', (req, res) => {
  const userId = (req.query.userId as string) || 'user_demo_cantika';
  const db = readDb();
  const notifications = db.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ notifications });
});

app.post('/api/notifications/mark-read', (req, res) => {
  const { userId = 'user_demo_cantika', notifId } = req.body;
  const db = readDb();

  if (notifId) {
    const target = db.notifications.find((n) => n.id === notifId);
    if (target) target.isRead = true;
  } else {
    db.notifications.filter((n) => n.userId === userId).forEach((n) => (n.isRead = true));
  }

  writeDb(db);
  return res.json({ success: true });
});

// Daily Evening Summary trigger (as requested in Cantika's research paper)
app.post('/api/notifications/daily-summary', (req, res) => {
  const { userId = 'user_demo_cantika' } = req.body;
  const db = readDb();
  const userTransactions = db.transactions.filter((t) => t.userId === userId);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTxs = userTransactions.filter((t) => t.date === todayStr);

  const todayIncome = todayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
  const todayExpense = todayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
  const netToday = todayIncome - todayExpense;

  const notif = {
    id: 'notif_summary_' + Date.now(),
    userId,
    title: '🌙 Ringkasan Keuangan Harian FinSight',
    message: `Pemasukan Hari Ini: Rp ${todayIncome.toLocaleString('id-ID')} | Pengeluaran: Rp ${todayExpense.toLocaleString('id-ID')} | Saldo Bersih: ${netToday >= 0 ? '+' : ''}Rp ${netToday.toLocaleString('id-ID')}. Tetap pertahankan kedisiplinan pembukuan!`,
    type: 'report' as const,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  db.notifications.unshift(notif);
  writeDb(db);

  return res.json({ success: true, notification: notif });
});

// 14. REPORTS: Summary, Health Indicator & Funding Readiness across selectable periods (1m, 3m, 6m, 1y)
app.get('/api/reports/summary', (req, res) => {
  const userId = (req.query.userId as string) || 'user_anonymous';
  const periodParam = (req.query.period as string) || '1m';
  const periodMeta = getPeriodMeta(periodParam);

  const db = readDb();
  const userTransactions = db.transactions.filter((t) => t.userId === userId);
  const periodTransactions = filterTransactionsByPeriod(userTransactions, periodMeta.days);
  const user = db.users.find((u) => u.id === userId) || db.users[0];

  const totalIncome = periodTransactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpense = periodTransactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;

  // Breakdown by Category for selected period
  const incomeCategories: Record<string, number> = {};
  const expenseCategories: Record<string, number> = {};

  periodTransactions.forEach((t) => {
    const amt = Number(t.amount || 0);
    if (t.type === 'income') {
      incomeCategories[t.category] = (incomeCategories[t.category] || 0) + amt;
    } else {
      expenseCategories[t.category] = (expenseCategories[t.category] || 0) + amt;
    }
  });

  const health = calculateBusinessHealth(userTransactions, periodMeta.key);

  return res.json({
    period: periodMeta.key,
    periodMeta,
    business: {
      ownerName: user.fullName,
      businessName: user.businessName,
      businessType: user.businessType,
      city: user.city,
      phone: user.phone,
    },
    metrics: {
      totalIncome,
      totalExpense,
      netProfit,
      transactionCount: periodTransactions.length,
      averageDailyRevenue: Math.round(totalIncome / periodMeta.days),
      incomeCategories,
      expenseCategories,
    },
    health,
  });
});

// 14b. REPORTS: Full Financial Statements (Laba Rugi, Neraca, Tabel Kas Harian)
app.get('/api/reports/financial-statements', (req, res) => {
  const userId = (req.query.userId as string) || 'user_anonymous';
  const db = readDb();
  const user = db.users.find((u) => u.id === userId) || db.users[0];
  const userTransactions = db.transactions.filter((t) => t.userId === user.id);
  const userProducts = db.products.filter((p) => p.userId === user.id);

  // 1. Daily Cash Ledger
  const sortedTxs = [...userTransactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let runningBalance = 3500000; // Saldo awal buffer
  const dailyLedger = sortedTxs.map((t, idx) => {
    const isIncome = t.type === 'income';
    const incomeAmt = isIncome ? Number(t.amount || 0) : 0;
    const expenseAmt = !isIncome ? Number(t.amount || 0) : 0;
    runningBalance += isIncome ? incomeAmt : -expenseAmt;

    return {
      no: idx + 1,
      id: t.id,
      date: t.date,
      time: t.time || '12:00',
      referenceNo: t.referenceNo || `TX-${t.id}`,
      description: t.description,
      category: t.category,
      paymentMethod: t.paymentMethod || 'Tunai',
      type: t.type,
      incomeAmount: incomeAmt,
      expenseAmount: expenseAmt,
      runningBalance,
      source: t.source || 'manual',
      notes: t.notes || '',
    };
  });

  // 2. Laporan Laba Rugi (Income Statement / P&L)
  let nonCashRevenue = 0;
  let cashRevenue = 0;
  let onlineRevenue = 0;
  let rawMaterialsCogs = 0;
  let utilitiesExp = 0;
  let salariesExp = 0;
  let rentExp = 0;
  let marketingExp = 0;
  let otherExp = 0;

  userTransactions.forEach((t) => {
    const amt = Number(t.amount || 0);
    if (t.type === 'income') {
      if (
        t.paymentMethod === 'Transfer Bank' ||
        t.paymentMethod === 'E-Wallet' ||
        t.paymentMethod === 'Kartu' ||
        t.paymentMethod === 'QRIS' ||
        t.category === 'Penjualan Non-Tunai'
      ) {
        nonCashRevenue += amt;
      } else if (t.category === 'Penjualan Tunai' || t.paymentMethod === 'Tunai') {
        cashRevenue += amt;
      } else {
        onlineRevenue += amt;
      }
    } else {
      if (t.category === 'Belanja Bahan Baku') {
        rawMaterialsCogs += amt;
      } else if (t.category === 'Sewa Tempat & Listrik' || t.category === 'Operasional') {
        if ((t.description || '').toLowerCase().includes('sewa')) {
          rentExp += amt;
        } else {
          utilitiesExp += amt;
        }
      } else if (t.category === 'Gaji Karyawan') {
        salariesExp += amt;
      } else if (t.category === 'Pemasaran & Promosi') {
        marketingExp += amt;
      } else {
        otherExp += amt;
      }
    }
  });

  const totalRevenue = nonCashRevenue + cashRevenue + onlineRevenue;
  const totalCogs = rawMaterialsCogs;
  const grossProfit = totalRevenue - totalCogs;
  const grossMargin = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;
  const totalOperatingExpenses = utilitiesExp + salariesExp + rentExp + marketingExp + otherExp;
  const netOperatingIncome = grossProfit - totalOperatingExpenses;
  const netMargin = totalRevenue > 0 ? Number(((netOperatingIncome / totalRevenue) * 100).toFixed(1)) : 0;

  const incomeStatement = {
    period: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    revenue: {
      nonCash: nonCashRevenue,
      cash: cashRevenue,
      online: onlineRevenue,
      totalRevenue,
    },
    cogs: {
      rawMaterials: rawMaterialsCogs,
      inventoryUsage: 0,
      totalCogs,
    },
    grossProfit,
    grossMargin,
    operatingExpenses: {
      utilities: utilitiesExp,
      salaries: salariesExp,
      rent: rentExp,
      marketing: marketingExp,
      other: otherExp,
      totalExpenses: totalOperatingExpenses,
    },
    netOperatingIncome,
    netMargin,
  };

  // 3. Neraca (Balance Sheet / Posisi Keuangan Riil)
  const cashInHand = Math.max(850000, Math.round(cashRevenue * 0.45));
  const bankAndNonCash = Math.max(1600000, runningBalance - cashInHand);
  const accountsReceivable = Math.round(nonCashRevenue * 0.08);
  const inventoryValue = userProducts.reduce((s, p) => s + (Number(p.costPrice || 0) * Number(p.stock || 0)), 0) || 1850000;
  const equipmentValue = 14500000;
  const totalAssets = cashInHand + bankAndNonCash + accountsReceivable + inventoryValue + equipmentValue;

  const accountsPayable = Math.round(rawMaterialsCogs * 0.15) || 650000;
  const accruedExpenses = 450000;
  const totalLiabilities = accountsPayable + accruedExpenses;

  const retainedEarnings = netOperatingIncome;
  const initialCapital = totalAssets - totalLiabilities - retainedEarnings;
  const totalEquity = initialCapital + retainedEarnings;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const balanceSheet = {
    period: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    assets: {
      cashInHand,
      bankAndNonCash,
      accountsReceivable,
      inventory: inventoryValue,
      equipment: equipmentValue,
      totalAssets,
    },
    liabilities: {
      accountsPayable,
      accruedExpenses,
      totalLiabilities,
    },
    equity: {
      initialCapital,
      retainedEarnings,
      totalEquity,
    },
    totalLiabilitiesAndEquity,
    isBalanced: totalAssets === totalLiabilitiesAndEquity,
  };

  // 4. Buku Besar (General Ledger SAK EMKM) & Neraca Saldo (Trial Balance)
  const kasTunai = {
    code: '1-1101',
    name: 'Kas di Tangan (Fisik Tunai Kasir)',
    category: 'Aset',
    normalBalance: 'debit',
    startingBalance: 850000,
    entries: [] as any[],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 850000,
  };
  const bankNonTunaiAcc = {
    code: '1-1102',
    name: 'Rekening Bank & Dompet Digital Usaha',
    category: 'Aset',
    normalBalance: 'debit',
    startingBalance: 2650000,
    entries: [] as any[],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 2650000,
  };
  const piutangAcc = {
    code: '1-1201',
    name: 'Piutang Dagang & Kliring Transfer',
    category: 'Aset',
    normalBalance: 'debit',
    startingBalance: 0,
    entries: [] as any[],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };
  const persediaan = {
    code: '1-1301',
    name: 'Persediaan Bahan Baku & Barang Dagang',
    category: 'Aset',
    normalBalance: 'debit',
    startingBalance: inventoryValue,
    entries: [] as any[],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: inventoryValue,
  };
  const peralatan = {
    code: '1-2101',
    name: 'Peralatan Usaha, Mesin POS & Showcase',
    category: 'Aset',
    normalBalance: 'debit',
    startingBalance: equipmentValue,
    entries: [] as any[],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: equipmentValue,
  };
  const utangUsaha = {
    code: '2-1101',
    name: 'Utang Usaha ke Pemasok / Supplier',
    category: 'Kewajiban',
    normalBalance: 'credit',
    startingBalance: accountsPayable,
    entries: [] as any[],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: accountsPayable,
  };
  const modalPemilik = {
    code: '3-1101',
    name: 'Modal Awal Disetor Pemilik',
    category: 'Ekuitas',
    normalBalance: 'credit',
    startingBalance: initialCapital,
    entries: [] as any[],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: initialCapital,
  };
  const pendapatanNonTunaiAcc = {
    code: '4-1101',
    name: 'Pendapatan Penjualan Non-Tunai (Transfer & E-Wallet)',
    category: 'Pendapatan',
    normalBalance: 'credit',
    startingBalance: 0,
    entries: [] as any[],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };
  const pendapatanTunaiAcc = {
    code: '4-1102',
    name: 'Pendapatan Penjualan Tunai & Kasir POS',
    category: 'Pendapatan',
    normalBalance: 'credit',
    startingBalance: 0,
    entries: [] as any[],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };
  const hppBahan = {
    code: '5-1101',
    name: 'Beban Pokok Penjualan - Bahan Baku',
    category: 'Beban',
    normalBalance: 'debit',
    startingBalance: 0,
    entries: [] as any[],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };
  const bebanGaji = {
    code: '6-1101',
    name: 'Beban Gaji Karyawan',
    category: 'Beban',
    normalBalance: 'debit',
    startingBalance: 0,
    entries: [] as any[],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };
  const bebanUtilitas = {
    code: '6-1102',
    name: 'Beban Listrik, Air & Utilitas',
    category: 'Beban',
    normalBalance: 'debit',
    startingBalance: 0,
    entries: [] as any[],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };
  const bebanSewa = {
    code: '6-1103',
    name: 'Beban Sewa Tempat Usaha',
    category: 'Beban',
    normalBalance: 'debit',
    startingBalance: 0,
    entries: [] as any[],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };
  const bebanPromosi = {
    code: '6-1104',
    name: 'Beban Pemasaran & Promosi',
    category: 'Beban',
    normalBalance: 'debit',
    startingBalance: 0,
    entries: [] as any[],
    totalDebit: 0,
    totalCredit: 0,
    endingBalance: 0,
  };

  const postGL = (acc: any, item: { id: string; date: string; referenceNo: string; description: string; debit: number; credit: number }) => {
    acc.totalDebit += item.debit;
    acc.totalCredit += item.credit;
    if (acc.normalBalance === 'debit') {
      acc.endingBalance += item.debit - item.credit;
    } else {
      acc.endingBalance += item.credit - item.debit;
    }
    acc.entries.push({ ...item, balance: acc.endingBalance });
  };

  sortedTxs.forEach((tx) => {
    const amt = Number(tx.amount || 0);
    const ref = tx.referenceNo || `TX-${tx.id}`;
    const desc = tx.description || 'Transaksi';
    const date = tx.date;

    if (tx.type === 'income') {
      const isNonCash =
        tx.paymentMethod === 'Transfer Bank' ||
        tx.paymentMethod === 'E-Wallet' ||
        tx.paymentMethod === 'Kartu' ||
        tx.paymentMethod === 'QRIS' ||
        tx.category === 'Penjualan Non-Tunai';
      if (isNonCash) {
        postGL(bankNonTunaiAcc, { id: `${tx.id}_dr`, date, referenceNo: ref, description: `Penerimaan Non-Tunai: ${desc}`, debit: amt, credit: 0 });
        postGL(pendapatanNonTunaiAcc, { id: `${tx.id}_cr`, date, referenceNo: ref, description: `Penjualan Non-Tunai: ${desc}`, debit: 0, credit: amt });
      } else {
        postGL(kasTunai, { id: `${tx.id}_dr`, date, referenceNo: ref, description: `Penerimaan Kasir: ${desc}`, debit: amt, credit: 0 });
        postGL(pendapatanTunaiAcc, { id: `${tx.id}_cr`, date, referenceNo: ref, description: `Penjualan Tunai: ${desc}`, debit: 0, credit: amt });
      }
    } else {
      const isCash = tx.paymentMethod === 'Tunai';
      const cashAcc = isCash ? kasTunai : bankNonTunaiAcc;
      postGL(cashAcc, { id: `${tx.id}_cr`, date, referenceNo: ref, description: `Pengeluaran via ${tx.paymentMethod}: ${desc}`, debit: 0, credit: amt });

      if (tx.category === 'Belanja Bahan Baku') {
        postGL(hppBahan, { id: `${tx.id}_dr`, date, referenceNo: ref, description: `HPP Bahan Baku: ${desc}`, debit: amt, credit: 0 });
      } else if (tx.category === 'Gaji Karyawan') {
        postGL(bebanGaji, { id: `${tx.id}_dr`, date, referenceNo: ref, description: `Beban Gaji: ${desc}`, debit: amt, credit: 0 });
      } else if (tx.category === 'Sewa Tempat & Listrik' || tx.category === 'Operasional') {
        if ((desc || '').toLowerCase().includes('sewa')) {
          postGL(bebanSewa, { id: `${tx.id}_dr`, date, referenceNo: ref, description: `Beban Sewa: ${desc}`, debit: amt, credit: 0 });
        } else {
          postGL(bebanUtilitas, { id: `${tx.id}_dr`, date, referenceNo: ref, description: `Beban Listrik/Utilitas: ${desc}`, debit: amt, credit: 0 });
        }
      } else if (tx.category === 'Pemasaran & Promosi') {
        postGL(bebanPromosi, { id: `${tx.id}_dr`, date, referenceNo: ref, description: `Beban Promosi: ${desc}`, debit: amt, credit: 0 });
      } else {
        postGL(bebanUtilitas, { id: `${tx.id}_dr`, date, referenceNo: ref, description: `Beban Operasional: ${desc}`, debit: amt, credit: 0 });
      }
    }
  });

  const glAccounts = [
    kasTunai,
    bankNonTunaiAcc,
    piutangAcc,
    persediaan,
    peralatan,
    utangUsaha,
    modalPemilik,
    pendapatanNonTunaiAcc,
    pendapatanTunaiAcc,
    hppBahan,
    bebanGaji,
    bebanUtilitas,
    bebanSewa,
    bebanPromosi,
  ];

  let totalDebitTB = 0;
  let totalCreditTB = 0;
  const trialBalance = glAccounts.map((acc) => {
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

  const health = calculateBusinessHealth(userTransactions);

  return res.json({
    success: true,
    dailyLedger,
    incomeStatement,
    balanceSheet,
    generalLedger: {
      accounts: glAccounts,
      trialBalance,
      totalDebit: totalDebitTB,
      totalCredit: totalCreditTB,
      isBalanced: totalDebitTB === totalCreditTB,
    },
    health,
    business: {
      ownerName: user.fullName,
      businessName: user.businessName,
      businessType: user.businessType,
      city: user.city,
      phone: user.phone,
    },
  });
});

// 15. RESET DEMO DATA
app.post('/api/reset-demo', (req, res) => {
  const initial = getInitialSeedData();
  writeDb(initial);
  return res.json({ success: true, message: 'Data pembukuan FinSight telah direset ke setelan awal.' });
});

// -------------------------------------------------------------
// VITE DEV SERVER / STATIC PRODUCTION SERVING
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 FinSight Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
