import { createWorker, type Worker } from 'tesseract.js';
import type { TransactionCategory } from '../types';

export interface LocalDetectedNumber {
  label: string;
  rawToken: string;
  value: number;
}

export interface LocalScannedItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

export interface LocalOcrReceiptData {
  rawText: string;
  detectedNumbers: LocalDetectedNumber[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  merchantName: string;
  date: string;
  totalAmount: number;
  category: TransactionCategory;
  paymentMethod: string;
  referenceNo: string;
  items: LocalScannedItem[];
  confidenceScore: number;
  summaryNotes: string;
}

let cachedWorkerPromise: Promise<Worker> | null = null;
let progressCallback: ((percent: number) => void) | null = null;

async function getSharedWorker(): Promise<Worker> {
  if (!cachedWorkerPromise) {
    cachedWorkerPromise = createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number' && progressCallback) {
          progressCallback(Math.round(m.progress * 100));
        }
      },
    }).catch((err) => {
      cachedWorkerPromise = null;
      throw err;
    });
  }
  return cachedWorkerPromise;
}

export function warmUpLocalOcrWorker(): void {
  if (typeof window !== 'undefined') {
    void getSharedWorker().catch(() => {});
  }
}

function parseIndonesianAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return 0;

  // Format ribuan Indonesia: 15.000 atau 1.250.000 atau 15.000,00
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned)) {
    return Math.round(Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0);
  }
  // Format ribuan koma: 15,000 atau 1,250,000.00
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(cleaned)) {
    return Math.round(Number(cleaned.replace(/,/g, '')) || 0);
  }
  // Angka desimal koma/titik kecil seperti 15000,00 atau 15000.00
  if (/^\d+[.,]\d{2}$/.test(cleaned)) {
    return Math.round(Number(cleaned.replace(',', '.')) || 0);
  }
  const digitsOnly = cleaned.replace(/[.,]/g, '');
  const val = Number(digitsOnly);
  return Number.isFinite(val) ? Math.round(val) : 0;
}

async function preprocessForTesseract(dataUrl: string): Promise<string> {
  if (typeof document === 'undefined') return dataUrl;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Gagal memuat gambar nota untuk pemrosesan OCR.'));
    el.src = dataUrl;
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  // Cap at 1350px for fast recognition while keeping receipt characters sharp
  const maxDim = Math.max(w, h);
  const scale = maxDim > 1350 ? 1350 / maxDim : w < 900 ? Math.min(1.6, 1000 / Math.max(1, w)) : 1;
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // High-contrast grayscale improves thermal & smartphone receipt readability
  const imageData = ctx.getImageData(0, 0, targetW, targetH);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.4 + 128));
    d[i] = contrasted;
    d[i + 1] = contrasted;
    d[i + 2] = contrasted;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}

function detectReceiptDate(rawText: string): string {
  const isoMatch = rawText.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  const dmyMatch = rawText.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }
  return new Date().toISOString().split('T')[0];
}

function inferPaymentMethod(upperText: string): string {
  if (/(QRIS|GOPAY|OVO|DANA|SHOPEE|LINKAJA|EWALLET|E-WALLET)/.test(upperText)) return 'E-Wallet';
  if (/(TRANSFER|BCA|BRI|MANDIRI|BNI|BSI|CIMB|VIRTUAL ACCOUNT|\bVA\b)/.test(upperText)) {
    return 'Transfer Bank';
  }
  if (/(DEBIT|KREDIT|CREDIT|CARD|KARTU|VISA|MASTERCARD)/.test(upperText)) return 'Kartu';
  return 'Tunai';
}

function inferCategory(upperText: string): TransactionCategory {
  if (/(LISTRIK|PLN|PDAM|AIR|SEWA|KONTRAK|INTERNET|WIFI|PULSA|TOKEN)/.test(upperText)) {
    return 'Sewa Tempat & Listrik';
  }
  if (/(BENSIN|BBM|PERTALITE|PERTAMAX|SOLAR|PARKIR|TOL|ONGKIR|KURIR|GRAB|GOJEK|EXPEDISI)/.test(upperText)) {
    return 'Operasional';
  }
  if (/(MESIN|LAPTOP|PRINTER|MEJA|KURSI|ETALASE|KOMPOR|KULKAS|PERALATAN)/.test(upperText)) {
    return 'Peralatan & Aset';
  }
  return 'Belanja Bahan Baku';
}

