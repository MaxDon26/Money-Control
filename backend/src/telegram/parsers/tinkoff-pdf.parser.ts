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
   * Extract account metadata from Tinkoff statement PDF
   * Returns accountNumber (20 digits) and bankName
   */
  async extractAccountInfo(
    pdfBuffer: Buffer,
  ): Promise<{ accountNumber: string | null; bankName: string }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      const parser = new PDFParse({ data: pdfBuffer });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const result = await parser.getText();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await parser.destroy();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const text: string = result.text as string;

      // Look for account number pattern: "Номер лицевого счета" or "Номер счета" followed by 20 digits
      const accountPatterns = [
        /номер\s+лицевого\s+счета[:\s]*(\d{20})/i,
        /номер\s+счета[:\s]*(\d{20})/i,
        /лицевой\s+счет[:\s]*(\d{20})/i,
        /счет[:\s]*(\d{20})/i,
        /(\d{20})/, // Fallback: any 20-digit number
      ];

      let accountNumber: string | null = null;
      for (const pattern of accountPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          accountNumber = match[1];
          break;
        }
      }

      return {
        accountNumber,
        bankName: 'Тинькофф',
      };
    } catch {
      return { accountNumber: null, bankName: 'Тинькофф' };
    }
  }

  /**
   * Parse Tinkoff "Справка о движении средств" format
   * Format: DD.MM.YYYY HH:MM DD.MM.YYYY HH:MM -AMOUNT ₽ -AMOUNT ₽ Description CardNumber
   */
  private parseTransactionFormat(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l);

    // Date pattern: DD.MM.YYYY (standalone line)
    const datePattern = /^(\d{2}\.\d{2}\.\d{4})$/;
    // Time pattern: HH:MM (standalone line)
    const timePattern = /^(\d{2}:\d{2})$/;
    // Amount line pattern: "-24.87 ₽ -24.87 ₽ Description text"
    const amountLinePattern = /^([+-]?\d+[.,]\d{2})\s*₽\s*[+-]?\d+[.,]\d{2}\s*₽\s*(.*)$/;
    // Card number pattern: 4 digits
    const cardPattern = /^\d{4}$/;

    let i = 0;
    while (i < lines.length) {
      // Look for date line
      const dateMatch = lines[i].match(datePattern);
      if (!dateMatch) {
        i++;
        continue;
      }

      const operationDate = this.parseDate(dateMatch[1]);
      if (!operationDate) {
        i++;
        continue;
      }

      // Next should be time
      if (i + 1 >= lines.length || !lines[i + 1].match(timePattern)) {
        i++;
        continue;
      }

      // Skip operation date/time (2 lines) and settlement date/time (2 more lines)
      let j = i + 2;

      // Skip settlement date/time if present
      if (j < lines.length && lines[j].match(datePattern)) {
        j++; // skip settlement date
        if (j < lines.length && lines[j].match(timePattern)) {
          j++; // skip settlement time
        }
      }

      // Now look for amount line: "-24.87 ₽ -24.87 ₽ Description"
      if (j >= lines.length) {
        i++;
        continue;
      }

      const amountMatch = lines[j].match(amountLinePattern);
      if (!amountMatch) {
        i++;
        continue;
      }

      const amount = this.parseAmount(amountMatch[1]);
      if (amount === null) {
        i++;
        continue;
      }

      // Start collecting description from remainder of amount line
      const descLines: string[] = [];
      if (amountMatch[2]) {
        descLines.push(amountMatch[2]);
      }
      j++;

      // Collect more description lines until we hit card number or next date
      while (j < lines.length) {
        const line = lines[j];
        // Stop if we hit a card number (4 digits) or a new date
        if (line.match(cardPattern) || line.match(datePattern)) {
          if (line.match(cardPattern)) j++; // skip card number
          break;
        }
        descLines.push(line);
        j++;
      }

      let description = descLines.join(' ').trim();

      // Skip internal transfers and fees
      const lowerDesc = description.toLowerCase();
      if (SKIP_KEYWORDS.some((kw) => lowerDesc.includes(kw))) {
        i = j;
        continue;
      }

      // Clean up description
      description = this.cleanDescription(description);

      if (!description) {
        i = j;
        continue;
      }

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

      // Move to next position
      i = j;
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
