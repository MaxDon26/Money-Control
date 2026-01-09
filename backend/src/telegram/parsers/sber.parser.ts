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
export class SberParser {
  /**
   * Check if CSV content is from Sberbank
   * Sberbank CSV typically has different format variations
   */
  canParse(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return (
      // Check for Sber-specific patterns
      (lowerContent.includes('сбербанк') ||
        lowerContent.includes('sber') ||
        // Or check for typical Sber column patterns
        (lowerContent.includes('дата') &&
          (lowerContent.includes('списание') ||
            lowerContent.includes('зачисление') ||
            lowerContent.includes('приход') ||
            lowerContent.includes('расход')))) &&
      !lowerContent.includes('тинькофф') // Make sure it's not Tinkoff
    );
  }

  parse(content: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];

    // Try different delimiters
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
      'Дата',
      'Дата операции',
      'Дата проведения',
      'date',
    ]);
    if (!dateStr) return null;

    // Sber often has separate columns for income and expense
    const incomeStr = this.findValue(record, [
      'Зачисление',
      'Приход',
      'Поступление',
      'credit',
    ]);
    const expenseStr = this.findValue(record, [
      'Списание',
      'Расход',
      'Сумма списания',
      'debit',
    ]);
    const amountStr = this.findValue(record, [
      'Сумма',
      'Сумма операции',
      'amount',
    ]);

    // Determine type and amount
    let amount: number | null = null;
    let type: 'INCOME' | 'EXPENSE';

    if (incomeStr && this.parseAmount(incomeStr)) {
      amount = this.parseAmount(incomeStr);
      type = 'INCOME';
    } else if (expenseStr && this.parseAmount(expenseStr)) {
      amount = this.parseAmount(expenseStr);
      type = 'EXPENSE';
    } else if (amountStr) {
      amount = this.parseAmount(amountStr);
      if (amount === null) return null;

      // Check for type indicator
      const typeStr = this.findValue(record, [
        'Тип операции',
        'Тип',
        'Операция',
        'type',
      ]);

      if (typeStr) {
        const lowerType = typeStr.toLowerCase();
        if (
          lowerType.includes('поступ') ||
          lowerType.includes('зачисл') ||
          lowerType.includes('приход')
        ) {
          type = 'INCOME';
        } else {
          type = 'EXPENSE';
        }
      } else {
        // If positive - income, negative - expense
        type = amount > 0 ? 'INCOME' : 'EXPENSE';
      }
    }

    if (amount === null || amount === 0) return null;

    // Find description
    const description =
      this.findValue(record, [
        'Описание',
        'Назначение',
        'Назначение платежа',
        'Наименование',
        'description',
      ]) || 'Без описания';

    // Find category
    const category = this.findValue(record, ['Категория', 'category']);

    // Parse date
    const date = this.parseDate(dateStr);
    if (!date) return null;

    return {
      date,
      amount: Math.abs(amount),
      type,
      description: description.substring(0, 500),
      category,
    };
  }

  private findValue(
    record: Record<string, string>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      if (record[key]) return record[key];

      const lowerKey = key.toLowerCase();
      for (const recordKey of Object.keys(record)) {
        if (recordKey.toLowerCase() === lowerKey) {
          return record[recordKey];
        }
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

    // Try DD.MM.YY
    const shortDotMatch = dateStr.match(/(\d{2})\.(\d{2})\.(\d{2})/);
    if (shortDotMatch) {
      const [, day, month, year] = shortDotMatch;
      const fullYear = parseInt(year) + 2000;
      return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    }

    // Try YYYY-MM-DD
    const dashMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dashMatch) {
      const [, year, month, day] = dashMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    return null;
  }

  private parseAmount(amountStr: string): number | null {
    if (!amountStr) return null;

    let cleaned = amountStr
      .replace(/\s/g, '')
      .replace(/[₽$€]/g, '')
      .replace(/RUB|USD|EUR/gi, '')
      .replace(/руб\.?/gi, '');

    // Replace comma with dot
    cleaned = cleaned.replace(',', '.');

    // Handle negative in parentheses
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }

    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : amount;
  }
}
