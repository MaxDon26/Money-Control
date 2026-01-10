import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AiProvider,
  TransactionForCategorization,
  CategorizationResult,
} from './ai-categorizer.interface';
import {
  CategoryForAi,
  buildSystemPrompt,
  buildUserPrompt,
  DEFAULT_EXPENSE_CATEGORY,
  DEFAULT_INCOME_CATEGORY,
} from './categorization-prompt';

@Injectable()
export class OpenAiProvider implements AiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private client: OpenAI | null = null;
  private readonly model = 'gpt-4o-mini';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.logger.log('OpenAI provider initialized');
    } else {
      this.logger.warn('OPENAI_API_KEY not configured');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async categorize(
    transactions: TransactionForCategorization[],
    categories: CategoryForAi[],
  ): Promise<CategorizationResult> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    if (transactions.length === 0) {
      return {};
    }

    const systemPrompt = buildSystemPrompt(categories);
    const userPrompt = buildUserPrompt(transactions);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const result = this.parseResponse(content, transactions, categories);
      this.logger.debug(
        `Categorized ${transactions.length} transactions via OpenAI`,
      );
      return result;
    } catch (error) {
      this.logger.error('OpenAI categorization failed', error);
      throw error;
    }
  }

  private parseResponse(
    responseText: string,
    transactions: TransactionForCategorization[],
    categories: CategoryForAi[],
  ): CategorizationResult {
    const parsed = JSON.parse(responseText) as Record<string, string>;
    const result: CategorizationResult = {};

    // Build valid category sets from provided categories
    const validExpenseCategories = new Set(
      categories.filter((c) => c.type === 'EXPENSE').map((c) => c.name),
    );
    validExpenseCategories.add(DEFAULT_EXPENSE_CATEGORY);

    const validIncomeCategories = new Set(
      categories.filter((c) => c.type === 'INCOME').map((c) => c.name),
    );
    validIncomeCategories.add(DEFAULT_INCOME_CATEGORY);

    // Validate categories
    for (const tx of transactions) {
      const category = parsed[tx.id.toString()];
      const validCategories =
        tx.type === 'INCOME' ? validIncomeCategories : validExpenseCategories;

      if (category && validCategories.has(category)) {
        result[tx.id.toString()] = category;
      } else {
        // Fallback to default
        result[tx.id.toString()] =
          tx.type === 'INCOME'
            ? DEFAULT_INCOME_CATEGORY
            : DEFAULT_EXPENSE_CATEGORY;
      }
    }

    return result;
  }
}
