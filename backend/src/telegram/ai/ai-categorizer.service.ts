import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TransactionForCategorization,
  CategorizationResult,
} from './ai-categorizer.interface';
import { AnthropicProvider } from './anthropic.provider';
import { OpenAiProvider } from './openai.provider';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './categorization-prompt';

interface CacheEntry {
  category: string;
  timestamp: number;
}

@Injectable()
export class AiCategorizerService {
  private readonly logger = new Logger(AiCategorizerService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly BATCH_SIZE = 100;

  constructor(
    private configService: ConfigService,
    private anthropicProvider: AnthropicProvider,
    private openAiProvider: OpenAiProvider,
  ) {}

  /**
   * Get the active AI provider based on configuration
   */
  private getProvider(): AnthropicProvider | OpenAiProvider | null {
    const preferredProvider =
      this.configService.get<string>('AI_PROVIDER') || 'anthropic';

    if (
      preferredProvider === 'anthropic' &&
      this.anthropicProvider.isAvailable()
    ) {
      return this.anthropicProvider;
    }

    if (preferredProvider === 'openai' && this.openAiProvider.isAvailable()) {
      return this.openAiProvider;
    }

    // Fallback to any available provider
    if (this.anthropicProvider.isAvailable()) {
      return this.anthropicProvider;
    }

    if (this.openAiProvider.isAvailable()) {
      return this.openAiProvider;
    }

    return null;
  }

  /**
   * Check if AI categorization is available
   */
  isAvailable(): boolean {
    return this.getProvider() !== null;
  }

  /**
   * Categorize transactions using AI
   * Returns a map of description -> category
   */
  async categorizeTransactions(
    transactions: { type: 'INCOME' | 'EXPENSE'; description: string }[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const uncached: TransactionForCategorization[] = [];

    // Check cache first
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const cacheKey = this.getCacheKey(tx.description, tx.type);
      const cached = this.getFromCache(cacheKey);

      if (cached) {
        result.set(tx.description, cached);
      } else {
        uncached.push({
          id: i,
          type: tx.type,
          description: tx.description,
        });
      }
    }

    // If all cached, return early
    if (uncached.length === 0) {
      this.logger.debug('All transactions found in cache');
      return result;
    }

    // Get AI categorization for uncached
    const provider = this.getProvider();
    if (!provider) {
      this.logger.warn('No AI provider available, using defaults');
      for (const tx of uncached) {
        const defaultCategory =
          tx.type === 'INCOME' ? 'Прочие доходы' : 'Прочие расходы';
        result.set(tx.description, defaultCategory);
      }
      return result;
    }

    // Process in batches
    const aiResults = await this.processBatches(uncached, provider);

    // Update results and cache
    for (const tx of uncached) {
      const category = aiResults[tx.id.toString()];
      if (category) {
        result.set(tx.description, category);
        const cacheKey = this.getCacheKey(tx.description, tx.type);
        this.setCache(cacheKey, category);
      }
    }

    this.logger.log(
      `Categorized ${uncached.length} transactions via AI (${result.size - uncached.length} from cache)`,
    );

    return result;
  }

  /**
   * Categorize a single transaction
   */
  async categorizeOne(
    type: 'INCOME' | 'EXPENSE',
    description: string,
  ): Promise<string> {
    const results = await this.categorizeTransactions([{ type, description }]);
    return (
      results.get(description) ||
      (type === 'INCOME' ? 'Прочие доходы' : 'Прочие расходы')
    );
  }

  /**
   * Process transactions in batches
   */
  private async processBatches(
    transactions: TransactionForCategorization[],
    provider: AnthropicProvider | OpenAiProvider,
  ): Promise<CategorizationResult> {
    const allResults: CategorizationResult = {};

    for (let i = 0; i < transactions.length; i += this.BATCH_SIZE) {
      const batch = transactions.slice(i, i + this.BATCH_SIZE);

      try {
        const batchResults = await provider.categorize(batch);
        Object.assign(allResults, batchResults);
      } catch (error) {
        this.logger.error(`Batch ${i / this.BATCH_SIZE + 1} failed`, error);
        // Use defaults for failed batch
        for (const tx of batch) {
          allResults[tx.id.toString()] =
            tx.type === 'INCOME' ? 'Прочие доходы' : 'Прочие расходы';
        }
      }
    }

    return allResults;
  }

  /**
   * Get available expense categories
   */
  getExpenseCategories(): readonly string[] {
    return EXPENSE_CATEGORIES;
  }

  /**
   * Get available income categories
   */
  getIncomeCategories(): readonly string[] {
    return INCOME_CATEGORIES;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(description: string, type: string): string {
    return `${type}:${description.toLowerCase().trim()}`;
  }

  /**
   * Get from cache if not expired
   */
  private getFromCache(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.category;
  }

  /**
   * Set cache entry
   */
  private setCache(key: string, category: string): void {
    this.cache.set(key, {
      category,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
