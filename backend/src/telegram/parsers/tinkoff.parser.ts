import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

interface ParsedTransaction {
  date: Date;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  category?: string;
}

@Injectable()
export class TinkoffParser {
  /**
   * Check if CSV content is from Tinkoff
   * Tinkoff CSV typically has these columns:
   * - Дата операции / Дата платежа
   * - Сумма операции / Сумма платежа
   * - Категория
   * - Описание
   */
  canParse(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return (
      (lowerContent.includes('дата операции') ||
        lowerContent.includes('дата платежа')) &&
      (lowerContent.includes('сумма операции') ||
        lowerContent.includes('сумма платежа')) &&
      (lowerContent.includes('категория') || lowerContent.includes('описание'))
    );
  }

  parse(content: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];

    // Try different delimiters and encodings
    let records: any[];
    try {
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relaxColumnCount: true,
        trim: true,
      });
    } catch {
      try {
        records = parse(content, {
          columns: true,
          skip_empty_lines: true,
          delimiter: ',',
          relaxColumnCount: true,
          trim: true,
        });
      } catch {
        return [];
      }
    }

    for (const record of records as Record<string, string>[]) {
      try {
        const tx = this.parseRecord(record);
        if (tx) {
          transactions.push(tx);
        }
      } catch {
        // Skip invalid records
        continue;
      }
    }

    return transactions;
  }

  private parseRecord(
    record: Record<string, string>,
  ): ParsedTransaction | null {
    // Find date column
    const dateStr = this.findValue(record, [
      'Дата операции',
      'Дата платежа',
      'Дата',
      'date',
    ]);
    if (!dateStr) return null;

    // Find amount column
    const amountStr = this.findValue(record, [
      'Сумма операции',
      'Сумма платежа',
      'Сумма',
      'amount',
    ]);
    if (!amountStr) return null;

    // Find description
    const description =
      this.findValue(record, ['Описание', 'Название', 'description']) ||
      'Без описания';

    // Find category
    const category = this.findValue(record, ['Категория', 'category']);

    // Parse date (DD.MM.YYYY or YYYY-MM-DD)
    const date = this.parseDate(dateStr);
    if (!date) return null;

    // Parse amount (may have comma as decimal separator)
    const amount = this.parseAmount(amountStr);
    if (amount === null || amount === 0) return null;

    // Check status - skip canceled operations
    const status = this.findValue(record, ['Статус', 'status']);
    if (status && status.toLowerCase().includes('отмен')) {
      return null;
    }

    return {
      date,
      amount,
      type: amount > 0 ? 'INCOME' : 'EXPENSE',
      description: description.substring(0, 500),
      category,
    };
  }

  private findValue(
    record: Record<string, string>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      // Try exact match
      if (record[key]) return record[key];

      // Try case-insensitive match
      const lowerKey = key.toLowerCase();
      for (const recordKey of Object.keys(record)) {
        if (recordKey.toLowerCase() === lowerKey) {
          return record[recordKey];
        }
        // Also try partial match for columns with extra text
        if (recordKey.toLowerCase().includes(lowerKey)) {
          return record[recordKey];
        }
      }
    }
    return null;
  }

  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Try DD.MM.YYYY
    const dotMatch = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (dotMatch) {
      const [, day, month, year] = dotMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Try YYYY-MM-DD
    const dashMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dashMatch) {
      const [, year, month, day] = dashMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Try DD/MM/YYYY
    const slashMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    return null;
  }

  private parseAmount(amountStr: string): number | null {
    if (!amountStr) return null;

    // Remove spaces and currency symbols
    let cleaned = amountStr
      .replace(/\s/g, '')
      .replace(/[₽$€]/g, '')
      .replace(/RUB|USD|EUR/gi, '');

    // Replace comma with dot for decimal
    cleaned = cleaned.replace(',', '.');

    // Handle negative amounts (may be in parentheses)
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }

    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : amount;
  }
}
