import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { getInitialSeedData, type DbSchema } from '../src/lib/seedData.ts';

dotenv.config();

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'ERROR: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi sebelum menjalankan migrasi.'
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const dbJsonPath = path.resolve(process.cwd(), 'data', 'finsight_db.json');
  const seed = getInitialSeedData();

  let sourceData: Partial<DbSchema> = {};
  if (fs.existsSync(dbJsonPath)) {
    console.log(`Membaca data sumber dari ${dbJsonPath}...`);
    const raw = fs.readFileSync(dbJsonPath, 'utf-8');
    sourceData = JSON.parse(raw);
  } else {
    console.log('File data/finsight_db.json tidak ditemukan, menggunakan seed data bawaan...');
  }

  // Merge JSON records with baseline seed records (deduplicating by id)
  const mergeById = <T extends { id: string }>(primary: T[] = [], fallback: T[] = []): T[] => {
    const map = new Map<string, T>();
    for (const item of fallback) map.set(item.id, item);
    for (const item of primary) map.set(item.id, item);
    return Array.from(map.values());
  };

  const users = mergeById(sourceData.users as any[], seed.users);
  const validUserIds = new Set(users.map((u) => u.id));

  const emailVerifications = mergeById(
    sourceData.emailVerifications as any[],
    seed.emailVerifications
  );
  const products = mergeById(sourceData.products as any[], seed.products).filter((p) =>
    validUserIds.has(p.userId)
  );
  const transactions = mergeById(sourceData.transactions as any[], seed.transactions).filter((t) =>
    validUserIds.has(t.userId)
  );
  const notifications = mergeById(sourceData.notifications as any[], seed.notifications).filter(
    (n) => validUserIds.has(n.userId)
  );
  const supportChats = mergeById(sourceData.supportChats as any[], seed.supportChats);
  const magicLinks = mergeById(sourceData.magicLinks as any[], seed.magicLinks);
  const passwordResets = mergeById(sourceData.passwordResets as any[], seed.passwordResets);

  // 1. Upsert Users first (parent table for FK constraints)
  console.log(`Mengimpor ${users.length} users...`);
  const { error: userErr } = await supabase.from('users').upsert(
    users.map((u) => ({
      id: u.id,
      email: String(u.email).toLowerCase().trim(),
      password_hash: u.passwordHash,
      full_name: u.fullName,
      business_name: u.businessName || 'Usaha Mandiri',
      business_type: u.businessType || 'Kuliner & Usaha Ritel',
      phone: u.phone || '',
      city: u.city || 'Indonesia',
      qris_merchant_id: u.qrisMerchantId ?? null,
      is_verified: Boolean(u.isVerified ?? true),
      role: u.role || 'owner',
      theme_preference: u.themePreference ?? null,
      created_at: u.createdAt || new Date().toISOString(),
    })),
    { onConflict: 'id' }
  );
  if (userErr) throw userErr;

  // 2. Email Verifications
  if (emailVerifications.length > 0) {
    console.log(`Mengimpor ${emailVerifications.length} email_verifications...`);
    const { error } = await supabase.from('email_verifications').upsert(
      emailVerifications.map((ev) => ({
        id: ev.id,
        email: String(ev.email).toLowerCase().trim(),
        code: ev.code,
        purpose: ev.purpose || 'registration',
        sent_at: ev.sentAt || new Date().toISOString(),
        expires_at: ev.expiresAt || new Date(Date.now() + 30 * 60000).toISOString(),
        is_used: Boolean(ev.isUsed),
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }

  // 3. Products
  if (products.length > 0) {
    console.log(`Mengimpor ${products.length} products...`);
    const { error } = await supabase.from('products').upsert(
      products.map((p) => ({
        id: p.id,
        user_id: p.userId,
        name: p.name,
        category: p.category || 'Menu / Produk',
        cost_price: Number(p.costPrice || 0),
        selling_price: Number(p.sellingPrice || 0),
        stock: Number(p.stock || 0),
        unit: p.unit || 'Pcs',
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }

  // 4. Transactions
  if (transactions.length > 0) {
    console.log(`Mengimpor ${transactions.length} transactions...`);
    const { error } = await supabase.from('transactions').upsert(
      transactions.map((t) => ({
        id: t.id,
        user_id: t.userId,
        date: t.date,
        time: t.time ?? null,
        description: t.description,
        category: t.category,
        type: t.type,
        amount: Number(t.amount || 0),
        source: t.source || 'manual',
        payment_method: t.paymentMethod || 'Tunai',
        reference_no: t.referenceNo || '',
        receipt_image: t.receiptImage ?? null,
        items: t.items ?? null,
        notes: t.notes ?? null,
        created_at: t.createdAt || new Date().toISOString(),
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }

  // 5. Notifications
  if (notifications.length > 0) {
    console.log(`Mengimpor ${notifications.length} notifications...`);
    const { error } = await supabase.from('notifications').upsert(
      notifications.map((n) => ({
        id: n.id,
        user_id: n.userId,
        title: n.title,
        message: n.message,
        type: n.type || 'system',
        amount: n.amount ?? null,
        is_read: Boolean(n.isRead),
        created_at: n.createdAt || new Date().toISOString(),
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }

  // 6. Support Chats
  if (supportChats.length > 0) {
    console.log(`Mengimpor ${supportChats.length} support_chats...`);
    const { error } = await supabase.from('support_chats').upsert(
      supportChats.map((c) => ({
        id: c.id,
        user_id: c.userId && validUserIds.has(c.userId) ? c.userId : null,
        guest_name: c.guestName || 'Pengguna FinSight',
        guest_email: c.guestEmail || '',
        guest_phone: c.guestPhone || '',
        business_name: c.businessName || '',
        topic: c.topic || 'Umum',
        status: c.status || 'open',
        escalated_to_admin: Boolean(c.escalatedToAdmin),
        unread_by_admin: Boolean(c.unreadByAdmin),
        messages: Array.isArray(c.messages) ? c.messages : [],
        created_at: c.createdAt || new Date().toISOString(),
        updated_at: c.updatedAt || new Date().toISOString(),
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }

  // 7. Magic Links
  if (magicLinks.length > 0) {
    console.log(`Mengimpor ${magicLinks.length} magic_links...`);
    const { error } = await supabase.from('magic_links').upsert(
      magicLinks.map((m) => ({
        id: m.id,
        email: String(m.email).toLowerCase().trim(),
        token: m.token,
        sent_at: m.sentAt || new Date().toISOString(),
        expires_at: m.expiresAt || new Date().toISOString(),
        is_used: Boolean(m.isUsed),
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }

  // 8. Password Resets
  if (passwordResets.length > 0) {
    console.log(`Mengimpor ${passwordResets.length} password_resets...`);
    const { error } = await supabase.from('password_resets').upsert(
      passwordResets.map((r) => ({
        id: r.id,
        email: String(r.email).toLowerCase().trim(),
        token: r.token,
        sent_at: r.sentAt || new Date().toISOString(),
        expires_at: r.expiresAt || new Date().toISOString(),
        is_used: Boolean(r.isUsed),
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }

  console.log('✅ Migrasi data FinSight ke Supabase berhasil selesai!');
}

main().catch((err) => {
  console.error('❌ Migrasi gagal:', err);
  process.exit(1);
});
