import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const pdfParse = require('pdf-parse');

interface PdfData {
  text: string;
}

interface ParsedTransaction {
  date: Date;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  category?: string;
}

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const data = (await pdfParse(pdfBuffer)) as PdfData;
      const text: string = data.text;

      // Split text into lines
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l);

      // Sberbank statement patterns
      // Format 1: DD.MM.YYYY Description Amount
      // Format 2: Separate columns for income/expense

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Try to match standard Sber format
        // Pattern: DD.MM.YYYY HH:MM description amount
        const match = line.match(
          /(\d{2}\.\d{2}\.\d{4})(?:\s+\d{2}:\d{2})?\s+(.+?)\s+([+-]?\s*[\d\s]+[,.]\d{2})\s*(?:₽|руб|RUB)?$/i,
        );

        if (match) {
          const date = this.parseDate(match[1]);
          const description = match[2].trim();
          const amount = this.parseAmount(match[3]);

          if (date && amount !== null && amount !== 0) {
            transactions.push({
              date,
              amount: Math.abs(amount),
              type: amount > 0 ? 'INCOME' : 'EXPENSE',
              description: description.substring(0, 500),
            });
          }
          continue;
        }

        // Alternative: look for date and then find amount on same or next line
        const dateMatch = line.match(/^(\d{2}\.\d{2}\.\d{4})/);
        if (dateMatch) {
          const date = this.parseDate(dateMatch[1]);
          if (!date) continue;

          // Try to extract description and amount from remaining line
          let remaining = line.substring(dateMatch[0].length).trim();

          // Remove time if present
          remaining = remaining.replace(/^\d{2}:\d{2}\s*/, '');

          // Look for amount pattern
          const amountMatch = remaining.match(
            /([+-]?\s*[\d\s]+[,.]\d{2})\s*(?:₽|руб|RUB)?$/i,
          );

          if (amountMatch) {
            const amount = this.parseAmount(amountMatch[1]);
            const description = remaining.replace(amountMatch[0], '').trim();

            if (amount !== null && amount !== 0 && description) {
              transactions.push({
                date,
                amount: Math.abs(amount),
                type: amount > 0 ? 'INCOME' : 'EXPENSE',
                description: description.substring(0, 500),
              });
            }
          }
        }
      }

      // Try alternative parsing if no transactions found
      if (transactions.length === 0) {
        const altTransactions = this.parseTableFormat(text);
        transactions.push(...altTransactions);
      }
    } catch {
      // Return empty array on parse error
    }

    return transactions;
  }

  private parseTableFormat(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];

    // Split into lines
    const lines = text.split('\n');

    // Look for table-like structure with separate debit/credit columns
    // Pattern: Date | Description | Debit | Credit | Balance

    for (const line of lines) {
      // Try various Sber table formats
      // Format: DD.MM.YYYY Description Debit Credit
      const tableMatch = line.match(
        /(\d{2}\.\d{2}\.\d{4})\s+(.+?)\s+([\d\s]+[,.]\d{2})?\s*([\d\s]+[,.]\d{2})?$/,
      );

      if (tableMatch) {
        const date = this.parseDate(tableMatch[1]);
        const description = tableMatch[2]?.trim();
        const debit = tableMatch[3] ? this.parseAmount(tableMatch[3]) : null;
        const credit = tableMatch[4] ? this.parseAmount(tableMatch[4]) : null;

        if (date && description) {
          if (debit && debit > 0) {
            transactions.push({
              date,
              amount: debit,
              type: 'EXPENSE',
              description: description.substring(0, 500),
            });
          } else if (credit && credit > 0) {
            transactions.push({
              date,
              amount: credit,
              type: 'INCOME',
              description: description.substring(0, 500),
            });
          }
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

    // Try short year format DD.MM.YY
    const shortMatch = dateStr.match(/(\d{2})\.(\d{2})\.(\d{2})/);
    if (shortMatch) {
      const [, day, month, year] = shortMatch;
      const fullYear = parseInt(year) + 2000;
      return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    }

    return null;
  }

  private parseAmount(amountStr: string): number | null {
    if (!amountStr) return null;

    // Clean up
    let cleaned = amountStr
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace(/[₽руб.RUB]/gi, '');

    // Handle signs
    const isNegative = cleaned.includes('-');
    cleaned = cleaned.replace(/[+-]/g, '');

    const amount = parseFloat(cleaned);
    if (isNaN(amount)) return null;

    return isNegative ? -amount : amount;
  }
}
