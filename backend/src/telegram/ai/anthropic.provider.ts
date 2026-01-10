import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
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
export class AnthropicProvider implements AiProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private client: Anthropic | null = null;
  private readonly model = 'claude-3-haiku-20240307';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      this.logger.log('Anthropic provider initialized');
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not configured');
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
      throw new Error('Anthropic client not initialized');
    }

    if (transactions.length === 0) {
      return {};
    }

    const systemPrompt = buildSystemPrompt(categories);
    const userPrompt = buildUserPrompt(transactions);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const result = this.parseResponse(content.text, transactions, categories);
      this.logger.debug(
        `Categorized ${transactions.length} transactions via Anthropic`,
      );
      return result;
    } catch (error) {
      this.logger.error('Anthropic categorization failed', error);
      throw error;
    }
  }

  private parseResponse(
    responseText: string,
    transactions: TransactionForCategorization[],
    categories: CategoryForAi[],
  ): CategorizationResult {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr) as Record<string, string>;
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
