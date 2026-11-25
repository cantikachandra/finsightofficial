import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  NotificationItem,
  ProductItem,
  SupportChatMessage,
  SupportChatThread,
  Transaction,
} from '../types/index';
import {
  getInitialSeedData,
  type DbEmailVerification,
  type DbSchema,
  type DbTokenRecord,
  type DbUser,
} from './seedData';

export class DatabaseConfigError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 503) {
    super(message);
    this.name = 'DatabaseConfigError';
    this.statusCode = statusCode;
  }
}

let cachedClient: SupabaseClient | null = null;
let supabaseSeedPromise: Promise<void> | null = null;

function getSupabaseCredentials() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { supabaseUrl, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  const { supabaseUrl, serviceRoleKey } = getSupabaseCredentials();
  return Boolean(supabaseUrl && serviceRoleKey);
}

// Ephemeral in-memory fallback store initialized from seedData (zero fs reads/writes)
// Used automatically when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured.
const globalForDb = globalThis as unknown as {
  __finsightMemoryDb?: DbSchema;
};

function getMemoryDb(): DbSchema {
  if (!globalForDb.__finsightMemoryDb) {
    globalForDb.__finsightMemoryDb = getInitialSeedData();
  }
  return globalForDb.__finsightMemoryDb;
}

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const { supabaseUrl, serviceRoleKey } = getSupabaseCredentials();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new DatabaseConfigError(
      'Database Supabase belum dikonfigurasi. Tambahkan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY pada environment variables.',
      503
    );
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

function throwIfDbError(error: any, context: string): never {
  console.error(`[Supabase ${context}]`, error);
  throw new Error(error?.message || `Gagal mengakses database (${context}).`);
}

// -----------------------------------------------------------------------------
// Row <-> Domain Mappers (snake_case PostgreSQL <-> camelCase API/UI)
// -----------------------------------------------------------------------------

function mapUserRow(row: any): DbUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    businessName: row.business_name,
    businessType: row.business_type,
    phone: row.phone,
    city: row.city,
    qrisMerchantId: row.qris_merchant_id ?? undefined,
    isVerified: Boolean(row.is_verified),
    role: row.role,
    themePreference: row.theme_preference ?? undefined,
    createdAt: row.created_at,
  };
}

function toUserRow(user: DbUser) {
  return {
    id: user.id,
    email: user.email,
    password_hash: user.passwordHash,
    full_name: user.fullName,
    business_name: user.businessName,
    business_type: user.businessType,
    phone: user.phone,
    city: user.city,
    qris_merchant_id: user.qrisMerchantId ?? null,
    is_verified: user.isVerified,
    role: user.role,
    theme_preference: user.themePreference ?? null,
    created_at: user.createdAt,
  };
}

function mapTransactionRow(row: any): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    time: row.time ?? undefined,
    description: row.description,
    category: row.category,
    type: row.type,
    amount: Number(row.amount || 0),
    source: row.source || 'manual',
    paymentMethod: row.payment_method || 'Tunai',
    referenceNo: row.reference_no || '',
    receiptImage: row.receipt_image ?? undefined,
    items: Array.isArray(row.items) ? row.items : undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

function toTransactionRow(tx: Transaction) {
  return {
    id: tx.id,
    user_id: tx.userId,
    date: tx.date,
    time: tx.time ?? null,
    description: tx.description,
    category: tx.category,
    type: tx.type,
    amount: Number(tx.amount || 0),
    source: tx.source || 'manual',
    payment_method: tx.paymentMethod || 'Tunai',
    reference_no: tx.referenceNo || '',
    receipt_image: tx.receiptImage ?? null,
    items: tx.items ?? null,
    notes: tx.notes ?? null,
    created_at: tx.createdAt,
  };
}

function mapProductRow(row: any): ProductItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    costPrice: Number(row.cost_price || 0),
    sellingPrice: Number(row.selling_price || 0),
    stock: Number(row.stock || 0),
    unit: row.unit || 'Pcs',
  };
}

function toProductRow(prod: ProductItem) {
  return {
    id: prod.id,
    user_id: prod.userId,
    name: prod.name,
    category: prod.category,
    cost_price: Number(prod.costPrice || 0),
    selling_price: Number(prod.sellingPrice || 0),
    stock: Number(prod.stock || 0),
    unit: prod.unit || 'Pcs',
  };
}

