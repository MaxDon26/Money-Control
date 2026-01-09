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
export class TinkoffPdfParser {
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
      lowerText.includes('ао «тинькофф банк»')
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

      // Find transaction patterns
      // Typical Tinkoff format: DD.MM.YYYY Description +/-Amount
      const dateAmountPattern = /(\d{2}\.\d{2}\.\d{4})/;
      const amountPattern = /([+-]?\s*[\d\s]+[,.]?\d*)\s*[₽руб.RUB]?$/i;

      let currentDate: Date | null = null;
      let currentDescription = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Try to find date
        const dateMatch = line.match(dateAmountPattern);
        if (dateMatch) {
          // Save previous transaction if exists
          if (currentDate && currentDescription) {
            const amountMatch = currentDescription.match(amountPattern);
            if (amountMatch) {
              const amount = this.parseAmount(amountMatch[1]);
              if (amount !== null && amount !== 0) {
                transactions.push({
                  date: currentDate,
                  amount: Math.abs(amount),
                  type: amount > 0 ? 'INCOME' : 'EXPENSE',
                  description: currentDescription
                    .replace(amountPattern, '')
                    .trim()
                    .substring(0, 500),
                });
              }
            }
          }

          // Parse new date
          currentDate = this.parseDate(dateMatch[1]);
          currentDescription = line.replace(dateMatch[0], '').trim();
        } else if (currentDate) {
          // Append to current description
          currentDescription += ' ' + line;
        }
      }

      // Don't forget the last transaction
      if (currentDate && currentDescription) {
        const amountMatch = currentDescription.match(amountPattern);
        if (amountMatch) {
          const amount = this.parseAmount(amountMatch[1]);
          if (amount !== null && amount !== 0) {
            transactions.push({
              date: currentDate,
              amount: Math.abs(amount),
              type: amount > 0 ? 'INCOME' : 'EXPENSE',
              description: currentDescription
                .replace(amountPattern, '')
                .trim()
                .substring(0, 500),
            });
          }
        }
      }

      // Alternative parsing: look for structured table data
      if (transactions.length === 0) {
        const altTransactions = this.parseAlternativeFormat(text);
        transactions.push(...altTransactions);
      }
    } catch {
      // Return empty array on parse error
    }

    return transactions;
  }

  private parseAlternativeFormat(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];

    // Pattern: date, then description, then amount with +/-
    // Try to find lines with amounts
    const lines = text.split('\n');

    for (const line of lines) {
      // Look for pattern: DD.MM.YYYY ... amount
      const match = line.match(
        /(\d{2}\.\d{2}\.\d{4})\s+(.+?)\s+([+-]?\s*[\d\s]+[,.]\d{2})\s*$/,
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
    let cleaned = amountStr
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace(/[₽руб.RUB]/gi, '');

    // Handle + and - signs
    const isNegative = cleaned.includes('-');
    cleaned = cleaned.replace(/[+-]/g, '');

    const amount = parseFloat(cleaned);
    if (isNaN(amount)) return null;

    return isNegative ? -amount : amount;
  }
}
