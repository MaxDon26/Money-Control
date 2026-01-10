import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TinkoffParser } from '../telegram/parsers/tinkoff.parser';
import { SberParser } from '../telegram/parsers/sber.parser';
import { TinkoffPdfParser } from '../telegram/parsers/tinkoff-pdf.parser';
import { SberPdfParser } from '../telegram/parsers/sber-pdf.parser';
import { CategoryMapper } from '../telegram/parsers/category-mapper';
import { AiCategorizerService } from '../telegram/ai/ai-categorizer.service';
import {
  CategoryForAi,
  DEFAULT_EXPENSE_CATEGORY,
  DEFAULT_INCOME_CATEGORY,
} from '../telegram/ai/categorization-prompt';
import { ImportResultDto, DetectAccountResultDto } from './dto';

interface ParsedTransaction {
  date: Date;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  category?: string;
}

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const { PDFParse } = require('pdf-parse');

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private prisma: PrismaService,
    private tinkoffParser: TinkoffParser,
    private sberParser: SberParser,
    private tinkoffPdfParser: TinkoffPdfParser,
    private sberPdfParser: SberPdfParser,
    private categoryMapper: CategoryMapper,
    private aiCategorizer: AiCategorizerService,
  ) {}

  /**
   * Detect account from statement file by extracting accountNumber and matching with existing accounts
   */
  async detectAccount(
    userId: string,
    file: UploadedFile,
  ): Promise<DetectAccountResultDto> {
    const filename = file.originalname.toLowerCase();
    const isPdf = filename.endsWith('.pdf');

    if (!isPdf) {
      // CSV doesn't contain account number, just detect bank
      const content = file.buffer.toString('utf-8');
      let bankName = 'Неизвестно';
      if (this.tinkoffParser.canParse(content)) {
        bankName = 'Тинькофф';
      } else if (this.sberParser.canParse(content)) {
        bankName = 'Сбербанк';
      }
      return {
        bankName,
        accountNumber: null,
        matchedAccountId: null,
        matchedAccountName: null,
      };
    }

    // PDF - extract account info
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const pdfParser = new PDFParse({ data: file.buffer });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const pdfResult = await pdfParser.getText();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await pdfParser.destroy();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const pdfText: string = pdfResult.text as string;

    let bankName = 'Неизвестно';
    let accountNumber: string | null = null;

    if (this.tinkoffPdfParser.canParse(pdfText)) {
      const info = await this.tinkoffPdfParser.extractAccountInfo(file.buffer);
      bankName = info.bankName;
      accountNumber = info.accountNumber;
    } else if (this.sberPdfParser.canParse(pdfText)) {
      const info = await this.sberPdfParser.extractAccountInfo(file.buffer);
      bankName = info.bankName;
      accountNumber = info.accountNumber;
    }

    // Try to find matching account by accountNumber
    let matchedAccountId: string | null = null;
    let matchedAccountName: string | null = null;

    if (accountNumber) {
      const matchedAccount = await this.prisma.account.findFirst({
        where: {
          userId,
          accountNumber,
          isArchived: false,
        },
        select: { id: true, name: true },
      });

      if (matchedAccount) {
        matchedAccountId = matchedAccount.id;
        matchedAccountName = matchedAccount.name;
        this.logger.log(
          `Matched account by accountNumber: ${accountNumber} -> ${matchedAccount.name}`,
        );
      }
    }

    return {
      bankName,
      accountNumber,
      matchedAccountId,
      matchedAccountName,
    };
  }

  async importStatement(
    userId: string,
    accountId: string,
    file: UploadedFile,
  ): Promise<ImportResultDto> {
    // Validate account belongs to user
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId, isArchived: false },
    });

    if (!account) {
      throw new BadRequestException('Счёт не найден');
    }

    // Parse file
    const { transactions, bankName } = await this.parseFile(file);
    this.logger.log(`Parsed ${transactions.length} transactions from ${bankName}`);

    if (transactions.length === 0) {
      this.logger.warn(`No transactions parsed from file: ${file.originalname}`);
      return {
        imported: 0,
        skipped: 0,
        bankName,
      };
    }

    // Import transactions
    return this.processImport(userId, accountId, transactions, bankName);
  }

  private async parseFile(
    file: UploadedFile,
  ): Promise<{ transactions: ParsedTransaction[]; bankName: string }> {
    const filename = file.originalname.toLowerCase();
    const isCsv = filename.endsWith('.csv');
    const isPdf = filename.endsWith('.pdf');

    if (!isCsv && !isPdf) {
      throw new BadRequestException('Поддерживаются только CSV и PDF файлы');
    }

    if (isCsv) {
      const content = file.buffer.toString('utf-8');

      if (this.tinkoffParser.canParse(content)) {
        return {
          transactions: this.tinkoffParser.parse(content),
          bankName: 'Тинькофф',
        };
      }

      if (this.sberParser.canParse(content)) {
        return {
          transactions: this.sberParser.parse(content),
          bankName: 'Сбербанк',
        };
      }

      throw new BadRequestException(
        'Не удалось определить формат CSV. Поддерживаются: Тинькофф, Сбербанк',
      );
    }

    // PDF parsing
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const pdfParser = new PDFParse({ data: file.buffer });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const pdfResult = await pdfParser.getText();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await pdfParser.destroy();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const pdfText: string = pdfResult.text as string;

    if (this.tinkoffPdfParser.canParse(pdfText)) {
      return {
        transactions: await this.tinkoffPdfParser.parse(file.buffer),
        bankName: 'Тинькофф',
      };
    }

    if (this.sberPdfParser.canParse(pdfText)) {
      return {
        transactions: await this.sberPdfParser.parse(file.buffer),
        bankName: 'Сбербанк',
      };
    }

    throw new BadRequestException(
      'Не удалось определить формат PDF. Поддерживаются: Тинькофф, Сбербанк',
    );
  }

  private async processImport(
    userId: string,
    accountId: string,
    transactions: ParsedTransaction[],
    bankName: string,
  ): Promise<ImportResultDto> {
    // Load user's categories from DB
    const userCategories = await this.prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true },
    });

    // Ensure default categories exist
    await this.ensureDefaultCategories(userId);

    // Build category map
    const categoryCache = new Map<string, string>();
    const categoriesForAi: CategoryForAi[] = [];

    for (const cat of userCategories) {
      const cacheKey = `${cat.type}:${cat.name}`;
      categoryCache.set(cacheKey, cat.id);
      categoriesForAi.push({
        name: cat.name,
        type: cat.type as 'INCOME' | 'EXPENSE',
      });
    }

    // Cache default categories
    const defaultExpense = await this.prisma.category.findFirst({
      where: { userId, name: DEFAULT_EXPENSE_CATEGORY, type: 'EXPENSE' },
    });
    const defaultIncome = await this.prisma.category.findFirst({
      where: { userId, name: DEFAULT_INCOME_CATEGORY, type: 'INCOME' },
    });

    if (defaultExpense) {
      categoryCache.set(
        `EXPENSE:${DEFAULT_EXPENSE_CATEGORY}`,
        defaultExpense.id,
      );
    }
    if (defaultIncome) {
      categoryCache.set(`INCOME:${DEFAULT_INCOME_CATEGORY}`, defaultIncome.id);
    }

    // Categorize transactions using keyword matching
    const categorizedTransactions = transactions.map((tx) => {
      const categoryResult = this.categoryMapper.mapCategory(
        tx.description,
        tx.type,
      );
      return {
        ...tx,
        category: categoryResult.name,
        confidence: categoryResult.confidence,
      };
    });

    // Collect low-confidence for AI
    const lowConfidenceTransactions = categorizedTransactions.filter(
      (tx) => tx.confidence === 'low',
    );

    let aiCategorized = 0;
    const keywordCategorized =
      transactions.length - lowConfidenceTransactions.length;

    // Use AI for low-confidence transactions
    if (
      lowConfidenceTransactions.length > 0 &&
      this.aiCategorizer.isAvailable()
    ) {
      try {
        const aiInput = lowConfidenceTransactions.map((tx) => ({
          type: tx.type,
          description: tx.description,
        }));

        const aiResults = await this.aiCategorizer.categorizeTransactions(
          aiInput,
          categoriesForAi,
        );

        for (const tx of lowConfidenceTransactions) {
          const aiCategory = aiResults.get(tx.description);
          if (aiCategory) {
            tx.category = aiCategory;
            aiCategorized++;
          }
        }

        this.logger.log(
          `AI categorized ${aiCategorized}/${lowConfidenceTransactions.length} transactions`,
        );
      } catch (error) {
        this.logger.error('AI categorization failed, using defaults', error);
      }
    }

    // Import transactions
    let imported = 0;
    let skipped = 0;

    for (const tx of categorizedTransactions) {
      // Check for duplicates
      const existing = await this.prisma.transaction.findFirst({
        where: {
          userId,
          date: tx.date,
          amount: Math.abs(tx.amount),
          description: tx.description,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Find category
      const cacheKey = `${tx.type}:${tx.category}`;
      let categoryId = categoryCache.get(cacheKey);

      // If exact match not found, try smart matching based on description
      if (!categoryId) {
        categoryId = this.findCategoryByDescription(
          tx.description,
          tx.type,
          userCategories,
          categoryCache,
        );
      }

      // Fallback to default category
      if (!categoryId) {
        const defaultKey =
          tx.type === 'INCOME'
            ? `INCOME:${DEFAULT_INCOME_CATEGORY}`
            : `EXPENSE:${DEFAULT_EXPENSE_CATEGORY}`;
        categoryId = categoryCache.get(defaultKey);

        if (!categoryId) {
          this.logger.error(`Default category not found for type ${tx.type}`);
          continue;
        }
      }

      // Create transaction (without updating balance - imported transactions are historical)
      await this.prisma.transaction.create({
        data: {
          userId,
          accountId,
          categoryId,
          type: tx.type,
          amount: Math.abs(tx.amount),
          description: tx.description,
          date: tx.date,
        },
      });

      imported++;
    }

    return {
      imported,
      skipped,
      bankName,
      categorization: {
        byKeywords: keywordCategorized,
        byAi: aiCategorized,
        byDefault: lowConfidenceTransactions.length - aiCategorized,
      },
    };
  }

  private async ensureDefaultCategories(userId: string): Promise<void> {
    const existingExpense = await this.prisma.category.findFirst({
      where: { userId, name: DEFAULT_EXPENSE_CATEGORY, type: 'EXPENSE' },
    });
    if (!existingExpense) {
      await this.prisma.category.create({
        data: {
          userId,
          name: DEFAULT_EXPENSE_CATEGORY,
          type: 'EXPENSE',
          isSystem: false,
        },
      });
    }

    const existingIncome = await this.prisma.category.findFirst({
      where: { userId, name: DEFAULT_INCOME_CATEGORY, type: 'INCOME' },
    });
    if (!existingIncome) {
      await this.prisma.category.create({
        data: {
          userId,
          name: DEFAULT_INCOME_CATEGORY,
          type: 'INCOME',
          isSystem: false,
        },
      });
    }
  }

  /**
   * Smart category matching based on transaction description
   * Matches user's category names to transaction keywords
   */
  private findCategoryByDescription(
    description: string,
    type: 'INCOME' | 'EXPENSE',
    userCategories: { id: string; name: string; type: string }[],
    categoryCache: Map<string, string>,
  ): string | undefined {
    const lowerDesc = description.toLowerCase();

    // Keywords to look for in description and their category patterns
    // Pattern matches user category names that contain the pattern
    const patterns = [
      // Переводы - match "Переводы входящие" or "Переводы исходящие"
      { keywords: ['перевод', 'сбп', 'p2p'], categoryPattern: 'перевод' },
      // Снятие наличных
      {
        keywords: ['наличн', 'atm', 'банкомат', 'снятие'],
        categoryPattern: 'наличн|снятие',
      },
      // Зарплата
      {
        keywords: ['зарплат', 'salary', 'оклад', 'аванс'],
        categoryPattern: 'зарплат',
      },
      // Кэшбэк и возврат
      {
        keywords: ['кэшбэк', 'cashback', 'возврат', 'бонус'],
        categoryPattern: 'кэшбэк|возврат',
      },
      // Проценты и дивиденды
      {
        keywords: ['процент', 'дивиденд', 'вклад', 'депозит'],
        categoryPattern: 'процент|дивиденд',
      },
      // Кредиты и займы
      {
        keywords: ['кредит', 'займ', 'ипотека', 'погашение', 'рассрочка'],
        categoryPattern: 'кредит|займ',
      },
    ];

    for (const pattern of patterns) {
      // Check if description matches any keyword
      const descMatches = pattern.keywords.some((kw) => lowerDesc.includes(kw));
      if (!descMatches) continue;

      // Find user category that matches the pattern
      const matchingCategory = userCategories.find((cat) => {
        if (cat.type !== type) return false;
        const catName = cat.name.toLowerCase();
        return new RegExp(pattern.categoryPattern).test(catName);
      });

      if (matchingCategory) {
        const cacheKey = `${type}:${matchingCategory.name}`;
        categoryCache.set(cacheKey, matchingCategory.id);
        return matchingCategory.id;
      }
    }

    return undefined;
  }
}
