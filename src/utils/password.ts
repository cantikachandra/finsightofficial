export interface PasswordStrengthResult {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  isValid: boolean;
  score: number;
  label: string;
  firstError: string | null;
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const pw = password || '';
  const minLength = pw.length >= 8;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);

  const checks = [minLength, hasUpper, hasLower, hasNumber, hasSymbol];
  const score = checks.filter(Boolean).length;
  const isValid = score === 5;

  let label = 'Lemah';
  if (score >= 5) label = 'Sangat Kuat';
  else if (score >= 4) label = 'Kuat (Kurang 1 syarat)';
  else if (score >= 3) label = 'Sedang';

  let firstError: string | null = null;
  if (!minLength) firstError = 'Kata sandi minimal 8 karakter.';
  else if (!hasUpper) firstError = 'Kata sandi harus mengandung minimal 1 huruf besar (A-Z).';
  else if (!hasLower) firstError = 'Kata sandi harus mengandung minimal 1 huruf kecil (a-z).';
  else if (!hasNumber) firstError = 'Kata sandi harus mengandung minimal 1 angka (0-9).';
  else if (!hasSymbol)
    firstError = 'Kata sandi harus mengandung minimal 1 simbol khusus (contoh: !@#$%^&*).';

  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSymbol,
    isValid,
    score,
    label,
    firstError,
  };
}
