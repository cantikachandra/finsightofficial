-- =============================================================================
-- FinSight UMKM - Supabase (PostgreSQL) Schema
-- Jalankan script ini di Supabase Dashboard -> SQL Editor
-- =============================================================================

-- 1. Tabel Pengguna (Owner, Staff, Admin)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL DEFAULT 'Usaha Mandiri',
  business_type TEXT NOT NULL DEFAULT 'Kuliner & Usaha Ritel',
  phone TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Indonesia',
  qris_merchant_id TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff', 'admin')),
  theme_preference TEXT CHECK (theme_preference IN ('light', 'dark')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- 2. Tabel Log Verifikasi Email (OTP 6 Digit)
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'registration' CHECK (purpose IN ('registration', 'login', 'reset')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email_sent
  ON public.email_verifications (LOWER(email), sent_at DESC);

-- 3. Tabel Transaksi Keuangan (Kasir POS, Scan Nota OCR, Input Manual)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  payment_method TEXT NOT NULL DEFAULT 'Tunai',
  reference_no TEXT NOT NULL DEFAULT '',
  receipt_image TEXT,
  items JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id_date
  ON public.transactions (user_id, date DESC, created_at DESC);

-- 4. Tabel Katalog Produk (Kasir POS)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Menu / Produk',
  cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'Pcs',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products (user_id);

-- 5. Tabel Notifikasi Web & Ringkasan Harian
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  amount NUMERIC(15, 2),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created
  ON public.notifications (user_id, created_at DESC);

-- 6. Tabel Percakapan Bantuan AI & Eskalasi Admin
CREATE TABLE IF NOT EXISTS public.support_chats (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL DEFAULT 'Pengguna FinSight',
  guest_email TEXT NOT NULL DEFAULT '',
  guest_phone TEXT NOT NULL DEFAULT '',
  business_name TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT 'Umum',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'escalated', 'replied', 'resolved')),
  escalated_to_admin BOOLEAN NOT NULL DEFAULT FALSE,
  unread_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_chats_user_id ON public.support_chats (user_id);
CREATE INDEX IF NOT EXISTS idx_support_chats_updated_at ON public.support_chats (updated_at DESC);

-- 7. Tabel Magic Login Links
CREATE TABLE IF NOT EXISTS public.magic_links (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_magic_links_token ON public.magic_links (token);

-- 8. Tabel Reset Kata Sandi
CREATE TABLE IF NOT EXISTS public.password_resets (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON public.password_resets (token);

-- =============================================================================
-- Keamanan Row Level Security (RLS)
-- Backend Vercel Serverless Functions menggunakan SUPABASE_SERVICE_ROLE_KEY
-- yang melewati RLS secara aman di server-side. Mengaktifkan RLS mencegah akses
-- anon langsung dari klien publik tanpa melalui API /api/*.
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
