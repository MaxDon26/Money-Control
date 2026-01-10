import { Injectable, Logger } from '@nestjs/common';
import {
  AccountRequisites,
  RequisitesParserInterface,
} from './account-requisites.interface';

@Injectable()
export class SberRequisitesParser implements RequisitesParserInterface {
  private readonly logger = new Logger(SberRequisitesParser.name);

  /**
   * Определить, является ли текст PDF реквизитами Сбербанка
   */
  canParse(text: string): boolean {
    return (
      text.includes('Реквизиты счёта') &&
      (text.includes('СБЕРБАНК') ||
        text.includes('Сбербанк') ||
        text.includes('sberbank.ru'))
    );
  }

  /**
   * Парсинг реквизитов Сбербанка
   */
  parse(text: string): AccountRequisites | null {
    try {
      const ownerName = this.extractOwnerName(text);
      const { cardType, cardLastFour } = this.extractCardInfo(text);
      const accountNumber = this.extractAccountNumber(text);
      const currency = this.extractCurrency(text);

      if (!cardLastFour) {
        this.logger.warn(
          'Could not extract card last four digits from Sber PDF',
        );
        return null;
      }

      const suggestedName = cardType
        ? `Сбер ${cardType} •${cardLastFour}`
        : `Сбер •${cardLastFour}`;

      return {
        bankName: 'Сбербанк',
        suggestedName,
        cardLastFour,
        accountNumber,
        currency,
        ownerName,
      };
    } catch (error) {
      this.logger.error('Error parsing Sber requisites', error);
      return null;
    }
  }

  private extractOwnerName(text: string): string {
    // Вариант 1: ФИО в верхнем регистре после "СберБанк Онлайн" и перед "БИК"
    // Формат: "ДОНСКОЙ МАКСИМ ДМИТРИЕВИЧ"
    const match1 = text.match(
      /Сбер[Бб]анк\s+Онлайн[\s\S]*?([А-ЯЁ]{2,}\s+[А-ЯЁ]{2,}\s+[А-ЯЁ]{2,})[\s\S]*?БИК/,
    );
    if (match1) {
      // Преобразуем в нормальный регистр: ДОНСКОЙ -> Донской
      return this.capitalizeWords(match1[1].trim());
    }

    // Вариант 2: "Получатель: Иванов Иван Иванович"
    const match2 = text.match(
      /Получатель[:\s]+([А-ЯЁ][а-яёА-ЯЁ]+\s+[А-ЯЁ][а-яёА-ЯЁ]+\s+[А-ЯЁ][а-яёА-ЯЁ]+)/,
    );
    if (match2) return match2[1].trim();

    // Вариант 3: ФИО в верхнем регистре (три слова подряд ALL CAPS)
    const match3 = text.match(/([А-ЯЁ]{2,}\s+[А-ЯЁ]{2,}\s+[А-ЯЁ]{2,})/);
    if (match3) {
      return this.capitalizeWords(match3[1].trim());
    }

    return '';
  }

  private capitalizeWords(text: string): string {
    return text
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private extractCardInfo(text: string): {
    cardType: string;
    cardLastFour: string;
  } {
    // "МИР Классическая •• 8227" или "Visa Classic •• 1234"
    const match = text.match(
      /КАРТА[\s\S]*?(МИР|Visa|MasterCard|Мир)[^\d]*[\s•*]*(\d{4})/i,
    );

    return {
      cardType: match ? match[1] : '',
      cardLastFour: match ? match[2] : '',
    };
  }

  private extractAccountNumber(text: string): string {
    const match = text.match(/Лицевой счёт получателя\s+([\d\s]+)/);
    return match ? match[1].replace(/\s/g, '') : '';
  }

  private extractCurrency(text: string): string {
    const match = text.match(
      /ВАЛЮТА[\s\S]*?(Российский рубль|Доллар США|Евро)/i,
    );

    if (!match) return 'RUB';

    const currencyText = match[1].toLowerCase();
    if (currencyText.includes('доллар')) return 'USD';
    if (currencyText.includes('евро')) return 'EUR';
    return 'RUB';
  }
}
