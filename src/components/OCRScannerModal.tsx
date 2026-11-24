import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Check,
  RefreshCw,
  FileText,
  AlertCircle,
  ShoppingBag,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Hash,
  BookOpen,
} from 'lucide-react';
import { TransactionCategory, TransactionType } from '../types';
import { playExpenseSound, playIncomeSound, sendBrowserNotification } from '../utils/notification';
import { formatRupiah } from '../utils/exportReport';

interface OCRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onTransactionSaved: () => void;
}

interface ScannedItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

interface DetectedNumberItem {
  label: string;
  rawToken: string;
  value: number;
}

export const OCRScannerModal: React.FC<OCRScannerModalProps> = ({
  isOpen,
  onClose,
  userId,
  onTransactionSaved,
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload'>('upload');
  const [step, setStep] = useState<'capture' | 'detected' | 'bookkeeping'>('capture');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [scanResult, setScanResult] = useState<{
    rawText: string;
    detectedNumbers: DetectedNumberItem[];
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    merchantName: string;
    date: string;
    totalAmount: number;
    category: TransactionCategory;
    paymentMethod: string;
    referenceNo: string;
    items: ScannedItem[];
    confidenceScore: number;
    summaryNotes: string;
    txType: TransactionType;
    ledgerDescription: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraError(
        'Kamera tidak dapat diakses atau diblokir oleh browser. Silakan unggah foto struk/nota melalui tab Unggah File.'
      );
      setActiveMode('upload');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen && activeMode === 'camera' && step === 'capture' && !imagePreview && !scanning) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode, facingMode, imagePreview, step, scanning]);

  if (!isOpen) return null;

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setImagePreview(dataUrl);
      stopCamera();
      processReceiptOcr(dataUrl);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
        stopCamera();
        processReceiptOcr(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const processReceiptOcr = async (base64Img: string) => {
    setScanning(true);
    setScanError(null);
    setScanResult(null);
    try {
      const res = await fetch('/api/ocr/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Img }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Gagal membaca teks dan angka dari gambar struk.');
      }

      const d = data.data;
      const items: ScannedItem[] = Array.isArray(d.items) ? d.items : [];
      const itemSummary = items
        .filter((i) => i.name?.trim())
        .map((i) => i.name)
        .slice(0, 2)
        .join(', ');
      const merchant = d.merchantName || 'Toko / Pemasok';

      const fallbackNumbers: DetectedNumberItem[] = Array.isArray(d.detectedNumbers) && d.detectedNumbers.length > 0
        ? d.detectedNumbers
        : [
            ...(Number(d.subtotal || 0) > 0
              ? [{ label: 'Subtotal', rawToken: formatRupiah(Number(d.subtotal)), value: Number(d.subtotal) }]
              : []),
            ...(Number(d.totalAmount || 0) > 0
              ? [{ label: 'Total Nota', rawToken: formatRupiah(Number(d.totalAmount)), value: Number(d.totalAmount) }]
              : []),
          ];

      setScanResult({
        rawText: d.rawText || '',
        detectedNumbers: fallbackNumbers,
        subtotal: Number(d.subtotal || d.totalAmount || 0),
        taxAmount: Number(d.taxAmount || 0),
        discountAmount: Number(d.discountAmount || 0),
        merchantName: merchant,
        date: d.date || new Date().toISOString().split('T')[0],
        totalAmount: Number(d.totalAmount || 0),
        category: (d.category as TransactionCategory) || 'Belanja Bahan Baku',
        paymentMethod: d.paymentMethod || 'Tunai',
        referenceNo: d.referenceNo || 'OCR-' + Math.floor(100000 + Math.random() * 900000),
        items,
        confidenceScore: Number(d.confidenceScore || 0.9),
        summaryNotes: d.summaryNotes || 'Hasil deteksi teks & angka OCR struk',
        txType: 'expense',
        ledgerDescription: `Struk: ${merchant}${itemSummary ? ` (${itemSummary})` : ''}`,
      });
      setStep('detected');
    } catch (err: any) {
      setScanError(
        err.message ||
          'Gagal membaca teks dan angka pada nota. Pastikan foto nota terlihat jelas, terang, dan tidak buram.'
      );
      setStep('capture');
    } finally {
      setScanning(false);
    }
  };

  const updateItem = (idx: number, field: keyof ScannedItem, value: string | number) => {
    if (!scanResult) return;
    const updated = scanResult.items.map((item, i) => {
      if (i !== idx) return item;
      const next = { ...item, [field]: value };
      if (field === 'qty' || field === 'price') {
        next.total = Number(next.qty || 0) * Number(next.price || 0);
      }
      return next;
    });
    const newSum = updated.reduce((s, x) => s + Number(x.total || 0), 0);
    setScanResult({
      ...scanResult,
      items: updated,
      totalAmount: newSum > 0 ? newSum : scanResult.totalAmount,
    });
  };

  const addItemRow = () => {
    if (!scanResult) return;
    setScanResult({
      ...scanResult,
      items: [...scanResult.items, { name: '', qty: 1, price: 0, total: 0 }],
    });
  };

  const removeItemRow = (idx: number) => {
    if (!scanResult) return;
    const updated = scanResult.items.filter((_, i) => i !== idx);
    const newSum = updated.reduce((s, x) => s + Number(x.total || 0), 0);
    setScanResult({
      ...scanResult,
      items: updated,
      totalAmount: newSum > 0 ? newSum : scanResult.totalAmount,
    });
  };

  const handleGoToBookkeeping = () => {
    if (!scanResult) return;
    const itemSummary = scanResult.items
      .filter((i) => i.name.trim())
      .map((i) => i.name)
      .slice(0, 2)
      .join(', ');
    setScanResult({
      ...scanResult,
      ledgerDescription:
        scanResult.ledgerDescription ||
        `Struk: ${scanResult.merchantName}${itemSummary ? ` (${itemSummary})` : ''}`,
    });
    setStep('bookkeeping');
  };

  const handleSaveToLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanResult) return;
    if (!scanResult.totalAmount || scanResult.totalAmount <= 0) {
      setScanError('Total nominal harus lebih dari Rp 0 sebelum disimpan ke pencatatan.');
      return;
    }
    if (!scanResult.ledgerDescription.trim()) {
      setScanError('Keterangan transaksi wajib diisi sebelum dicatat.');
      return;
    }

    setSaving(true);
    setScanError(null);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          date: scanResult.date,
          description: scanResult.ledgerDescription.trim(),
          category: scanResult.category,
          type: scanResult.txType,
          amount: Number(scanResult.totalAmount),
          source: 'ocr_scan',
          paymentMethod: scanResult.paymentMethod || 'Tunai',
          referenceNo: scanResult.referenceNo,
          notes: scanResult.summaryNotes || 'Hasil deteksi teks & angka OCR struk belanja',
          items: scanResult.items,
          receiptImage: imagePreview || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan transaksi ke buku kas.');

      if (scanResult.txType === 'income') {
        playIncomeSound();
      } else {
        playExpenseSound();
      }
      sendBrowserNotification('Nota Berhasil Dicatat ke Buku Kas!', {
        body: `${scanResult.ledgerDescription} senilai ${formatRupiah(scanResult.totalAmount)} telah dibukukan.`,
      });

      onTransactionSaved();
      handleReset();
      onClose();
    } catch (err: any) {
      setScanError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setScanResult(null);
    setScanError(null);
    setStep('capture');
    if (activeMode === 'camera') {
      startCamera();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-700 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Scan Nota Belanja (Deteksi Teks &amp; Angka OCR)
              </h3>
              <p className="text-xs text-blue-100">
                Deteksi teks asli &amp; nominal angka pada foto struk sebelum diarahkan ke pencatatan buku kas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Pipeline Indicator */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-[11px] font-bold shrink-0">
          {[
            { id: 'capture', num: '1', label: 'Foto / Unggah Nota' },
            { id: 'detected', num: '2', label: 'Deteksi Teks & Angka' },
            { id: 'bookkeeping', num: '3', label: 'Pencatatan Buku Kas' },
          ].map((s) => {
            const isActive = step === s.id;
            const isCompleted =
              (s.id === 'capture' && (step === 'detected' || step === 'bookkeeping')) ||
              (s.id === 'detected' && step === 'bookkeeping');
            return (
              <div
                key={s.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-black/15 flex items-center justify-center text-[10px]">
                  {isCompleted ? <Check className="w-3 h-3" /> : s.num}
                </span>
                <span className="truncate">{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Error Banner */}
          {scanError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{scanError}</span>
              </div>
              {imagePreview && !scanning && (
                <button
                  type="button"
                  onClick={() => processReceiptOcr(imagePreview)}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold shrink-0 cursor-pointer"
                >
                  Scan Ulang
                </button>
              )}
            </div>
          )}

          {/* STEP 1: CAPTURE OR UPLOAD */}
          {step === 'capture' && !scanning && (
            <>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('upload');
                    stopCamera();
                    setImagePreview(null);
                    setScanError(null);
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeMode === 'upload'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Unggah Foto Struk / Nota
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('camera');
                    setImagePreview(null);
                    setScanError(null);
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeMode === 'camera'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  Kamera Langsung
                </button>
              </div>

              {activeMode === 'camera' && (
                <div className="space-y-4">
                  <div className="relative aspect-4/3 sm:aspect-16/10 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-blue-400/50">
                    <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                      }
                      className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 cursor-pointer"
                      title="Ganti Arah Kamera"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {cameraError && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-center pt-1">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all ring-4 ring-blue-200 dark:ring-blue-900 cursor-pointer"
                    >
                      <Camera className="w-7 h-7" />
                    </button>
                  </div>
                </div>
              )}

              {activeMode === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-10 text-center cursor-pointer transition-colors bg-slate-50/60 dark:bg-slate-800/40 hover:bg-blue-50/30 dark:hover:bg-slate-800"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Pilih Foto Struk / Nota Belanja
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Sistem mendeteksi teks asli serta seluruh angka nominal pada nota terlebih dahulu, lalu mengarahkannya ke pencatatan buku kas (JPG, PNG, WebP).
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                  >
                    Pilih Berkas Gambar
                  </button>
                </div>
              )}
            </>
          )}

          {/* SCANNING IN PROGRESS */}
          {scanning && (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 animate-spin" />
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Mendeteksi Teks &amp; Angka dari Gambar Nota...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Membaca seluruh baris teks, nama toko, jumlah barang, serta angka nominal harga pada gambar.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: VERIFY DETECTED TEXT & NUMBERS */}
          {step === 'detected' && scanResult && !scanning && (
            <div className="space-y-4">
              {/* Side-by-side Image Preview + Raw Extracted OCR Text */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {imagePreview && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 p-2.5 flex flex-col">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5 px-1">
                      Foto Struk Diunggah
                    </span>
                    <img
                      src={imagePreview}
                      alt="Pratinjau Struk"
                      className="w-full max-h-56 object-contain rounded-lg bg-white"
                    />
                  </div>
                )}

                <div
                  className={`rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/30 p-3 flex flex-col ${
                    !imagePreview ? 'md:col-span-2' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Teks Asli Terdeteksi (OCR)
                    </span>
                    <span className="text-[11px] font-mono text-blue-700 dark:text-blue-400 font-semibold">
                      Akurasi {(scanResult.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <pre className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-[11px] font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-52 overflow-y-auto leading-relaxed">
                    {scanResult.rawText || '(Teks baris tidak terbaca — periksa angka terdeteksi di bawah)'}
                  </pre>
                </div>
              </div>

              {/* Detected Numbers & Monetary Values */}
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Angka &amp; Nominal Terdeteksi dari Nota ({scanResult.detectedNumbers.length})
                  </span>
                  <span className="text-xs font-mono font-black text-emerald-800 dark:text-emerald-300">
                    Total Terdeteksi: {formatRupiah(scanResult.totalAmount)}
                  </span>
                </div>

                {scanResult.detectedNumbers.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {scanResult.detectedNumbers.map((dn, idx) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60 text-xs"
                      >
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {dn.label}
                        </div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {dn.rawToken}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Detected Line Items Table (Editable before booking) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Rincian Item &amp; Harga Terdeteksi (Periksa / Ubah Jika Perlu)
                  </span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Tambah Baris
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-[10px] uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-1.5 px-2.5">Nama Barang</th>
                        <th className="py-1.5 px-2 text-center w-16">Qty</th>
                        <th className="py-1.5 px-2.5 text-right w-28">Harga Satuan</th>
                        <th className="py-1.5 px-2.5 text-right w-28">Subtotal</th>
                        <th className="py-1.5 px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {scanResult.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            Tidak ada rincian item terpisah — total nominal diambil langsung dari angka total nota.
                          </td>
                        </tr>
                      ) : (
                        scanResult.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                              />
                            </td>
                            <td className="py-1.5 px-1.5">
                              <input
                                type="number"
                                min={1}
                                value={item.qty}
                                onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                                className="w-full px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 text-center font-mono"
                              />
                            </td>
                            <td className="py-1.5 px-1.5">
                              <input
                                type="number"
                                min={0}
                                value={item.price}
                                onChange={(e) => updateItem(idx, 'price', Number(e.target.value))}
                                className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 text-right font-mono"
                              />
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-semibold text-slate-800 dark:text-slate-100 font-mono tabular-nums">
                              {formatRupiah(item.total)}
                            </td>
                            <td className="py-1.5 px-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeItemRow(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 2 Action Bar */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Scan Foto Lain
                </button>

                <button
                  type="button"
                  onClick={handleGoToBookkeeping}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Arahkan ke Pencatatan Pembukuan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PENCATATAN KE BUKU KAS */}
          {step === 'bookkeeping' && scanResult && (
            <form onSubmit={handleSaveToLedger} className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-blue-900 dark:text-blue-200">
                    Siap Dicatat ke Buku Kas FinSight
                  </div>
                  <div className="text-blue-700 dark:text-blue-400 mt-0.5">
                    Data sudah diisi otomatis dari hasil deteksi teks &amp; angka nota. Periksa lalu simpan transaksi.
                  </div>
                </div>
                <span className="font-mono font-black text-base text-blue-900 dark:text-white">
                  {formatRupiah(scanResult.totalAmount)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                    Tipe Pencatatan Buku Kas
                  </label>
                  <select
                    value={scanResult.txType}
                    onChange={(e) =>
                      setScanResult({
                        ...scanResult,
                        txType: e.target.value as TransactionType,
                        category:
                          e.target.value === 'income'
                            ? 'Penjualan Tunai'
                            : 'Belanja Bahan Baku',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="expense">Pengeluaran / Belanja Nota (-)</option>
                    <option value="income">Pemasukan / Nota Penjualan (+)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    required
                    value={scanResult.date}
                    onChange={(e) => setScanResult({ ...scanResult, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                    Keterangan Transaksi Buku Kas *
                  </label>
                  <input
                    type="text"
                    required
                    value={scanResult.ledgerDescription}
                    onChange={(e) =>
                      setScanResult({ ...scanResult, ledgerDescription: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                    Kategori Akun SAK EMKM
                  </label>
                  <select
                    value={scanResult.category}
                    onChange={(e) =>
                      setScanResult({
                        ...scanResult,
                        category: e.target.value as TransactionCategory,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="Belanja Bahan Baku">Belanja Bahan Baku</option>
                    <option value="Operasional">Operasional</option>
                    <option value="Sewa Tempat & Listrik">Sewa Tempat &amp; Listrik</option>
                    <option value="Peralatan & Aset">Peralatan &amp; Aset</option>
                    <option value="Pemasaran & Promosi">Pemasaran &amp; Promosi</option>
                    <option value="Penjualan Tunai">Penjualan Tunai</option>
                    <option value="Penjualan Non-Tunai">Penjualan Non-Tunai</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={scanResult.paymentMethod}
                    onChange={(e) =>
                      setScanResult({ ...scanResult, paymentMethod: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="Tunai">Tunai</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="E-Wallet">E-Wallet</option>
                    <option value="Kartu">Kartu</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                    Nominal Transaksi (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={scanResult.totalAmount}
                    onChange={(e) =>
                      setScanResult({ ...scanResult, totalAmount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                    Nomor Referensi Nota
                  </label>
                  <input
                    type="text"
                    value={scanResult.referenceNo}
                    onChange={(e) =>
                      setScanResult({ ...scanResult, referenceNo: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                    Catatan Tambahan
                  </label>
                  <input
                    type="text"
                    value={scanResult.summaryNotes}
                    onChange={(e) =>
                      setScanResult({ ...scanResult, summaryNotes: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('detected')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Kembali ke Hasil Deteksi
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Menyimpan...' : 'Simpan ke Pencatatan Buku Kas'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
