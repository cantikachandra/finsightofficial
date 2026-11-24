<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FinSight UMKM - Masuk &amp; Daftar Akun</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
    <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-gradient-to-br from-slate-50 via-blue-50/40 to-sky-50 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <!-- Kolom Kiri: Foto Keuangan Asli & Nilai Unggulan (Pristine tanpa badge teks) -->
        <div class="relative bg-gradient-to-br from-blue-900 to-indigo-950 p-8 text-white flex flex-col justify-between overflow-hidden">
            <div class="absolute inset-0 opacity-25 mix-blend-overlay">
                <img src="/src/assets/images/real_financial_charts.jpg" alt="FinSight Financial Analytics" class="w-full h-full object-cover">
            </div>

            <div class="relative z-10">
                <div class="flex items-center gap-2.5 mb-6">
                    <img src="/assets/aistudio/Logo_FinSight_Biru_Mengilap_c4e93b1f.png" alt="FinSight Logo" class="h-10 w-auto">
                    <div>
                        <div class="font-black text-xl font-mono tracking-tight">FinSight</div>
                        <div class="text-[10px] text-blue-200 tracking-wider uppercase font-semibold">SAK EMKM &amp; QRIS Platform</div>
                    </div>
                </div>

                <h2 class="text-2xl font-bold leading-tight">
                    Otomasi Pembukuan &amp; Laporan Keuangan Siap Pinjam Bank.
                </h2>
                <p class="text-xs text-blue-100/90 mt-2 leading-relaxed">
                    Dirancang untuk pemilik UMKM. Cukup foto struk nota belanja, mutasi QRIS otomatis tercatat, dan laporan Laba Rugi serta Neraca siap diunduh dalam hitungan detik.
                </p>
            </div>

            <div class="relative z-10 mt-8 space-y-2 text-xs text-blue-100/80 border-t border-white/10 pt-6">
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span>Tabel Laba Rugi &amp; Neraca SAK EMKM Standar Bank</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Buku Kas &amp; Pendapatan Harian Otomatis</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Konfirmasi Lupa Password via: <strong class="text-white">finsight.offc@gmail.com</strong></span>
                </div>
            </div>
        </div>

        <!-- Kolom Kanan: Form Masuk & Daftar Akun Baru -->
        <div class="p-6 sm:p-8 flex flex-col justify-center">
            <!-- Tab Switcher -->
            <div class="flex rounded-xl bg-slate-100 p-1 mb-5 border border-slate-200 text-xs font-bold">
                <button
                    type="button"
                    onclick="switchTab('login')"
                    id="tab-login"
                    class="flex-1 py-2 rounded-lg bg-white text-blue-700 shadow-sm transition-all"
                >
                    Masuk Akun
                </button>
                <button
                    type="button"
                    onclick="switchTab('register')"
                    id="tab-register"
                    class="flex-1 py-2 rounded-lg text-slate-500 hover:text-slate-800 transition-all"
                >
                    Daftar Akun Baru
                </button>
            </div>

            @if(session('success'))
                <div class="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                    {{ session('success') }}
                </div>
            @endif
            @if(session('error'))
                <div class="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                    {{ session('error') }}
                </div>
            @endif

            <!-- 1. FORM LOGIN -->
            <form id="form-login" action="/login" method="POST" class="space-y-3.5">
                @csrf
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Email atau Nomor HP</label>
                    <input
                        type="text"
                        name="email"
                        required
                        value="{{ old('email') }}"
                        placeholder="contoh@gmail.com atau 081234567890"
                        class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                </div>

                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-xs font-bold text-slate-700">Kata Sandi (Password)</label>
                        <button type="button" onclick="toggleForgot()" class="text-[11px] text-blue-600 hover:underline font-semibold">
                            Lupa Password?
                        </button>
                    </div>
                    <input
                        type="password"
                        name="password"
                        required
                        placeholder="Masukkan kata sandi Anda"
                        class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                </div>

                <button
                    type="submit"
                    class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer mt-2"
                >
                    Masuk ke FinSight &rarr;
                </button>
            </form>

            <!-- 2. FORM REGISTER (PASSWORD BUAT SENDIRI, KONFIRMASI HARUS SAMA & NO HP UNIK) -->
            <form id="form-register" action="/register" method="POST" class="space-y-3 hidden">
                @csrf
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                    <input
                        type="text"
                        name="full_name"
                        required
                        placeholder="Nama Pemilik Usaha"
                        class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Nama Usaha UMKM</label>
                    <input
                        type="text"
                        name="business_name"
                        placeholder="Nama Toko / Usaha"
                        class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Nomor HP (Unik) *</label>
                        <input
                            type="tel"
                            name="phone"
                            required
                            placeholder="081234567890"
                            class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                        <input
                            type="email"
                            name="email"
                            required
                            placeholder="email@gmail.com"
                            class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Kata Sandi *</label>
                        <input
                            type="password"
                            name="password"
                            required
                            minlength="6"
                            placeholder="Min. 6 huruf"
                            class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Konfirmasi Sandi *</label>
                        <input
                            type="password"
                            name="password_confirmation"
                            required
                            placeholder="Ketik ulang sama"
                            class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                    </div>
                </div>

                <button
                    type="submit"
                    class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer mt-2"
                >
                    Daftar Akun Baru &rarr;
                </button>
            </form>

            <!-- 3. FORM LUPA PASSWORD (KIRIM LINK KONFIRMASI BENERAN VIA GMAIL) -->
            <form id="form-forgot" action="/forgot-password" method="POST" class="space-y-3.5 hidden">
                @csrf
                <div class="border-b pb-2">
                    <button type="button" onclick="toggleForgot()" class="text-xs text-blue-600 font-bold hover:underline mb-1">
                        &larr; Kembali ke Login
                    </button>
                    <h4 class="text-sm font-bold text-slate-800">Lupa Kata Sandi</h4>
                    <p class="text-[11px] text-slate-500">
                        Link konfirmasi perubahan password akan dikirim resmi dari <b>finsight.offc@gmail.com</b>.
                    </p>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Alamat Email Terdaftar</label>
                    <input
                        type="email"
                        name="email"
                        required
                        placeholder="contoh@gmail.com"
                        class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                </div>

                <button
                    type="submit"
                    class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                >
                    Kirim Link Konfirmasi ke Email &rarr;
                </button>
            </form>

            <!-- Tombol 1-Click Tamu (Anonymous) -->
            <div class="relative my-4 text-center">
                <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200"></div></div>
                <span class="relative bg-white px-3 text-[10px] text-slate-400 font-bold uppercase">atau</span>
            </div>

            <a
                href="/auth/demo"
                class="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs text-center transition-colors flex items-center justify-center gap-2"
            >
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Masuk Cepat Tamu (Anonymous)
            </a>
        </div>
    </div>

    <script>
        function switchTab(tab) {
            document.getElementById('form-forgot').classList.add('hidden');
            if (tab === 'login') {
                document.getElementById('form-login').classList.remove('hidden');
                document.getElementById('form-register').classList.add('hidden');
                document.getElementById('tab-login').className = "flex-1 py-2 rounded-lg bg-white text-blue-700 shadow-sm transition-all";
                document.getElementById('tab-register').className = "flex-1 py-2 rounded-lg text-slate-500 hover:text-slate-800 transition-all";
            } else {
                document.getElementById('form-login').classList.add('hidden');
                document.getElementById('form-register').classList.remove('hidden');
                document.getElementById('tab-register').className = "flex-1 py-2 rounded-lg bg-white text-blue-700 shadow-sm transition-all";
                document.getElementById('tab-login').className = "flex-1 py-2 rounded-lg text-slate-500 hover:text-slate-800 transition-all";
            }
        }

        function toggleForgot() {
            document.getElementById('form-login').classList.toggle('hidden');
            document.getElementById('form-register').classList.add('hidden');
            document.getElementById('form-forgot').classList.toggle('hidden');
        }
    </script>
</body>
</html>
