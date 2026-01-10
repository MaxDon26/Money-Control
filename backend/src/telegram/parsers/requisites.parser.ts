import { Injectable, Logger } from '@nestjs/common';
import { AccountRequisites } from './account-requisites.interface';
import { SberRequisitesParser } from './sber-requisites.parser';
import { TinkoffRequisitesParser } from './tinkoff-requisites.parser';

// Re-export interface for backward compatibility
export type { AccountRequisites } from './account-requisites.interface';

@Injectable()
export class RequisitesParser {
  private readonly logger = new Logger(RequisitesParser.name);

  constructor(
    private readonly sberParser: SberRequisitesParser,
    private readonly tinkoffParser: TinkoffRequisitesParser,
  ) {}

  /**
   * Универсальный метод парсинга - определяет банк и делегирует парсеру
   */
  parse(text: string): AccountRequisites | null {
    if (this.sberParser.canParse(text)) {
      return this.sberParser.parse(text);
    }

    if (this.tinkoffParser.canParse(text)) {
      return this.tinkoffParser.parse(text);
    }

    this.logger.warn('Unknown requisites PDF format');
    return null;
  }
}
