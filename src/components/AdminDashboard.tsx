import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  KeyRound,
  FileSpreadsheet,
  MessageSquare,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Send,
  RefreshCw,
  ShieldCheck,
  Store,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AdminUserFinancialSummary, SupportChatThread, User } from '../types';
import { formatRupiah } from '../utils/exportReport';
import { checkPasswordStrength } from '../utils/password';
import { FundingReadyReportModal } from './FundingReadyReportModal';

interface AdminDashboardProps {
  adminUser: User;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminUser }) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'reports' | 'chats'>('accounts');
  const [users, setUsers] = useState<User[]>([]);
  const [userSummaries, setUserSummaries] = useState<AdminUserFinancialSummary[]>([]);
  const [supportChats, setSupportChats] = useState<SupportChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Accounts Search & Password visibility
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Direct Password Reset inline modal state
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetting, setResetting] = useState(false);

  // Selected Report Modal for inspecting any UMKM user's financial statements
  const [inspectedSummary, setInspectedSummary] = useState<AdminUserFinancialSummary | null>(null);

  // Chat Console State
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const loadOverview = async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/overview?adminId=${encodeURIComponent(adminUser.id)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuat data Admin.');
      }
      setUsers(data.users || []);
      setUserSummaries(data.userSummaries || []);
      const chats: SupportChatThread[] = data.supportChats || [];
      setSupportChats(chats);
      if (!selectedThreadId && chats.length > 0) {
        setSelectedThreadId(chats[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    const interval = setInterval(() => loadOverview(true), 6000);
    return () => clearInterval(interval);
  }, [adminUser.id]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.businessName || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const toggleRevealPassword = (userId: string) => {
    setRevealedIds((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const copyPassword = (userId: string, pass?: string) => {
    if (!pass) return;
    navigator.clipboard?.writeText(pass);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    const pwCheck = checkPasswordStrength(newPasswordInput);
    if (!pwCheck.isValid) {
      setErrorMsg(
        pwCheck.firstError ||
          'Kata sandi baru minimal 8 karakter dan wajib mengandung huruf besar, huruf kecil, angka, serta simbol.'
      );
      return;
    }
    setResetting(true);
    setErrorMsg(null);
    setActionMsg(null);
    try {
      const res = await fetch('/api/admin/reset-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: adminUser.id,
          targetUserId: resetTarget.id,
          newPassword: newPasswordInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui kata sandi.');

      setActionMsg(data.message);
      setResetTarget(null);
      setNewPasswordInput('');
      await loadOverview(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setResetting(false);
    }
  };

  const selectedThread = useMemo(
    () => supportChats.find((c) => c.id === selectedThreadId) || supportChats[0] || null,
    [supportChats, selectedThreadId]
  );

  const unreadChatsCount = useMemo(
    () => supportChats.filter((c) => c.escalatedToAdmin && (c.unreadByAdmin || c.status === 'escalated')).length,
    [supportChats]
  );

  const totalCombinedRevenue = useMemo(
    () => userSummaries.reduce((sum, s) => sum + Number(s.totalIncome || 0), 0),
    [userSummaries]
  );

  const handleSendReply = async (e: React.FormEvent, resolve = false) => {
    e.preventDefault();
    if (!selectedThread || !replyText.trim()) return;
    setSendingReply(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/chats/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: adminUser.id,
          threadId: selectedThread.id,
          replyText: replyText.trim(),
          resolve,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim balasan.');

      setReplyText('');
      await loadOverview(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Admin Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Dashboard Administrator FinSight
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kelola database akun &amp; kata sandi pengguna (bantuan lupa password), tinjau laporan keuangan UMKM, dan balas pesan bantuan dari Chatbot.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadOverview()}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Total Akun Terdaftar</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {users.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Termasuk owner &amp; tamu</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Usaha UMKM Aktif</span>
            <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {userSummaries.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Dengan pembukuan berjalan</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Akumulasi Omzet UMKM</span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-700 dark:text-blue-400 mt-1.5 tabular-nums">
            {formatRupiah(totalCombinedRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Total pendapatan seluruh usaha</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Chat Menunggu Balasan</span>
            <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {unreadChatsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Eskalasi dari Chatbot FinSight</div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'accounts'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>1. Database Akun &amp; Kata Sandi ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'reports'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>2. Laporan Keuangan Pengguna ({userSummaries.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chats')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'chats'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>3. Inbox Chatbot &amp; Bantuan User ({supportChats.length})</span>
        </button>
      </div>

      {/* TAB 1: DATABASE AKUN & KATA SANDI */}
      {activeTab === 'accounts' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Database Akun Pengguna &amp; Pemulihan Kata Sandi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gunakan tabel ini untuk membantu pengguna yang menghubungi Admin karena lupa kata sandi atau kesulitan masuk.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, email, usaha, atau no HP..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nama Pemilik &amp; Role</th>
                  <th className="py-3 px-4">Usaha UMKM</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Nomor HP</th>
                  <th className="py-3 px-4">Kata Sandi Tersimpan</th>
                  <th className="py-3 px-4 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => {
                  const revealed = Boolean(revealedIds[u.id]);
                  const summary = userSummaries.find((s) => s.user.id === u.id);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{u.fullName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                          Role: {u.role} &middot; {u.city}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-200 font-medium">{u.businessName}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-blue-800 dark:text-blue-400">{u.email}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">{u.phone}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-slate-900 dark:text-slate-100 min-w-[110px]">
                            {revealed ? u.passwordHash || '-' : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealPassword(u.id)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title={revealed ? 'Sembunyikan' : 'Tampilkan Password'}
                          >
                            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyPassword(u.id, u.passwordHash)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="Salin Kata Sandi"
                          >
                            {copiedId === u.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setResetTarget(u);
                              setNewPasswordInput('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/70 text-blue-800 dark:text-blue-300 font-semibold text-[11px] cursor-pointer"
                          >
                            Reset Sandi
                          </button>
                          {summary && (
                            <button
                              type="button"
                              onClick={() => setInspectedSummary(summary)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-[11px] cursor-pointer"
                            >
                              Laporan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LAPORAN KEUANGAN PENGGUNA */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Rekap Laporan Keuangan Seluruh Akun UMKM
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Klik &quot;Buka Laporan Lengkap&quot; pada salah satu usaha untuk melihat Laba Rugi, Neraca, Kas Harian, Buku Besar, atau mengunduh Excel (.XLSX).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nama Usaha &amp; Pemilik</th>
                  <th className="py-3 px-4 text-center">Transaksi</th>
                  <th className="py-3 px-4 text-right">Total Omzet</th>
                  <th className="py-3 px-4 text-right">Total Pengeluaran</th>
                  <th className="py-3 px-4 text-right">Laba Bersih</th>
                  <th className="py-3 px-4 text-center">Kesehatan Usaha</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {userSummaries.map((s) => (
                  <tr key={s.user.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{s.user.businessName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {s.user.fullName} &middot; {s.user.email}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                      {s.transactionCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatRupiah(s.totalIncome)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                      {formatRupiah(s.totalExpense)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatRupiah(s.netProfit)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                          s.healthStatus === 'hijau'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : s.healthStatus === 'kuning'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        Zona {s.healthStatus.toUpperCase()} ({s.healthScore})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setInspectedSummary(s)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Buka Laporan Lengkap
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INBOX CHATBOT & BANTUAN USER */}
      {activeTab === 'chats' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Threads List */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Daftar Pesan Masuk ({supportChats.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
              {supportChats.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada chat masuk dari pengguna.
                </div>
              ) : (
                supportChats.map((c) => {
                  const isSelected = selectedThread?.id === c.id;
                  const lastMsg = c.messages[c.messages.length - 1];
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedThreadId(c.id)}
                      className={`w-full text-left p-4 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/80 dark:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {c.guestName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            c.status === 'replied'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : c.status === 'resolved'
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              : c.escalatedToAdmin
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {c.status === 'replied'
                            ? 'Dibalas Admin'
                            : c.status === 'resolved'
                            ? 'Selesai'
                            : c.escalatedToAdmin
                            ? 'Khusus Admin'
                            : 'Dijawab AI'}
                        </span>
                      </div>
                      <div className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold mt-0.5">
                        {c.topic}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                        {lastMsg?.text || '-'}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Conversation & Reply Box */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col min-h-[500px]">
            {selectedThread ? (
              <>
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60 dark:bg-slate-800/50">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedThread.guestName}{' '}
                      {selectedThread.businessName && (
                        <span className="text-slate-500 dark:text-slate-400 font-normal">
                          &middot; {selectedThread.businessName}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {selectedThread.guestEmail || 'Tanpa Email'}{' '}
                      {selectedThread.guestPhone ? `· ${selectedThread.guestPhone}` : ''} &middot; Topik:{' '}
                      <span className="text-blue-700 dark:text-blue-400 font-sans font-semibold">
                        {selectedThread.topic}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transcript */}
                <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[340px] bg-slate-50/30 dark:bg-slate-950/50">
                  {selectedThread.messages.map((m) => {
                    const isAdmin = m.sender === 'admin';
                    const isUser = m.sender === 'user';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] font-semibold text-slate-400 mb-0.5 px-1">
                          {isAdmin
                            ? `${m.senderName} (Admin)`
                            : isUser
                            ? `${m.senderName} (Pengguna)`
                            : m.isAi
                            ? 'AI Asisten FinSight'
                            : 'Routing Admin FinSight'}{' '}
                          &middot;{' '}
                          {new Date(m.createdAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <div
                          className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isAdmin
                              ? 'bg-blue-600 text-white rounded-tr-xs'
                              : isUser
                              ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                              : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 rounded-tl-xs italic'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Reply Helpers + Form */}
                <form
                  onSubmit={(e) => handleSendReply(e, false)}
                  className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mr-1">
                      Balasan Cepat:
                    </span>
                    {[
                      'Halo, kami telah memeriksa akun Anda dan membantu mengatur ulang kata sandi. Silakan coba login kembali.',
                      'Laporan Laba Rugi, Neraca, dan Buku Besar dapat langsung diunduh dalam format .XLSX pada tab Laporan Keuangan.',
                    ].map((tpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReplyText(tpl)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-[11px] text-slate-700 dark:text-slate-300 hover:text-blue-800 cursor-pointer"
                      >
                        Template {idx + 1}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Tulis balasan Admin untuk pengguna ini..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Balasan</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-10 text-xs text-slate-400">
                Pilih percakapan di sebelah kiri untuk membaca dan membalas pesan pengguna.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline Password Reset Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleResetPassword}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Atur Ulang Kata Sandi Pengguna
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Akun: <b>{resetTarget.fullName}</b> ({resetTarget.email})
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kata Sandi Baru (Min. 8 Karakter + Simbol)
              </label>
              <input
                type="text"
                required
                minLength={8}
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Contoh: SandiBaru#2026!"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                autoFocus
              />
              {(() => {
                const s = checkPasswordStrength(newPasswordInput);
                return (
                  <div className="grid grid-cols-2 gap-1 mt-2 text-[10px]">
                    {[
                      { ok: s.minLength, text: 'Min. 8 karakter' },
                      { ok: s.hasUpper, text: 'Huruf besar (A-Z)' },
                      { ok: s.hasLower, text: 'Huruf kecil (a-z)' },
                      { ok: s.hasNumber, text: 'Angka (0-9)' },
                      { ok: s.hasSymbol, text: 'Simbol (!@#$%)' },
                    ].map((r) => (
                      <span
                        key={r.text}
                        className={`inline-flex items-center gap-1 ${
                          r.ok ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5" />
                        {r.text}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={resetting}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                {resetting ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inspect User Financial Report Modal */}
      {inspectedSummary && (
        <FundingReadyReportModal
          isOpen={true}
          onClose={() => setInspectedSummary(null)}
          transactions={inspectedSummary.transactions}
          user={inspectedSummary.user}
          health={inspectedSummary.health}
        />
      )}
    </div>
  );
};