function mapNotificationRow(row: any): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    amount: row.amount !== null && row.amount !== undefined ? Number(row.amount) : undefined,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  };
}

function toNotificationRow(notif: NotificationItem) {
  return {
    id: notif.id,
    user_id: notif.userId,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    amount: notif.amount ?? null,
    is_read: notif.isRead,
    created_at: notif.createdAt,
  };
}

function mapSupportChatRow(row: any): SupportChatThread {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    guestName: row.guest_name,
    guestEmail: row.guest_email || '',
    guestPhone: row.guest_phone || '',
    businessName: row.business_name || '',
    topic: row.topic || 'Umum',
    status: row.status,
    escalatedToAdmin: Boolean(row.escalated_to_admin),
    unreadByAdmin: Boolean(row.unread_by_admin),
    messages: Array.isArray(row.messages) ? (row.messages as SupportChatMessage[]) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSupportChatRow(thread: SupportChatThread) {
  return {
    id: thread.id,
    user_id: thread.userId ?? null,
    guest_name: thread.guestName,
    guest_email: thread.guestEmail || '',
    guest_phone: thread.guestPhone || '',
    business_name: thread.businessName || '',
    topic: thread.topic || 'Umum',
    status: thread.status,
    escalated_to_admin: thread.escalatedToAdmin,
    unread_by_admin: thread.unreadByAdmin,
    messages: thread.messages,
    created_at: thread.createdAt,
    updated_at: thread.updatedAt,
  };
}

function mapEmailVerificationRow(row: any): DbEmailVerification {
  return {
    id: row.id,
    email: row.email,
    code: row.code,
    purpose: row.purpose,
    sentAt: row.sent_at,
    expiresAt: row.expires_at,
    isUsed: Boolean(row.is_used),
  };
}

function mapTokenRow(row: any): DbTokenRecord {
  return {
    id: row.id,
    email: row.email,
    token: row.token,
    sentAt: row.sent_at,
    expiresAt: row.expires_at,
    isUsed: Boolean(row.is_used),
  };
}

// Automatically seeds baseline accounts & sample records into an empty Supabase DB
async function ensureSupabaseSeeded(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  if (supabaseSeedPromise) return supabaseSeedPromise;

  supabaseSeedPromise = (async () => {
    try {
      const supabase = getSupabaseClient();
      const { count, error } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });

      if (error || (count !== null && count > 0)) {
        return;
      }

      const seed = getInitialSeedData();
      await supabase.from('users').upsert(seed.users.map(toUserRow), { onConflict: 'id' });
      if (seed.emailVerifications.length > 0) {
        await supabase.from('email_verifications').upsert(
          seed.emailVerifications.map((ev) => ({
            id: ev.id,
            email: ev.email,
            code: ev.code,
            purpose: ev.purpose,
            sent_at: ev.sentAt,
            expires_at: ev.expiresAt,
            is_used: ev.isUsed,
          })),
          { onConflict: 'id' }
        );
      }
      if (seed.products.length > 0) {
        await supabase.from('products').upsert(seed.products.map(toProductRow), { onConflict: 'id' });
      }
      if (seed.transactions.length > 0) {
        await supabase
          .from('transactions')
          .upsert(seed.transactions.map(toTransactionRow), { onConflict: 'id' });
      }
      if (seed.notifications.length > 0) {
        await supabase
          .from('notifications')
          .upsert(seed.notifications.map(toNotificationRow), { onConflict: 'id' });
      }
      if (seed.supportChats.length > 0) {
        await supabase
          .from('support_chats')
          .upsert(seed.supportChats.map(toSupportChatRow), { onConflict: 'id' });
      }
    } catch (err) {
      console.warn('[Supabase AutoSeed Warning]:', err);
    }
  })();

  return supabaseSeedPromise;
}

// -----------------------------------------------------------------------------
// Users
// -----------------------------------------------------------------------------

