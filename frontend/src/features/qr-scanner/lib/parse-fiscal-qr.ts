/**
 * Парсер фискальных QR-кодов с чеков ФНС России
 * Формат: t=20240115T1234&s=1500.00&fn=1234567890&i=12345&fp=1234567890&n=1
 */

export interface FiscalQrData {
  amount: number;
  date: Date;
  fiscalNumber?: string;
  documentNumber?: string;
  fiscalSign?: string;
  operationType?: number; // 1 = приход, 2 = возврат
}

/**
 * Парсит дату из формата ФНС: 20240115T1234 или 20240115T123456
 */
function parseDateTime(value: string): Date | null {
  // Формат: YYYYMMDDTHHMMSS или YYYYMMDDTHHMM
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/);
  if (!match) return null;

  const [, year, month, day, hours, minutes, seconds = '00'] = match;
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    parseInt(seconds)
  );
}

/**
 * Проверяет, является ли строка фискальным QR-кодом
 */
export function isFiscalQr(data: string): boolean {
  // Должен содержать обязательные параметры t= и s=
  return data.includes('t=') && data.includes('s=');
}

/**
 * Парсит данные фискального QR-кода
 */
export function parseFiscalQr(data: string): FiscalQrData | null {
  try {
    // Убираем возможные пробелы и переносы
    const cleaned = data.trim();

    // Парсим как URL-параметры
    const params = new URLSearchParams(cleaned);

    // Извлекаем сумму (обязательное поле)
    const sumStr = params.get('s');
    if (!sumStr) return null;

    const amount = parseFloat(sumStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return null;

    // Извлекаем дату (обязательное поле)
    const dateStr = params.get('t');
    if (!dateStr) return null;

    const date = parseDateTime(dateStr);
    if (!date) return null;

    // Извлекаем опциональные поля
    const fiscalNumber = params.get('fn') || undefined;
    const documentNumber = params.get('i') || undefined;
    const fiscalSign = params.get('fp') || undefined;
    const operationType = params.get('n') ? parseInt(params.get('n')!) : undefined;

    return {
      amount,
      date,
      fiscalNumber,
      documentNumber,
      fiscalSign,
      operationType,
    };
  } catch {
    return null;
  }
}