const PRICE_REGEX = /(?:Rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|(?:Rp\.?\s*)\d+|\b\d{3,8}\b/gi;

export function parseReceiptTextLines(
  rawText: string,
  confidenceRaw = 85
): LocalOcrReceiptData {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const confidenceScore = Math.max(0.2, Math.min(0.99, confidenceRaw / 100));
  const detectedNumbers: LocalDetectedNumber[] = [];
  const seenTokens = new Set<string>();
  const items: LocalScannedItem[] = [];

  let totalAmount = 0;
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;

  const summaryKeywordRegex =
    /^(TOTAL|GRAND\s*TOTAL|SUBTOTAL|SUB\s*TOTAL|PPN|PAJAK|TAX|PB1|DISKON|DISC|POTONGAN|TUNAI|CASH|BAYAR|KEMBALI|CHANGE|TGL|TANGGAL|DATE|KASIR|NO\.?|NOTA|STRUK|INVOICE|TELP|HP|WA|TERIMA\s*KASIH|THANK|JL\.|JALAN|NPWP)/i;
  const nonItemHintRegex =
    /(KEMBALI|CHANGE|TUNAI|CASH|DEBIT|QRIS|TRANSFER|TERIMA\s*KASIH|SELAMAT|STRUK|KASIR|TELP|NPWP|JL\.|JALAN|TANGGAL|\bTGL\b)/i;

  let pendingItemName: string | null = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lineUpper = line.toUpperCase();

    // Skip date & phone lines
    if (/\b(20\d{2})\b/.test(line) && /\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(line)) {
      pendingItemName = null;
      continue;
    }
    if (/^(TELP|HP|WA|FAX|NPWP|TGL|DATE|KASIR|NO\.?\s*NOTA)/i.test(line)) {
      pendingItemName = null;
      continue;
    }

    // Check 2-line POS format: Line 1 = "TEH PUCUK 350ML", Line 2 = "2 x 4.000   8.000" or "2  4.000  8.000"
    const qtyPriceOnlyMatch = line.match(
      /^(\d{1,3})\s*(?:[xX*@]|pcs|buah|porsi|cup|btl|kg|gr)?\s*[@]?\s*((?:Rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+|\d{3,8})(?:\s*[=]?\s*((?:Rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+|\d{3,8}))?$/i
    );
    if (qtyPriceOnlyMatch && pendingItemName) {
      const qty = Math.max(1, Number(qtyPriceOnlyMatch[1]) || 1);
      const unitOrTotal = parseIndonesianAmount(qtyPriceOnlyMatch[2]);
      const explicitTotal = qtyPriceOnlyMatch[3]
        ? parseIndonesianAmount(qtyPriceOnlyMatch[3])
        : 0;
      const lineTotal = explicitTotal >= unitOrTotal ? explicitTotal : qty * unitOrTotal;
      const unitPrice =
        explicitTotal >= unitOrTotal && qty > 0
          ? unitOrTotal
          : Math.round(lineTotal / qty);

      if (lineTotal >= 100) {
        items.push({
          name: pendingItemName,
          qty,
          price: unitPrice,
          total: lineTotal,
        });
        detectedNumbers.push({
          label: `${pendingItemName} (${qty}x)`,
          rawToken: lineTotal.toLocaleString('id-ID'),
          value: lineTotal,
        });
        pendingItemName = null;
        continue;
      }
    }

    const matches = line.match(PRICE_REGEX);
    if (!matches) {
      // Candidate name-only line for multi-line thermal receipts (skip top header 1st line & divider lines)
      if (
        idx > 0 &&
        line.length >= 3 &&
        !/^[-=*_.]+$/.test(line) &&
        !summaryKeywordRegex.test(lineUpper) &&
        !nonItemHintRegex.test(lineUpper)
      ) {
        pendingItemName = line;
      } else {
        pendingItemName = null;
      }
      continue;
    }

    const parsedLineAmounts: Array<{ token: string; value: number }> = [];
    for (const token of matches) {
      const val = parseIndonesianAmount(token);
      if (val < 100 || val > 500_000_000) continue;
      parsedLineAmounts.push({ token: token.trim(), value: val });

      const dedupeKey = `${lineUpper.slice(0, 20)}|${val}`;
      if (!seenTokens.has(dedupeKey) && detectedNumbers.length < 30) {
        seenTokens.add(dedupeKey);
        const label =
          line
            .replace(token, '')
            .replace(/[:\-=]+$/, '')
            .trim()
            .slice(0, 42) || 'Nominal Nota';
        detectedNumbers.push({
          label,
          rawToken: token.trim(),
          value: val,
        });
      }
    }

    if (parsedLineAmounts.length === 0) {
      pendingItemName = null;
      continue;
    }

    const lastAmt = parsedLineAmounts[parsedLineAmounts.length - 1].value;

    if (
      /(GRAND\s*TOTAL|TOTAL\s*BAYAR|TOTAL\s*TAGIHAN|\bTOTAL\b|\bJUMLAH\b)/i.test(lineUpper) &&
      !/SUB/i.test(lineUpper)
    ) {
      totalAmount = Math.max(totalAmount, lastAmt);
      pendingItemName = null;
    } else if (/SUB\s*TOTAL|SUBTOTAL/i.test(lineUpper)) {
      subtotal = Math.max(subtotal, lastAmt);
      pendingItemName = null;
    } else if (/PPN|PAJAK|TAX|PB1/i.test(lineUpper)) {
      taxAmount = Math.max(taxAmount, lastAmt);
      pendingItemName = null;
    } else if (/DISKON|DISC|POTONGAN/i.test(lineUpper)) {
      discountAmount = Math.max(discountAmount, lastAmt);
      pendingItemName = null;
    } else if (!summaryKeywordRegex.test(lineUpper) && !nonItemHintRegex.test(lineUpper)) {
      pendingItemName = null;
      // Extract Qty + Name + Unit Price + Line Total from single line
      // Examples:
      // 1) "2x Kopi Susu 30.000" or "2 x Kopi Susu 15.000 30.000"
      // 2) "Kopi Susu 2x 15.000 30.000" or "Kopi Susu 2 pcs 30.000"
      // 3) "Kopi Susu 15.000 30.000" (qty = 2 inferred)
      let qty = 1;
      let workingText = line;

      const prefixQty = workingText.match(/^(\d{1,3})\s*(?:[xX*]|pcs|buah|porsi|cup|btl|bungkus|bks)?\s+(.+)/i);
      const inlineQty = workingText.match(/\b(\d{1,3})\s*(?:[xX*]|pcs|buah|porsi|cup|btl|bungkus|bks)\b/i);
      const trailingQtyPrice = workingText.match(
        /^(.+?)\s+(\d{1,2})\s+((?:Rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+|\d{3,8})(?:\s+((?:Rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+|\d{3,8}))?$/i
      );

      if (prefixQty) {
        qty = Math.max(1, Number(prefixQty[1]) || 1);
        workingText = prefixQty[2];
      } else if (inlineQty) {
        qty = Math.max(1, Number(inlineQty[1]) || 1);
        workingText = workingText.replace(inlineQty[0], ' ');
      } else if (trailingQtyPrice) {
        qty = Math.max(1, Number(trailingQtyPrice[2]) || 1);
        workingText = trailingQtyPrice[1];
      }

      const cleanedName = workingText
        .replace(PRICE_REGEX, '')
        .replace(/[@:=*]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanedName.length >= 2) {
        const lineTotal = lastAmt;
        let unitPrice = qty > 1 ? Math.round(lineTotal / qty) : lineTotal;

        if (parsedLineAmounts.length >= 2) {
          const maybeUnit = parsedLineAmounts[parsedLineAmounts.length - 2].value;
          if (maybeUnit > 0 && lineTotal >= maybeUnit) {
            if (qty === 1 && lineTotal > maybeUnit && lineTotal % maybeUnit === 0) {
              qty = Math.min(999, lineTotal / maybeUnit);
            }
            unitPrice = maybeUnit;
          }
        }

        items.push({
          name: cleanedName,
          qty,
          price: unitPrice,
          total: lineTotal,
        });
      }
    } else {
      pendingItemName = null;
    }
  }

  const computedItemsSum = items.reduce((sum, it) => sum + it.total, 0);
  const maxDetected = detectedNumbers.reduce((m, d) => (d.value > m ? d.value : m), 0);
  if (!totalAmount) {
    totalAmount = computedItemsSum || subtotal || maxDetected;
  }
  if (!subtotal) {
    subtotal = computedItemsSum || totalAmount;
  }

  const merchantCandidate =
    lines.find((l) => l.length >= 3 && !/^\d+$/.test(l) && !summaryKeywordRegex.test(l)) ||
    'Toko / Merchant';

  const upperAll = rawText.toUpperCase();
  return {
    rawText: lines.join('\n'),
    detectedNumbers,
    subtotal,
    taxAmount,
    discountAmount,
    merchantName: merchantCandidate.slice(0, 60),
    date: detectReceiptDate(rawText),
    totalAmount,
    category: inferCategory(upperAll),
    paymentMethod: inferPaymentMethod(upperAll),
    referenceNo: 'NOTA-' + Math.floor(100000 + Math.random() * 900000),
    items,
    confidenceScore,
    summaryNotes: 'Deteksi cepat kuantitas, nama barang & harga dari foto nota',
  };
}

export async function runLocalReceiptOcr(
  imageDataUrl: string,
  onProgress?: (percent: number) => void
): Promise<LocalOcrReceiptData> {
  const preparedUrl = await preprocessForTesseract(imageDataUrl);
  progressCallback = onProgress || null;
  let worker: Worker;
  try {
    worker = await getSharedWorker();
    const result = await worker.recognize(preparedUrl);
    const rawText = String(result.data?.text || '').trim();
    const confidenceRaw = Number(result.data?.confidence || 75);
    const parsed = parseReceiptTextLines(rawText, confidenceRaw);

    if (!parsed.rawText && parsed.items.length === 0 && parsed.detectedNumbers.length === 0) {
      throw new Error(
        'Tidak ada teks, kuantitas, atau harga yang jelas pada foto ini. Pastikan foto nota terang dan fokus.'
      );
    }

    return parsed;
  } catch (err) {
    // Reset cached worker if WASM worker errored unexpectedly
    if (cachedWorkerPromise) {
      const prev = cachedWorkerPromise;
      cachedWorkerPromise = null;
      prev.then((w) => w.terminate()).catch(() => {});
    }
    throw err;
  } finally {
    progressCallback = null;
  }
}
