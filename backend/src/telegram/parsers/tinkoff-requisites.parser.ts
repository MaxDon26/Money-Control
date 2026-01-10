import { Injectable, Logger } from '@nestjs/common';
import {
  AccountRequisites,
  RequisitesParserInterface,
} from './account-requisites.interface';

@Injectable()
export class TinkoffRequisitesParser implements RequisitesParserInterface {
  private readonly logger = new Logger(TinkoffRequisitesParser.name);

  /**
   * Определить, является ли текст PDF реквизитами Тинькофф/Т-Банк
   */
  canParse(text: string): boolean {
    return (
      text.includes('реквизитами счета') &&
      (text.includes('ТБАНК') ||
        text.includes('ТБанк') ||
        text.includes('Тинькофф') ||
        text.includes('TBANK.RU') ||
        text.includes('tbank.ru'))
    );
  }

  /**
   * Парсинг реквизитов Тинькофф/Т-Банк
   */
  parse(text: string): AccountRequisites | null {
    try {
      const ownerName = this.extractOwnerName(text);
      const cardLastFour = this.extractCardLastFour(text);
      const accountNumber = this.extractAccountNumber(text);

      if (!cardLastFour) {
        this.logger.warn(
          'Could not extract card last four digits from Tinkoff PDF',
        );
        return null;
      }

      return {
        bankName: 'Тинькофф',
        suggestedName: `Тинькофф •${cardLastFour}`,
        cardLastFour,
        accountNumber,
        currency: 'RUB',
        ownerName,
      };
    } catch (error) {
      this.logger.error('Error parsing Tinkoff requisites', error);
      return null;
    }
  }

  private extractOwnerName(text: string): string {
    // "Получатель: Иванов Иван Иванович"
    const match = text.match(
      /Получатель:\s*([А-ЯЁа-яё]+\s+[А-ЯЁа-яё]+\s+[А-ЯЁа-яё]+)/,
    );
    return match ? match[1].trim() : '';
  }

  private extractCardLastFour(text: string): string {
    // Вариант 1: "карта № 220070******8823"
    const match1 = text.match(/карта\s*№?\s*(\d{6})\*+(\d{4})/i);
    if (match1) return match1[2];

    // Вариант 2: "Расчетная карта № 220070******8823" или просто "1234******5678"
    const match2 = text.match(/(\d{4,6})\*+(\d{4})/);
    if (match2) return match2[2];

    return '';
  }

  private extractAccountNumber(text: string): string {
    // Вариант 1: "счет № 40817810000000000001"
    const match1 = text.match(/счет\s*№?\s*(\d{20})/i);
    if (match1) return match1[1];

    // Вариант 2: "Счет получателя: 40817810000000000001"
    const match2 = text.match(/Счет получателя:\s*(\d{20})/);
    if (match2) return match2[1];

    return '';
  }
}
