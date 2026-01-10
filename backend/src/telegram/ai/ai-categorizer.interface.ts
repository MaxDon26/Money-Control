import { CategoryForAi } from './categorization-prompt';

export interface TransactionForCategorization {
  id: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
}

export interface CategorizationResult {
  [id: string]: string;
}

export interface AiProvider {
  categorize(
    transactions: TransactionForCategorization[],
    categories: CategoryForAi[],
  ): Promise<CategorizationResult>;
  isAvailable(): boolean;
}

export const AI_PROVIDER = 'AI_PROVIDER';
