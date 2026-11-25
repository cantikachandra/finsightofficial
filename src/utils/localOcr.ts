import { createWorker } from 'tesseract.js';
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
  // Angka tanpa pemisah ribuan (atau OCR kehilangan titik): ambil digit saja
  const digitsOnly = cleaned.replace(/[.,]/g, '');
  const val = Number(digitsOnly);
  return Number.isFinite(val) ? Math.round(val) : 0;
}

async function preprocessForTesseract(dataUrl: string): Promise<string> {
  if (typeof document === 'undefined') return dataUrl;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Gagal memuat gambar nota untuk pemrosesan OCR lokal.'));
    el.src = dataUrl;
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const scale = w < 1000 ? Math.min(2, 1200 / Math.max(1, w)) : 1;
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

  // Convert to high-contrast grayscale to sharpen thermal receipt print
  const imageData = ctx.getImageData(0, 0, targetW, targetH);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    // Gentle contrast boost around midpoint
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
    d[i] = contrasted;
    d[i + 1] = contrasted;
    d[i + 2] = contrasted;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
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
  if (/(TRANSFER|BCA|BRI|MANDIRI|BNI|BSI|CIMB|VIRTUAL ACCOUNT|VA\b)/.test(upperText)) {
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

export async function runLocalReceiptOcr(
  imageDataUrl: string,
  onProgress?: (percent: number) => void
): Promise<LocalOcrReceiptData> {
  const preparedUrl = await preprocessForTesseract(imageDataUrl);
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const result = await worker.recognize(preparedUrl);
    const rawText = String(result.data?.text || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join('\n');

    const lines = rawText ? rawText.split('\n') : [];
    const confidenceRaw = Number(result.data?.confidence || 75);
    const confidenceScore = Math.max(0.2, Math.min(0.99, confidenceRaw / 100));

    const detectedNumbers: LocalDetectedNumber[] = [];
    const seenTokens = new Set<string>();
    const items: LocalScannedItem[] = [];

    let totalAmount = 0;
    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    const skipItemLineRegex =
      /^(TOTAL|GRAND\s*TOTAL|SUBTOTAL|SUB\s*TOTAL|PPN|PAJAK|TAX|DISKON|DISC|POTONGAN|TUNAI|CASH|BAYAR|KEMBALI|CHANGE|TGL|TANGGAL|DATE|KASIR|NO\.?|NOTA|STRUK|INVOICE|TELP|HP|WA|TERIMA\s*KASIH|THANK)/i;

    for (const line of lines) {
      // Match Rp amounts, grouped thousands (15.000 / 15,000), or standalone >= 3 digit numbers
      const matches = line.match(
        /(?:Rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|(?:Rp\.?\s*)\d+|\b\d{3,8}\b/gi
      );
      if (!matches) continue;

      const lineUpper = line.toUpperCase();
      // Ignore obvious phone numbers / dates / years
      if (/\b(20\d{2})\b/.test(line) && /\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(line)) {
        continue;
      }
      if (/^(TELP|HP|WA|FAX|NPWP)/i.test(line)) continue;

      const parsedLineAmounts: Array<{ token: string; value: number }> = [];
      for (const token of matches) {
        const val = parseIndonesianAmount(token);
        if (val < 100 || val > 500_000_000) continue;
        parsedLineAmounts.push({ token: token.trim(), value: val });

        const dedupeKey = `${lineUpper.slice(0, 20)}|${val}`;
        if (!seenTokens.has(dedupeKey) && detectedNumbers.length < 25) {
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

      if (parsedLineAmounts.length === 0) continue;
      const lastAmt = parsedLineAmounts[parsedLineAmounts.length - 1].value;

      if (/(GRAND\s*TOTAL|TOTAL\s*BAYAR|TOTAL\s*TAGIHAN|\bTOTAL\b|\bJUMLAH\b)/i.test(lineUpper) && !/SUB/i.test(lineUpper)) {
        totalAmount = Math.max(totalAmount, lastAmt);
      } else if (/SUB\s*TOTAL|SUBTOTAL/i.test(lineUpper)) {
        subtotal = Math.max(subtotal, lastAmt);
      } else if (/PPN|PAJAK|TAX|PB1/i.test(lineUpper)) {
        taxAmount = Math.max(taxAmount, lastAmt);
      } else if (/DISKON|DISC|POTONGAN/i.test(lineUpper)) {
        discountAmount = Math.max(discountAmount, lastAmt);
      } else if (!skipItemLineRegex.test(lineUpper) && !/(KEMBALI|CHANGE|TUNAI|CASH|DEBIT|QRIS|TRANSFER)/i.test(lineUpper)) {
        // Attempt to extract line item: "2x Kopi Susu 30.000" or "Gula Pasir 15.000"
        const qtyMatch = line.match(/^(\d+)\s*[xX*]\s+(.+)/);
        let qty = 1;
        let namePart = line;
        if (qtyMatch) {
          qty = Math.max(1, Number(qtyMatch[1]) || 1);
          namePart = qtyMatch[2];
        }
        const cleanedName = namePart
          .replace(/(?:Rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|(?:Rp\.?\s*)\d+|\b\d{3,8}\b/gi, '')
          .replace(/[xX*@:=]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (cleanedName.length >= 2) {
          const lineTotal = lastAmt;
          const unitPrice = qty > 1 ? Math.round(lineTotal / qty) : lineTotal;
          items.push({
            name: cleanedName,
            qty,
            price: unitPrice,
            total: lineTotal,
          });
        }
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
      lines.find((l) => l.length >= 3 && !/^\d+$/.test(l) && !skipItemLineRegex.test(l)) ||
      'Toko / Merchant';

    if (!rawText && detectedNumbers.length === 0) {
      throw new Error(
        'OCR lokal tidak menemukan teks atau angka yang jelas pada foto ini. Pastikan foto nota terang, fokus, dan tidak terpotong.'
      );
    }

    const upperAll = rawText.toUpperCase();
    return {
      rawText,
      detectedNumbers,
      subtotal,
      taxAmount,
      discountAmount,
      merchantName: merchantCandidate.slice(0, 60),
      date: detectReceiptDate(rawText),
      totalAmount,
      category: inferCategory(upperAll),
      paymentMethod: inferPaymentMethod(upperAll),
      referenceNo: 'OCR-LOKAL-' + Math.floor(100000 + Math.random() * 900000),
      items,
      confidenceScore,
      summaryNotes:
        'Diekstrak dengan mesin OCR Lokal (Tesseract) — periksa kembali nominal sebelum disimpan.',
    };
  } finally {
    await worker.terminate();
  }
}
