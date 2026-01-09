import { Injectable } from '@nestjs/common';
import { CategoryMapper } from './category-mapper';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const { PDFParse } = require('pdf-parse');

interface ParsedTransaction {
  date: Date;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  category?: string;
}

// Keywords to filter out (internal transfers, cashback savings, etc.)
const SKIP_KEYWORDS = [
  'внутренний перевод на договор', // cashback savings
  'комиссия за снятие наличных', // ATM fee (already included in withdrawal)
];

@Injectable()
export class TinkoffPdfParser {
  constructor(private categoryMapper: CategoryMapper) {}

  /**
   * Check if PDF content is from Tinkoff/T-Bank
   */
  canParse(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (
      lowerText.includes('тинькофф') ||
      lowerText.includes('tinkoff') ||
      lowerText.includes('т-банк') ||
      lowerText.includes('t-bank') ||
      lowerText.includes('тбанк') ||
      lowerText.includes('ао «тбанк»') ||
      lowerText.includes('справка о движении средств')
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

      // Parse transactions from text
      const parsedTx = this.parseTransactionFormat(text);
      transactions.push(...parsedTx);
    } catch {
      // Return empty array on parse error
    }

    return transactions;
  }

  /**
   * Parse Tinkoff "Справка о движении средств" format
   * Format: DD.MM.YYYY HH:MM DD.MM.YYYY HH:MM -AMOUNT ₽ -AMOUNT ₽ Description CardNumber
   */
  private parseTransactionFormat(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const lines = text.split('\n').map((l) => l.trim());

    // Pattern to match date-time at start of line: DD.MM.YYYY HH:MM
    const dateTimePattern = /^(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})/;

    // Pattern to match amount: +/-XXX XXX,XX ₽ or +/-XXX,XX ₽
    const amountPattern = /([+-]?[\d\s]+[,.]?\d*)\s*₽/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line starts with date
      const dateMatch = line.match(dateTimePattern);
      if (!dateMatch) continue;

      const operationDate = this.parseDate(dateMatch[1]);
      if (!operationDate) continue;

      // Find all amounts in the line
      const amounts: number[] = [];
      let match: RegExpExecArray | null;
      while ((match = amountPattern.exec(line)) !== null) {
        const amountStr = match[1];
        const amount = this.parseAmount(amountStr);
        if (amount !== null) {
          amounts.push(amount);
        }
      }
      // Reset regex
      amountPattern.lastIndex = 0;

      // Need at least one amount
      if (amounts.length === 0) continue;

      // Use the first amount (operation amount)
      const amount = amounts[0];
      if (amount === 0) continue;

      // Extract description - everything after the last amount
      let description = line;

      // Remove dates at the beginning
      description = description
        .replace(/^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}/g, '')
        .trim();
      description = description
        .replace(/^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}/g, '')
        .trim();

      // Remove amounts
      description = description
        .replace(/[+-]?[\d\s]+[,.]\d{2}\s*₽/g, '')
        .trim();

      // Remove card number at the end (4 digits)
      description = description.replace(/\s+\d{4}$/, '').trim();

      // Skip internal transfers and fees
      const lowerDesc = description.toLowerCase();
      if (SKIP_KEYWORDS.some((kw) => lowerDesc.includes(kw))) {
        continue;
      }

      // Clean up description
      description = this.cleanDescription(description);

      if (!description) continue;

      // Determine type based on amount sign
      const type = amount > 0 ? 'INCOME' : 'EXPENSE';

      // Get category from mapper
      const categoryInfo = this.categoryMapper.mapCategory(description, type);

      transactions.push({
        date: operationDate,
        amount: Math.abs(amount),
        type,
        description: description.substring(0, 500),
        category: categoryInfo.name,
      });
    }

    return transactions;
  }

  private cleanDescription(description: string): string {
    // Remove common suffixes
    let cleaned = description
      .replace(/\s+RUS$/i, '')
      .replace(/\s+Russia$/i, '')
      .replace(/\s+Россия$/i, '')
      .replace(/Ipatovo$/i, '')
      .replace(/Stavropol$/i, '')
      .replace(/Moskva$/i, '')
      .replace(/Moscow$/i, '')
      .trim();

    // Clean up multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Capitalize first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned;
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

    // Return positive for income (+), negative for expense (-)
    if (isPositive) return amount;
    if (isNegative) return -amount;
    return -amount; // Default to expense
  }
}
