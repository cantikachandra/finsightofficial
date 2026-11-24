<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'FinSight UMKM - Sistem Keuangan & QRIS Pintar')</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            body { background: white !important; color: black !important; }
        }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased min-h-screen flex flex-col">
    <!-- Navbar -->
    <header class="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <!-- Logo -->
                <div class="flex items-center gap-3">
                    <a href="/dashboard" class="flex items-center gap-2.5">
                        <img src="/assets/aistudio/Logo_FinSight_Biru_Mengilap_c4e93b1f.png" alt="FinSight Logo" class="h-10 w-auto object-contain">
                        <div>
                            <div class="flex items-center gap-1.5">
                                <span class="font-extrabold text-lg tracking-tight text-slate-900 font-mono">FinSight</span>
                                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">SME</span>
                            </div>
                            <p class="text-[10px] text-slate-400 leading-none">QRIS &amp; Funding-Ready Platform</p>
                        </div>
                    </a>
                </div>

                <!-- Nav Links -->
                <div class="flex items-center gap-3">
                    <a href="/dashboard" class="text-xs font-semibold px-3 py-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        Dashboard
                    </a>
                    <a href="/reports" class="text-xs font-semibold px-3 py-2 rounded-xl bg-blue-600 text-white shadow-xs hover:bg-blue-700 transition-colors">
                        Laporan Laba Rugi &amp; Neraca
                    </a>
                    <a href="/logout" class="text-xs font-semibold px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors">
                        Keluar
                    </a>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        @if(session('success'))
            <div class="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                <span>{{ session('success') }}</span>
            </div>
        @endif
        @if(session('error'))
            <div class="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
                <span>{{ session('error') }}</span>
            </div>
        @endif

        @yield('content')
    </main>

    <!-- Footer -->
    <footer class="no-print bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>&copy; {{ date('Y') }} FinSight Indonesia. Sesuai Standar Akuntansi Keuangan Entitas Mikro Kecil Menengah (SAK EMKM).</p>
    </footer>
</body>
</html>
