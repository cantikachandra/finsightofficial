import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  RotateCcw,
  Cpu,
  Edit3,
} from 'lucide-react';
import { TransactionCategory, TransactionType } from '../types';
import { playExpenseSound, playIncomeSound, sendBrowserNotification } from '../utils/notification';
import { formatRupiah } from '../utils/exportReport';
import { parseApiResponse } from '../utils/api';
import { runLocalReceiptOcr } from '../utils/localOcr';

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

interface PreparedImagePair {
  ocrImage: string;
  thumbImage: string;
}

function renderScaledJpeg(
  source: HTMLImageElement | HTMLVideoElement,
  srcWidth: number,
  srcHeight: number,
  maxDimension: number,
  quality: number
): string {
  const scale = Math.min(1, maxDimension / Math.max(srcWidth, srcHeight));
  const targetWidth = Math.max(1, Math.round(srcWidth * scale));
  const targetHeight = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser tidak mendukung pemrosesan gambar kanvas.');
  }

  // Fill white background so transparent PNG receipts remain crisp in JPEG
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', quality);
}

async function prepareImageFromFile(file: File): Promise<PreparedImagePair> {
  const isImageMime = file.type.startsWith('image/');
  const isImageExt = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name);
  if (!isImageMime && !isImageExt) {
    throw new Error('File yang dipilih bukan gambar. Unggah foto nota berformat JPG, PNG, atau WebP.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(
          new Error(
            'Gambar tidak dapat dibuka oleh browser (misalnya format HEIC). Konversi ke JPG/PNG atau gunakan foto langsung.'
          )
        );
      el.src = objectUrl;
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) {
      throw new Error('Dimensi foto nota tidak valid atau file rusak.');
    }

    let ocrImage = renderScaledJpeg(img, width, height, 1600, 0.86);
    if (ocrImage.length > 3_200_000) {
      ocrImage = renderScaledJpeg(img, width, height, 1200, 0.76);
    }
    const thumbImage = renderScaledJpeg(img, width, height, 900, 0.72);
    return { ocrImage, thumbImage };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function prepareImageFromVideo(video: HTMLVideoElement): PreparedImagePair | null {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return null;
  }
  let ocrImage = renderScaledJpeg(video, video.videoWidth, video.videoHeight, 1600, 0.88);
  if (ocrImage.length > 3_200_000) {
    ocrImage = renderScaledJpeg(video, video.videoWidth, video.videoHeight, 1200, 0.78);
  }
  const thumbImage = renderScaledJpeg(video, video.videoWidth, video.videoHeight, 900, 0.74);
  return { ocrImage, thumbImage };
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
  const [cameraReady, setCameraReady] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isDragging, setIsDragging] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrImagePayload, setOcrImagePayload] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanningModeLabel, setScanningModeLabel] = useState<'gemini' | 'local'>('gemini');
  const [localProgress, setLocalProgress] = useState<number>(0);
  const [ocrEngineUsed, setOcrEngineUsed] = useState<'gemini' | 'local' | 'manual'>('gemini');
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
  const cameraSessionRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = useCallback(() => {
    cameraSessionRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);
    setStartingCamera(true);
    stopCamera();
    const sessionId = cameraSessionRef.current;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Browser atau tampilan ini tidak mendukung akses kamera langsung (getUserMedia). Gunakan tombol "Ambil Foto via Kamera Perangkat" atau Unggah File.'
        );
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback if specific facingMode/resolution constraint fails
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      // If modal closed or tab switched while permission prompt was open, stop stream immediately
      if (sessionId !== cameraSessionRef.current || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const videoEl = videoRef.current;
      videoEl.srcObject = stream;
      try {
        await videoEl.play();
      } catch {
        // Some browsers auto-play cleanly once metadata loads
      }
      if (sessionId === cameraSessionRef.current && videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
        setCameraReady(true);
      }
    } catch (err: any) {
      if (sessionId !== cameraSessionRef.current) return;
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError(
          'Izin kamera ditolak oleh browser. Izinkan akses kamera di ikon gembok browser, atau gunakan "Kamera Perangkat" / tab Unggah File.'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError(
          'Perangkat kamera tidak terdeteksi di perangkat ini. Anda tetap bisa mengunggah foto struk melalui tab Unggah Foto.'
        );
      } else {
        setCameraError(
          err?.message ||
            'Kamera tidak dapat diakses pada browser ini. Gunakan tombol "Ambil Foto via Kamera Perangkat" di bawah atau Unggah Foto.'
        );
      }
    } finally {
      if (sessionId === cameraSessionRef.current) {
        setStartingCamera(false);
      }
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isOpen && activeMode === 'camera' && step === 'capture' && !imagePreview && !scanning) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode, facingMode, imagePreview, step, scanning, startCamera, stopCamera]);

  if (!isOpen) return null;

  const applyScanData = (d: any, engine: 'gemini' | 'local') => {
    const items: ScannedItem[] = Array.isArray(d.items) ? d.items : [];
    const itemSummary = items
      .filter((i) => i.name?.trim())
      .map((i) => i.name)
      .slice(0, 2)
      .join(', ');
    const merchant = d.merchantName || 'Toko / Pemasok';

    const fallbackNumbers: DetectedNumberItem[] =
      Array.isArray(d.detectedNumbers) && d.detectedNumbers.length > 0
        ? d.detectedNumbers
        : [
            ...(Number(d.subtotal || 0) > 0
              ? [
                  {
                    label: 'Subtotal',
                    rawToken: formatRupiah(Number(d.subtotal)),
                    value: Number(d.subtotal),
                  },
                ]
              : []),
            ...(Number(d.totalAmount || 0) > 0
              ? [
                  {
                    label: 'Total Nota',
                    rawToken: formatRupiah(Number(d.totalAmount)),
                    value: Number(d.totalAmount),
                  },
                ]
              : []),
          ];

    setOcrEngineUsed(engine);
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
  };

  const processReceiptOcr = async (ocrImg: string) => {
    setScanning(true);
    setScanningModeLabel('gemini');
    setScanError(null);
    setScanResult(null);
    try {
      const res = await fetch('/api/ocr/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: ocrImg }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Gagal membaca teks dan angka dari gambar struk.');
      }

      applyScanData(data.data, 'gemini');
    } catch (err: any) {
      setScanError(
        err?.message ||
          'Gagal membaca teks dan angka pada nota. Pastikan foto nota terlihat jelas, terang, dan tidak buram.'
      );
      setStep('capture');
    } finally {
      setScanning(false);
    }
  };

  const processLocalOcr = async (ocrImg: string) => {
    setScanning(true);
    setScanningModeLabel('local');
    setLocalProgress(5);
    setScanError(null);
    setScanResult(null);
    try {
      const data = await runLocalReceiptOcr(ocrImg, (pct) => {
        setLocalProgress(Math.max(5, Math.min(100, pct)));
      });
      applyScanData(data, 'local');
    } catch (err: any) {
      setScanError(
        err?.message ||
          'OCR Lokal tidak menemukan teks yang jelas pada nota ini. Anda dapat mengedit nominal secara manual sambil melihat foto.'
      );
      setStep('capture');
    } finally {
      setScanning(false);
      setLocalProgress(0);
    }
  };

  const openManualWithPhoto = () => {
    setScanError(null);
    setOcrEngineUsed('manual');
    setScanResult({
      rawText: '',
      detectedNumbers: [],
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      merchantName: 'Toko / Merchant',
      date: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      category: 'Belanja Bahan Baku',
      paymentMethod: 'Tunai',
      referenceNo: 'NOTA-' + Math.floor(100000 + Math.random() * 900000),
      items: [{ name: '', qty: 1, price: 0, total: 0 }],
      confidenceScore: 1,
      summaryNotes: 'Pencatatan nota manual dengan lampiran foto struk',
      txType: 'expense',
      ledgerDescription: '',
    });
    setStep('bookkeeping');
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const prepared = prepareImageFromVideo(videoRef.current);
    if (!prepared) {
      setCameraError(
        'Kamera masih menyiapkan gambar. Tunggu sebentar hingga pratinjau kamera muncul sebelum mengambil foto.'
      );
      return;
    }
    setImagePreview(prepared.thumbImage);
    setOcrImagePayload(prepared.ocrImage);
    stopCamera();
    processReceiptOcr(prepared.ocrImage);
  };

  const handleSelectedFile = async (file: File) => {
    setScanError(null);
    try {
      const prepared = await prepareImageFromFile(file);
      setImagePreview(prepared.thumbImage);
      setOcrImagePayload(prepared.ocrImage);
      stopCamera();
      await processReceiptOcr(prepared.ocrImage);
    } catch (err: any) {
      setScanError(err?.message || 'Gagal memproses berkas gambar yang dipilih.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      await handleSelectedFile(file);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleSelectedFile(file);
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

      const data = await parseApiResponse(res);
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
      setScanError(err?.message || 'Gagal menyimpan transaksi ke buku kas.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setOcrImagePayload(null);
    setScanResult(null);
    setScanError(null);
    setStep('capture');
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
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-xl space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{scanError}</span>
              </div>
              {ocrImagePayload && !scanning && (
                <div className="flex flex-wrap items-center gap-2 pl-6">
                  <button
                    type="button"
                    onClick={() => processLocalOcr(ocrImagePayload)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    Scan Offline (OCR Lokal)
                  </button>
                  <button
                    type="button"
                    onClick={() => processReceiptOcr(ocrImagePayload)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Coba Lagi AI Gemini
                  </button>
                  <button
                    type="button"
                    onClick={openManualWithPhoto}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Isi Manual dari Foto
                  </button>
                </div>
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
                    setOcrImagePayload(null);
                    setScanError(null);
                    setCameraError(null);
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
                    setOcrImagePayload(null);
                    setScanError(null);
                    setCameraError(null);
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

              {/* Hidden native camera input fallback */}
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Preview when previous scan attempt failed */}
              {imagePreview && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={imagePreview}
                    alt="Pratinjau Nota"
                    className="w-28 h-28 object-contain rounded-lg bg-white border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <div className="flex-1 text-xs space-y-2 text-center sm:text-left">
                    <div className="font-bold text-slate-800 dark:text-slate-100">
                      Foto nota siap dipindai
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      Jika AI Gemini sedang sibuk, gunakan <strong>Scan Offline (OCR Lokal)</strong> langsung di perangkat Anda tanpa antre server AI.
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      {ocrImagePayload && (
                        <>
                          <button
                            type="button"
                            onClick={() => processLocalOcr(ocrImagePayload)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Cpu className="w-3.5 h-3.5" />
                            Scan Offline (OCR Lokal)
                          </button>
                          <button
                            type="button"
                            onClick={() => processReceiptOcr(ocrImagePayload)}
                            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Scan Ulang AI Gemini
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Ganti / Ambil Foto Lain
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeMode === 'camera' && !imagePreview && (
                <div className="space-y-4">
                  <div className="relative aspect-4/3 sm:aspect-16/10 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-blue-400/50">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={() => {
                        if (videoRef.current && videoRef.current.videoWidth > 0) {
                          setCameraReady(true);
                        }
                      }}
                      onCanPlay={() => {
                        if (videoRef.current && videoRef.current.videoWidth > 0) {
                          setCameraReady(true);
                        }
                      }}
                      className="w-full h-full object-cover"
                    />

                    {!cameraReady && !cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/75 text-white text-xs gap-2 p-4 text-center">
                        <div className="w-7 h-7 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                        <span>
                          {startingCamera ? 'Mengaktifkan kamera...' : 'Menunggu sinyal gambar kamera...'}
                        </span>
                      </div>
                    )}

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
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs rounded-xl space-y-2.5">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{cameraError}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pl-6">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
                        >
                          Coba Aktifkan Kamera Lagi
                        </button>
                        <button
                          type="button"
                          onClick={() => nativeCameraInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                        >
                          Ambil Foto via Kamera Perangkat
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!cameraReady}
                      onClick={capturePhoto}
                      title={cameraReady ? 'Ambil Foto & Scan Nota' : 'Menunggu kamera siap'}
                      className={`w-16 h-16 rounded-full text-white flex items-center justify-center shadow-lg transition-all ring-4 ${
                        cameraReady
                          ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95 ring-blue-200 dark:ring-blue-900 cursor-pointer'
                          : 'bg-slate-400 ring-slate-200 dark:ring-slate-800 cursor-not-allowed opacity-70'
                      }`}
                    >
                      <Camera className="w-7 h-7" />
                    </button>
                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Atau buka aplikasi kamera perangkat langsung
                    </button>
                  </div>
                </div>
              )}

              {activeMode === 'upload' && !imagePreview && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
                      : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-blue-50/30 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Pilih atau Seret Foto Struk / Nota Belanja
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Sistem otomatis mengoptimalkan ukuran foto lalu mendeteksi seluruh teks dan angka nominal pada nota sebelum dicatat ke buku kas (JPG, PNG, WebP).
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
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
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
                  {scanningModeLabel === 'local'
                    ? `Mendeteksi Teks & Angka Secara Lokal (${localProgress}%)...`
                    : 'Mendeteksi Teks & Angka dari Gambar Nota...'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {scanningModeLabel === 'local'
                    ? 'Memproses piksel nota langsung di browser (mode offline tanpa antre server AI).'
                    : 'Membaca seluruh baris teks, nama toko, jumlah barang, serta angka nominal harga pada gambar.'}
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
                      Teks Asli Terdeteksi ({ocrEngineUsed === 'local' ? 'OCR Lokal' : 'AI OCR'})
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
              {ocrEngineUsed === 'manual' && imagePreview && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-col items-center">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5 self-start">
                    Referensi Foto Struk / Nota
                  </span>
                  <img
                    src={imagePreview}
                    alt="Referensi Struk"
                    className="max-h-52 object-contain rounded-lg bg-white border border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}

              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-blue-900 dark:text-blue-200">
                    Siap Dicatat ke Buku Kas FinSight
                  </div>
                  <div className="text-blue-700 dark:text-blue-400 mt-0.5">
                    {ocrEngineUsed === 'manual'
                      ? 'Lengkapi keterangan dan nominal berdasarkan foto struk Anda, lalu simpan transaksi.'
                      : 'Data sudah diisi otomatis dari hasil deteksi teks & angka nota. Periksa lalu simpan transaksi.'}
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
