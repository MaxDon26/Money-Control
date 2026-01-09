import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const { PDFParse } = require('pdf-parse');

interface ParsedTransaction {
  date: Date;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  category?: string;
}

// Sberbank categories that appear in statements
const SBER_CATEGORIES = [
  'Супермаркеты',
  'Рестораны и кафе',
  'Перевод СБП',
  'Перевод с карты',
  'Перевод на карту',
  'Выдача наличных',
  'Оплата по QR–коду СБП',
  'Оплата по QR-коду СБП',
  'Автомобиль',
  'Одежда и аксессуары',
  'Отдых и развлечения',
  'Здоровье и красота',
  'Все для дома',
  'Связь и телеком',
  'Транспорт',
  'ЖКХ',
  'Образование',
  'Прочие расходы', // должен быть последним - fallback
];

@Injectable()
export class SberPdfParser {
  /**
   * Check if PDF content is from Sberbank
   */
  canParse(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (
      (lowerText.includes('сбербанк') ||
        lowerText.includes('sberbank') ||
        lowerText.includes('пао сбербанк') ||
        lowerText.includes('сбер')) &&
      !lowerText.includes('тинькофф') &&
      !lowerText.includes('т-банк')
    );
  }

  async parse(pdfBuffer: Buffer): Promise<ParsedTransaction[]> {
    const transactions: ParsedTransaction[] = [];

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      const parser = new PDFParse({ data: pdfBuffer });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const result = await parser.getText();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await parser.destroy();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const text: string = result.text as string;

      // Split text into lines
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l);

      // Sberbank PDF format (2 lines per transaction):
      // Line 1: DD.MM.YYYY HH:MM AUTHCODE CATEGORY AMOUNT BALANCE
      // Line 2: DD.MM.YYYY DESCRIPTION. Операция по карте ****XXXX
      //
      // Example:
      // 09.01.2026 01:52 294976 Прочие расходы 400,00 13,72
      // 09.01.2026 TIMEWEB.CLOUD SANKT-PETERBU RUS. Операция по карте ****8227
      //
      // Income example (amount has + prefix):
      // 06.01.2026 06:50 595125 Перевод СБП +8 000,00 8 000,00
      // 06.01.2026 Перевод от Д. Максим Дмитриевич. Операция по карте ****8227

      for (let i = 0; i < lines.length - 1; i++) {
        const line1 = lines[i];
        const line2 = lines[i + 1];

        // Try to parse as transaction header (line 1)
        const txData = this.parseTransactionLine(line1);
        if (!txData) continue;

        // Check if next line is the description line
        const descData = this.parseDescriptionLine(line2);
        if (descData) {
          transactions.push({
            date: txData.date,
            amount: Math.abs(txData.amount),
            type: txData.isIncome ? 'INCOME' : 'EXPENSE',
            description: descData.description.substring(0, 500),
            category: txData.category,
          });
          i++; // Skip the description line
        }
      }

      // If no transactions found, try alternative parsing
      if (transactions.length === 0) {
        const altTransactions = this.parseAlternativeFormat(lines);
        transactions.push(...altTransactions);
      }
    } catch {
      // Return empty array on parse error
    }

    return transactions;
  }

  private parseTransactionLine(line: string): {
    date: Date;
    amount: number;
    isIncome: boolean;
    category: string;
  } | null {
    // Pattern: DD.MM.YYYY HH:MM AUTHCODE CATEGORY AMOUNT BALANCE
    // Date and time
    const dateTimeMatch = line.match(/^(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})/);
    if (!dateTimeMatch) return null;

    const date = this.parseDate(dateTimeMatch[1]);
    if (!date) return null;

    // Auth code (6 digits after time)
    const authCodeMatch = line.match(/\d{2}:\d{2}\s+(\d{6})/);
    if (!authCodeMatch) return null;

    // Find category
    let category = '';
    let categoryEndIndex = -1;
    for (const cat of SBER_CATEGORIES) {
      const catIndex = line.indexOf(cat);
      if (catIndex > -1) {
        category = cat;
        categoryEndIndex = catIndex + cat.length;
        break;
      }
    }

    if (!category) return null;

    // Extract amount and balance after category
    const afterCategory = line.substring(categoryEndIndex).trim();
    // Pattern: AMOUNT BALANCE where amount may have + prefix
    // Example: "400,00 13,72" or "+8 000,00 8 000,00"
    const amountMatch = afterCategory.match(
      /^([+-]?[\d\s]+[,.]?\d*)\s+([\d\s]+[,.]\d{2})$/,
    );

    if (!amountMatch) return null;

    const amountStr = amountMatch[1];
    const amount = this.parseAmount(amountStr);
    if (amount === null) return null;

    const isIncome = amountStr.includes('+');

    return { date, amount, isIncome, category };
  }

  private parseDescriptionLine(line: string): { description: string } | null {
    // Description line starts with date and contains "Операция по карте"
    const dateMatch = line.match(/^(\d{2}\.\d{2}\.\d{4})\s+(.+)/);
    if (!dateMatch) return null;

    let description = dateMatch[2].trim();

    // Remove various forms of "Операция по карте ****XXXX" suffix
    // May have different spacing, line breaks, or partial text
    description = description
      .replace(/[.\s]*Операция\s*по\s*карте\s*\*+\d*\s*$/i, '')
      .replace(/[.\s]*Операция\s*$/i, '') // Partial "Операция" at end
      .replace(/[.\s]*Операция\s*по\s*$/i, '') // Partial "Операция по"
      .replace(/[.\s]*Операция\s*по\s*карте\s*$/i, ''); // Without card number

    // Clean up description
    description = description.trim();
    if (description.endsWith('.')) {
      description = description.slice(0, -1);
    }

    if (!description) return null;

    return { description };
  }

  private parseAlternativeFormat(lines: string[]): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];

    // Try simpler pattern matching for different formats
    for (const line of lines) {
      // Try to match: DD.MM.YYYY ... AMOUNT BALANCE
      const match = line.match(
        /(\d{2}\.\d{2}\.\d{4})(?:\s+\d{2}:\d{2})?\s+\d{6}\s+(.+?)\s+([+-]?[\d\s]+[,.]\d{2})\s+[\d\s]+[,.]\d{2}$/,
      );

      if (match) {
        const date = this.parseDate(match[1]);
        const middlePart = match[2].trim();
        const amountStr = match[3];
        const amount = this.parseAmount(amountStr);

        if (date && amount !== null && amount !== 0) {
          // Try to extract category from middle part
          let category = '';
          let description = middlePart;

          for (const cat of SBER_CATEGORIES) {
            if (middlePart.includes(cat)) {
              category = cat;
              description = middlePart.replace(cat, '').trim();
              break;
            }
          }

          transactions.push({
            date,
            amount: Math.abs(amount),
            type: amountStr.includes('+') ? 'INCOME' : 'EXPENSE',
            description: description.substring(0, 500),
            category: category || undefined,
          });
        }
      }
    }

    return transactions;
  }

  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    return null;
  }

  private parseAmount(amountStr: string): number | null {
    if (!amountStr) return null;

    // Clean up: remove spaces, replace comma with dot
    let cleaned = amountStr.replace(/\s/g, '').replace(',', '.');

    // Handle + and - signs
    const isNegative = cleaned.includes('-');
    const isPositive = cleaned.includes('+');
    cleaned = cleaned.replace(/[+-]/g, '');

    const amount = parseFloat(cleaned);
    if (isNaN(amount)) return null;

    // Return positive for income (+), negative for expense (default)
    if (isPositive) return amount;
    if (isNegative) return -amount;
    return -amount; // Default to expense
  }
}
