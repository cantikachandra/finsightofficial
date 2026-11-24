import React, { useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  X,
  Send,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { SupportChatThread, User } from '../types';

interface SupportChatbotWidgetProps {
  user?: User | null;
}

const THREAD_STORAGE_KEY = 'finsight_support_thread_id';

export const SupportChatbotWidget: React.FC<SupportChatbotWidgetProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(THREAD_STORAGE_KEY);
    }
    return null;
  });
  const [thread, setThread] = useState<SupportChatThread | null>(null);
  const [guestName, setGuestName] = useState(user?.fullName || '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone || '');
  const [topic, setTopic] = useState('Lupa Password & Akun');
  const [inputMsg, setInputMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user) {
      setGuestName(user.fullName);
      setGuestEmail(user.email);
      setGuestPhone(user.phone);
    }
  }, [user]);

  const fetchThread = async () => {
    try {
      if (threadId) {
        const res = await fetch(`/api/chats?threadId=${encodeURIComponent(threadId)}`);
        const data = await res.json();
        if (data.thread) {
          setThread(data.thread);
          return;
        }
      }
      if (user?.id) {
        const res = await fetch(`/api/chats?userId=${encodeURIComponent(user.id)}`);
        const data = await res.json();
        if (Array.isArray(data.threads) && data.threads.length > 0) {
          setThread(data.threads[0]);
          setThreadId(data.threads[0].id);
          localStorage.setItem(THREAD_STORAGE_KEY, data.threads[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch chat thread', e);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchThread();
    const interval = setInterval(fetchThread, 3500);
    return () => clearInterval(interval);
  }, [isOpen, threadId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length, isOpen]);

  const sendMessage = async (textOverride?: string, topicOverride?: string) => {
    const content = (textOverride ?? inputMsg).trim();
    if (!content) return;

    setSending(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/chats/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: threadId || undefined,
          userId: user?.id,
          guestName: guestName.trim() || user?.fullName || 'Pengguna FinSight',
          guestEmail: guestEmail.trim() || user?.email || '',
          guestPhone: guestPhone.trim() || user?.phone || '',
          businessName: user?.businessName || '',
          topic: topicOverride || topic,
          message: content,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim pesan.');
      }
      if (data.thread) {
        setThread(data.thread);
        setThreadId(data.thread.id);
        localStorage.setItem(THREAD_STORAGE_KEY, data.thread.id);
      }
      if (!textOverride) setInputMsg('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="no-print fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="w-[340px] sm:w-[390px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[540px]">
          {/* Header */}
          <div className="bg-blue-700 dark:bg-blue-800 text-white px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm leading-tight">
                  AI Asisten &amp; Bantuan Admin FinSight
                </h4>
                <p className="text-[10px] text-blue-100">
                  Password &rarr; Admin &middot; Tata Kelola &amp; Fitur &rarr; AI
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {thread && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(THREAD_STORAGE_KEY);
                    setThread(null);
                    setThreadId(null);
                  }}
                  className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                  title="Mulai Percakapan Baru"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Routing Notice Banner */}
          <div className="bg-blue-50 dark:bg-blue-950/60 border-b border-blue-100 dark:border-blue-900 px-3.5 py-2 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span>
              <b>Khusus Password/Akun</b> diarahkan langsung ke <b>Admin FinSight</b>. Pertanyaan <b>tata cara pengelolaan &amp; pembukuan</b> dijawab langsung oleh <b>AI</b>.
            </span>
          </div>

          {/* Guest identity bar when not logged in */}
          {!user && !thread && (
            <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Identitas Anda (agar Admin bisa cek akun Anda):
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-800 dark:text-slate-100"
                />
                <input
                  type="text"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="Email / No. HP"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/40 dark:bg-slate-950/50 min-h-[220px]">
            {(!thread || thread.messages.length === 0) && (
              <div className="space-y-3">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-xs p-3 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  Halo {user?.fullName || 'Sobat UMKM'}! Tanya saya soal <b>tata cara pengelolaan keuangan UMKM, Kasir POS, Scan Nota, atau Laporan Buku Besar</b> (dijawab instan oleh AI). Khusus <b>lupa kata sandi / kendala akun</b> akan langsung diteruskan ke <b>Admin FinSight</b>.
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Pilih Topik Cepat:
                  </div>
                  {[
                    {
                      label: 'Lupa Password / Kendala Akun (Direct ke Admin)',
                      topic: 'Lupa Password & Akun',
                      msg: 'Halo Admin, saya lupa kata sandi akun saya. Mohon bantuan pengecekan atau reset password.',
                      badge: 'Admin',
                    },
                    {
                      label: 'Tata Cara Pengelolaan Kas & Keuangan UMKM (Tanya AI)',
                      topic: 'Tata Cara Pengelolaan Keuangan',
                      msg: 'Bagaimana tata cara pengelolaan keuangan UMKM yang sehat, memisahkan kas pribadi dan usaha, serta menjaga margin laba?',
                      badge: 'AI',
                    },
                    {
                      label: 'Cara Baca Laporan Laba Rugi, Neraca & Buku Besar (Tanya AI)',
                      topic: 'Panduan Fitur & Pembukuan',
                      msg: 'Jelaskan cara menggunakan fitur Kasir POS, Scan Nota OCR, dan membaca Laporan Laba Rugi, Neraca, serta Buku Besar di FinSight.',
                      badge: 'AI',
                    },
                  ].map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => {
                        setTopic(q.topic);
                        sendMessage(q.msg, q.topic);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-blue-300 text-xs font-semibold text-blue-800 dark:text-blue-300 transition-colors cursor-pointer flex items-center justify-between gap-2"
                    >
                      <span>{q.label}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          q.badge === 'Admin'
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                            : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        {q.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {thread?.messages.map((m) => {
              const isUser = m.sender === 'user';
              const isAdmin = m.sender === 'admin';
              const isAi = Boolean(m.isAi);
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] font-semibold text-slate-400 mb-0.5 px-1">
                    {isUser
                      ? 'Anda'
                      : isAdmin
                      ? `${m.senderName} (Admin)`
                      : isAi
                      ? 'AI Asisten FinSight'
                      : m.senderName}{' '}
                    &middot;{' '}
                    {new Date(m.createdAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : isAdmin
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 rounded-tl-xs'
                        : isAi
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-100 rounded-tl-xs'
                        : 'bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 rounded-tl-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {errorMsg && (
            <div className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 text-[11px] border-t border-rose-200 dark:border-rose-800">
              {errorMsg}
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Tulis pertanyaan atau keluhan Anda..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800"
            />
            <button
              type="submit"
              disabled={sending || !inputMsg.trim()}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors cursor-pointer shrink-0"
              title="Kirim ke Admin"
            >
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xl shadow-blue-600/30 flex items-center gap-2 transition-transform hover:scale-105 cursor-pointer"
      >
        <MessageSquare className="w-4 h-4" />
        <span>{isOpen ? 'Tutup Bantuan' : 'AI & Bantuan Admin'}</span>
      </button>
    </div>
  );
};