export async function getAllUsers(): Promise<DbUser[]> {
  if (!isSupabaseConfigured()) {
    return [...getMemoryDb().users].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throwIfDbError(error, 'getAllUsers');
  return (data || []).map(mapUserRow);
}

export async function findUserById(userId: string): Promise<DbUser | null> {
  if (!isSupabaseConfigured()) {
    return getMemoryDb().users.find((u) => u.id === userId) || null;
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throwIfDbError(error, 'findUserById');
  return data ? mapUserRow(data) : null;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const cleanEmail = email.toLowerCase().trim();
  if (!isSupabaseConfigured()) {
    return getMemoryDb().users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', cleanEmail)
    .maybeSingle();
  if (error) throwIfDbError(error, 'findUserByEmail');
  return data ? mapUserRow(data) : null;
}

export async function findUserByEmailOrPhone(input: string): Promise<DbUser | null> {
  const cleanInput = input.toLowerCase().trim();
  const lookupEmail = cleanInput === 'anonymous' ? 'anonymous@finsight.id' : cleanInput;

  const byEmail = await findUserByEmail(lookupEmail);
  if (byEmail) return byEmail;

  const cleanPhone = cleanInput.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 8) return null;

  const allUsers = await getAllUsers();
  return allUsers.find((u) => u.phone && u.phone.replace(/[^0-9]/g, '') === cleanPhone) || null;
}

export async function isPhoneRegistered(phone: string, excludeUserId?: string): Promise<boolean> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return false;

  if (!isSupabaseConfigured()) {
    return getMemoryDb().users.some(
      (u) => u.id !== excludeUserId && u.phone && u.phone.replace(/[^0-9]/g, '') === cleanPhone
    );
  }

  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('users').select('id, phone');
  if (error) throwIfDbError(error, 'isPhoneRegistered');

  return (data || []).some(
    (row: any) =>
      row.id !== excludeUserId &&
      row.phone &&
      String(row.phone).replace(/[^0-9]/g, '') === cleanPhone
  );
}

export async function createUser(user: DbUser): Promise<DbUser> {
  if (!isSupabaseConfigured()) {
    getMemoryDb().users.push(user);
    return user;
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .insert(toUserRow(user))
    .select('*')
    .single();
  if (error) throwIfDbError(error, 'createUser');
  return mapUserRow(data);
}

export async function updateUser(
  userId: string,
  patch: Partial<
    Pick<
      DbUser,
      | 'fullName'
      | 'businessName'
      | 'businessType'
      | 'phone'
      | 'city'
      | 'isVerified'
      | 'passwordHash'
      | 'themePreference'
    >
  >
): Promise<DbUser | null> {
  if (!isSupabaseConfigured()) {
    const user = getMemoryDb().users.find((u) => u.id === userId);
    if (!user) return null;
    if (patch.fullName !== undefined) user.fullName = patch.fullName;
    if (patch.businessName !== undefined) user.businessName = patch.businessName;
    if (patch.businessType !== undefined) user.businessType = patch.businessType;
    if (patch.phone !== undefined) user.phone = patch.phone;
    if (patch.city !== undefined) user.city = patch.city;
    if (patch.isVerified !== undefined) user.isVerified = patch.isVerified;
    if (patch.passwordHash !== undefined) user.passwordHash = patch.passwordHash;
    if (patch.themePreference !== undefined) user.themePreference = patch.themePreference;
    return user;
  }

  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const updatePayload: Record<string, any> = {};
  if (patch.fullName !== undefined) updatePayload.full_name = patch.fullName;
  if (patch.businessName !== undefined) updatePayload.business_name = patch.businessName;
  if (patch.businessType !== undefined) updatePayload.business_type = patch.businessType;
  if (patch.phone !== undefined) updatePayload.phone = patch.phone;
  if (patch.city !== undefined) updatePayload.city = patch.city;
  if (patch.isVerified !== undefined) updatePayload.is_verified = patch.isVerified;
  if (patch.passwordHash !== undefined) updatePayload.password_hash = patch.passwordHash;
  if (patch.themePreference !== undefined) updatePayload.theme_preference = patch.themePreference;

  const { data, error } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', userId)
    .select('*')
    .maybeSingle();
  if (error) throwIfDbError(error, 'updateUser');
  return data ? mapUserRow(data) : null;
}

export async function ensureSeedAccountByEmail(email: string): Promise<DbUser | null> {
  const clean = email.toLowerCase().trim();
  const existing = await findUserByEmail(clean);
  if (existing) return existing;

  const seedMatch = getInitialSeedData().users.find((u) => u.email.toLowerCase() === clean);
  if (!seedMatch) return null;
  return createUser(seedMatch);
}

export async function ensureDefaultAnonymousUser(): Promise<DbUser> {
  const existing = await findUserById('user_anonymous');
  if (existing) return existing;

  const seedAnon = getInitialSeedData().users.find((u) => u.id === 'user_anonymous')!;
  return createUser(seedAnon);
}

// -----------------------------------------------------------------------------
// Email Verifications, Magic Links, Password Resets
// -----------------------------------------------------------------------------

export async function createEmailVerification(record: DbEmailVerification): Promise<void> {
  if (!isSupabaseConfigured()) {
    getMemoryDb().emailVerifications.push(record);
    return;
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('email_verifications').insert({
    id: record.id,
    email: record.email,
    code: record.code,
    purpose: record.purpose,
    sent_at: record.sentAt,
    expires_at: record.expiresAt,
    is_used: record.isUsed,
  });
  if (error) throwIfDbError(error, 'createEmailVerification');
}

export async function findLatestUnusedVerification(
  email: string
): Promise<DbEmailVerification | null> {
  const cleanEmail = email.toLowerCase().trim();
  if (!isSupabaseConfigured()) {
    return (
      getMemoryDb()
        .emailVerifications.filter((v) => v.email.toLowerCase() === cleanEmail && !v.isUsed)
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0] || null
    );
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('email_verifications')
    .select('*')
    .eq('email', cleanEmail)
    .eq('is_used', false)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throwIfDbError(error, 'findLatestUnusedVerification');
  return data ? mapEmailVerificationRow(data) : null;
}

export async function markVerificationUsed(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const rec = getMemoryDb().emailVerifications.find((v) => v.id === id);
    if (rec) rec.isUsed = true;
    return;
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('email_verifications')
    .update({ is_used: true })
    .eq('id', id);
  if (error) throwIfDbError(error, 'markVerificationUsed');
}

export async function getRecentEmailVerifications(
  email?: string,
  limit = 10
): Promise<DbEmailVerification[]> {
  if (!isSupabaseConfigured()) {
    let logs = [...getMemoryDb().emailVerifications].reverse();
    if (email) {
      const clean = email.toLowerCase().trim();
      logs = logs.filter((l) => l.email.toLowerCase() === clean);
    }
    return logs.slice(0, limit);
  }
  const supabase = getSupabaseClient();
  let query = supabase
    .from('email_verifications')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (email) {
    query = query.eq('email', email.toLowerCase().trim());
  }

  const { data, error } = await query;
  if (error) throwIfDbError(error, 'getRecentEmailVerifications');
  return (data || []).map(mapEmailVerificationRow);
}

export async function createMagicLink(record: DbTokenRecord): Promise<void> {
  if (!isSupabaseConfigured()) {
    getMemoryDb().magicLinks.push(record);
    return;
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('magic_links').insert({
    id: record.id,
    email: record.email,
    token: record.token,
    sent_at: record.sentAt,
    expires_at: record.expiresAt,
    is_used: record.isUsed,
  });
  if (error) throwIfDbError(error, 'createMagicLink');
}

export async function findUnusedMagicLink(token: string): Promise<DbTokenRecord | null> {
  if (!isSupabaseConfigured()) {
    return getMemoryDb().magicLinks.find((m) => m.token === token && !m.isUsed) || null;
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('magic_links')
    .select('*')
    .eq('token', token)
    .eq('is_used', false)
    .maybeSingle();
  if (error) throwIfDbError(error, 'findUnusedMagicLink');
  return data ? mapTokenRow(data) : null;
}

export async function markMagicLinkUsed(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const rec = getMemoryDb().magicLinks.find((m) => m.id === id);
    if (rec) rec.isUsed = true;
    return;
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('magic_links').update({ is_used: true }).eq('id', id);
  if (error) throwIfDbError(error, 'markMagicLinkUsed');
}

export async function createPasswordReset(record: DbTokenRecord): Promise<void> {
  if (!isSupabaseConfigured()) {
    getMemoryDb().passwordResets.push(record);
    return;
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('password_resets').insert({
    id: record.id,
    email: record.email,
    token: record.token,
    sent_at: record.sentAt,
    expires_at: record.expiresAt,
    is_used: record.isUsed,
  });
  if (error) throwIfDbError(error, 'createPasswordReset');
}

export async function findUnusedPasswordReset(token: string): Promise<DbTokenRecord | null> {
  if (!isSupabaseConfigured()) {
    return getMemoryDb().passwordResets.find((r) => r.token === token && !r.isUsed) || null;
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('password_resets')
    .select('*')
    .eq('token', token)
    .eq('is_used', false)
    .maybeSingle();
  if (error) throwIfDbError(error, 'findUnusedPasswordReset');
  return data ? mapTokenRow(data) : null;
}

export async function markPasswordResetUsed(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const rec = getMemoryDb().passwordResets.find((r) => r.id === id);
    if (rec) rec.isUsed = true;
    return;
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('password_resets').update({ is_used: true }).eq('id', id);
  if (error) throwIfDbError(error, 'markPasswordResetUsed');
}

// -----------------------------------------------------------------------------
// Transactions
// -----------------------------------------------------------------------------

export async function getTransactionsByUser(userId: string): Promise<Transaction[]> {
  if (!isSupabaseConfigured()) {
    return getMemoryDb()
      .transactions.filter((t) => t.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.date + ' ' + (b.time || '00:00')).getTime() -
          new Date(a.date + ' ' + (a.time || '00:00')).getTime()
      );
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throwIfDbError(error, 'getTransactionsByUser');

  return (data || [])
    .map(mapTransactionRow)
    .sort(
      (a, b) =>
        new Date(b.date + ' ' + (b.time || '00:00')).getTime() -
        new Date(a.date + ' ' + (a.time || '00:00')).getTime()
    );
}

export async function getAllTransactions(): Promise<Transaction[]> {
  if (!isSupabaseConfigured()) {
    return [...getMemoryDb().transactions];
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });
  if (error) throwIfDbError(error, 'getAllTransactions');
  return (data || []).map(mapTransactionRow);
}

export async function createTransaction(tx: Transaction): Promise<Transaction> {
  if (!isSupabaseConfigured()) {
    getMemoryDb().transactions.unshift(tx);
    return tx;
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('transactions')
    .insert(toTransactionRow(tx))
    .select('*')
    .single();
  if (error) throwIfDbError(error, 'createTransaction');
  return mapTransactionRow(data);
}

export async function deleteTransactionById(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const mem = getMemoryDb();
    const before = mem.transactions.length;
    mem.transactions = mem.transactions.filter((t) => t.id !== id);
    return mem.transactions.length < before;
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throwIfDbError(error, 'deleteTransactionById');
  return (data || []).length > 0;
}

// -----------------------------------------------------------------------------
// Products
// -----------------------------------------------------------------------------

export async function getProductsByUser(userId: string): Promise<ProductItem[]> {
  if (!isSupabaseConfigured()) {
    return getMemoryDb().products.filter((p) => p.userId === userId);
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throwIfDbError(error, 'getProductsByUser');
  return (data || []).map(mapProductRow);
}

export async function getAllProducts(): Promise<ProductItem[]> {
  if (!isSupabaseConfigured()) {
    return [...getMemoryDb().products];
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('products').select('*');
  if (error) throwIfDbError(error, 'getAllProducts');
  return (data || []).map(mapProductRow);
}

export async function createProducts(items: ProductItem[]): Promise<ProductItem[]> {
  if (items.length === 0) return [];
  if (!isSupabaseConfigured()) {
    getMemoryDb().products.push(...items);
    return items;
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .insert(items.map(toProductRow))
    .select('*');
  if (error) throwIfDbError(error, 'createProducts');
  return (data || []).map(mapProductRow);
}

export async function updateProductById(
  id: string,
  patch: Partial<Omit<ProductItem, 'id' | 'userId'>>
): Promise<ProductItem | null> {
  if (!isSupabaseConfigured()) {
    const prod = getMemoryDb().products.find((p) => p.id === id);
    if (!prod) return null;
    if (patch.name !== undefined) prod.name = patch.name;
    if (patch.category !== undefined) prod.category = patch.category;
    if (patch.costPrice !== undefined) prod.costPrice = Number(patch.costPrice);
    if (patch.sellingPrice !== undefined) prod.sellingPrice = Number(patch.sellingPrice);
    if (patch.stock !== undefined) prod.stock = Number(patch.stock);
    if (patch.unit !== undefined) prod.unit = patch.unit;
    return prod;
  }
  const supabase = getSupabaseClient();
  const updatePayload: Record<string, any> = {};
  if (patch.name !== undefined) updatePayload.name = patch.name;
  if (patch.category !== undefined) updatePayload.category = patch.category;
  if (patch.costPrice !== undefined) updatePayload.cost_price = Number(patch.costPrice);
  if (patch.sellingPrice !== undefined) updatePayload.selling_price = Number(patch.sellingPrice);
  if (patch.stock !== undefined) updatePayload.stock = Number(patch.stock);
  if (patch.unit !== undefined) updatePayload.unit = patch.unit;

  const { data, error } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throwIfDbError(error, 'updateProductById');
  return data ? mapProductRow(data) : null;
}

export async function deleteProductById(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const mem = getMemoryDb();
    mem.products = mem.products.filter((p) => p.id !== id);
    return;
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throwIfDbError(error, 'deleteProductById');
}

export async function decrementProductStock(
  userId: string,
  cartItems: Array<{ productId?: string; qty?: number }>
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const mem = getMemoryDb();
    for (const ci of cartItems) {
      if (!ci.productId) continue;
      const prod = mem.products.find((p) => p.id === ci.productId && p.userId === userId);
      if (prod) {
        prod.stock = Math.max(0, Number(prod.stock || 0) - Number(ci.qty || 0));
      }
    }
    return;
  }
  const supabase = getSupabaseClient();
  for (const ci of cartItems) {
    if (!ci.productId) continue;
    const { data, error } = await supabase
      .from('products')
      .select('id, stock')
      .eq('id', ci.productId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throwIfDbError(error, 'decrementProductStock:read');
    if (data) {
      const nextStock = Math.max(0, Number(data.stock || 0) - Number(ci.qty || 0));
      const { error: upErr } = await supabase
        .from('products')
        .update({ stock: nextStock })
        .eq('id', data.id);
      if (upErr) throwIfDbError(upErr, 'decrementProductStock:update');
    }
  }
}

// -----------------------------------------------------------------------------
// Notifications
// -----------------------------------------------------------------------------

export async function getNotificationsByUser(userId: string): Promise<NotificationItem[]> {
  if (!isSupabaseConfigured()) {
    return getMemoryDb()
      .notifications.filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throwIfDbError(error, 'getNotificationsByUser');
  return (data || []).map(mapNotificationRow);
}

export async function createNotification(notif: NotificationItem): Promise<NotificationItem> {
  if (!isSupabaseConfigured()) {
    getMemoryDb().notifications.unshift(notif);
    return notif;
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .insert(toNotificationRow(notif))
    .select('*')
    .single();
  if (error) throwIfDbError(error, 'createNotification');
  return mapNotificationRow(data);
}

export async function markNotificationsRead(userId: string, notifId?: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const notifs = getMemoryDb().notifications;
    if (notifId) {
      const target = notifs.find((n) => n.id === notifId);
      if (target) target.isRead = true;
    } else {
      notifs.filter((n) => n.userId === userId).forEach((n) => (n.isRead = true));
    }
    return;
  }
  const supabase = getSupabaseClient();
  let query = supabase.from('notifications').update({ is_read: true });
  if (notifId) {
    query = query.eq('id', notifId);
  } else {
    query = query.eq('user_id', userId);
  }
  const { error } = await query;
  if (error) throwIfDbError(error, 'markNotificationsRead');
}

// -----------------------------------------------------------------------------
// Support Chats
// -----------------------------------------------------------------------------

export async function getSupportChatById(threadId: string): Promise<SupportChatThread | null> {
  if (!isSupabaseConfigured()) {
    return getMemoryDb().supportChats.find((c) => c.id === threadId) || null;
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('support_chats')
    .select('*')
    .eq('id', threadId)
    .maybeSingle();
  if (error) throwIfDbError(error, 'getSupportChatById');
  return data ? mapSupportChatRow(data) : null;
}

export async function getSupportChatsByUser(userId: string): Promise<SupportChatThread[]> {
  if (!isSupabaseConfigured()) {
    return getMemoryDb()
      .supportChats.filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('support_chats')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throwIfDbError(error, 'getSupportChatsByUser');
  return (data || []).map(mapSupportChatRow);
}

export async function getLatestSupportChatByUser(
  userId: string
): Promise<SupportChatThread | null> {
  if (!isSupabaseConfigured()) {
    return (await getSupportChatsByUser(userId))[0] || null;
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('support_chats')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throwIfDbError(error, 'getLatestSupportChatByUser');
  return data ? mapSupportChatRow(data) : null;
}

export async function getAllSupportChats(): Promise<SupportChatThread[]> {
  if (!isSupabaseConfigured()) {
    return [...getMemoryDb().supportChats].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('support_chats')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throwIfDbError(error, 'getAllSupportChats');
  return (data || []).map(mapSupportChatRow);
}

export async function upsertSupportChat(
  thread: SupportChatThread
): Promise<SupportChatThread> {
  if (!isSupabaseConfigured()) {
    const mem = getMemoryDb();
    const idx = mem.supportChats.findIndex((c) => c.id === thread.id);
    if (idx >= 0) {
      mem.supportChats[idx] = thread;
    } else {
      mem.supportChats.unshift(thread);
    }
    return thread;
  }
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('support_chats')
    .upsert(toSupportChatRow(thread), { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throwIfDbError(error, 'upsertSupportChat');
  return mapSupportChatRow(data);
}

// -----------------------------------------------------------------------------
// Full Reset to Seed Data
// -----------------------------------------------------------------------------

export async function resetDatabaseToSeed(): Promise<void> {
  const seed = getInitialSeedData();

  if (!isSupabaseConfigured()) {
    globalForDb.__finsightMemoryDb = seed;
    return;
  }

  const supabase = getSupabaseClient();

  for (const table of [
    'support_chats',
    'notifications',
    'products',
    'transactions',
    'email_verifications',
    'magic_links',
    'password_resets',
    'users',
  ]) {
    const { error } = await supabase.from(table).delete().neq('id', '');
    if (error) throwIfDbError(error, `resetDatabaseToSeed:clear_${table}`);
  }

  const { error: usersErr } = await supabase.from('users').insert(seed.users.map(toUserRow));
  if (usersErr) throwIfDbError(usersErr, 'resetDatabaseToSeed:users');

  if (seed.emailVerifications.length > 0) {
    const { error } = await supabase.from('email_verifications').insert(
      seed.emailVerifications.map((ev) => ({
        id: ev.id,
        email: ev.email,
        code: ev.code,
        purpose: ev.purpose,
        sent_at: ev.sentAt,
        expires_at: ev.expiresAt,
        is_used: ev.isUsed,
      }))
    );
    if (error) throwIfDbError(error, 'resetDatabaseToSeed:email_verifications');
  }

  if (seed.products.length > 0) {
    const { error } = await supabase.from('products').insert(seed.products.map(toProductRow));
    if (error) throwIfDbError(error, 'resetDatabaseToSeed:products');
  }

  if (seed.transactions.length > 0) {
    const { error } = await supabase
      .from('transactions')
      .insert(seed.transactions.map(toTransactionRow));
    if (error) throwIfDbError(error, 'resetDatabaseToSeed:transactions');
  }

  if (seed.notifications.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .insert(seed.notifications.map(toNotificationRow));
    if (error) throwIfDbError(error, 'resetDatabaseToSeed:notifications');
  }

  if (seed.supportChats.length > 0) {
    const { error } = await supabase
      .from('support_chats')
      .insert(seed.supportChats.map(toSupportChatRow));
    if (error) throwIfDbError(error, 'resetDatabaseToSeed:support_chats');
  }
}
