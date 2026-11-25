export async function parseApiResponse<T = any>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (!text) {
    if (!res.ok) {
      throw new Error(`Server mengembalikan status ${res.status} tanpa respons.`);
    }
    return {} as T;
  }

  if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Respons server tidak valid (${res.status}).`);
    }
  }

  if (res.status === 413) {
    throw new Error(
      'Ukuran foto nota terlalu besar untuk diproses server (maksimal 4 MB). Silakan kompres atau ambil ulang foto dengan resolusi lebih kecil.'
    );
  }

  throw new Error(
    `Layanan API tidak merespons dengan format JSON (HTTP ${res.status}). Pastikan server backend berjalan dengan benar.`
  );
}
