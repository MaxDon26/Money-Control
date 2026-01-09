import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { Markup } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { TinkoffParser } from './parsers/tinkoff.parser';
import { SberParser } from './parsers/sber.parser';
import { TinkoffPdfParser } from './parsers/tinkoff-pdf.parser';
import { SberPdfParser } from './parsers/sber-pdf.parser';
import { CategoryMapper } from './parsers/category-mapper';
import { AiCategorizerService } from './ai/ai-categorizer.service';
import { randomBytes } from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const { PDFParse } = require('pdf-parse');

interface ParsedTransaction {
  date: Date;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  category?: string;
}

interface PendingImport {
  userId: string;
  transactions: ParsedTransaction[];
  bankName: string;
  createdAt: Date;
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Telegraf;
  private readonly logger = new Logger(TelegramService.name);
  // Store pending imports by telegramId (expires after 10 minutes)
  private pendingImports = new Map<string, PendingImport>();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private tinkoffParser: TinkoffParser,
    private sberParser: SberParser,
    private tinkoffPdfParser: TinkoffPdfParser,
    private sberPdfParser: SberPdfParser,
    private categoryMapper: CategoryMapper,
    private aiCategorizer: AiCategorizerService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (token) {
      this.bot = new Telegraf(token);
    }
  }

  async onModuleInit() {
    if (!this.bot) {
      this.logger.warn(
        'Telegram bot token not configured, skipping bot initialization',
      );
      return;
    }

    this.setupHandlers();

    // Use polling in development, webhook should be set up separately for production
    const webhookUrl = this.configService.get<string>('TELEGRAM_WEBHOOK_URL');
    if (webhookUrl) {
      await this.bot.telegram.setWebhook(webhookUrl);
      this.logger.log(`Telegram webhook set to ${webhookUrl}`);
    } else {
      void this.bot.launch();
      this.logger.log('Telegram bot started in polling mode');
    }
  }

  private setupHandlers() {
    // /start command - with optional link code
    this.bot.command('start', async (ctx) => {
      const args = ctx.message.text.split(' ');
      const linkCode = args[1];

      if (linkCode) {
        await this.handleLinkCode(ctx, linkCode);
      } else {
        await this.handleStart(ctx);
      }
    });

    // /status command - check link status
    this.bot.command('status', async (ctx) => {
      await this.handleStatus(ctx);
    });

    // /unlink command - remove link
    this.bot.command('unlink', async (ctx) => {
      await this.handleUnlink(ctx);
    });

    // /help command
    this.bot.command('help', async (ctx) => {
      await this.handleHelp(ctx);
    });

    // Handle document (CSV file)
    this.bot.on(message('document'), async (ctx) => {
      await this.handleDocument(ctx);
    });

    // Handle account selection callback
    this.bot.action(/^import_account_(.+)$/, async (ctx) => {
      await this.handleAccountSelection(ctx);
    });

    // Handle any other message
    this.bot.on('message', async (ctx) => {
      if (!ctx.from) return;
      const link = await this.prisma.telegramLink.findUnique({
        where: { telegramId: BigInt(ctx.from.id) },
      });

      if (!link) {
        await ctx.reply(
          '❌ Ваш Telegram не привязан к аккаунту Money Control.\n\n' +
            'Чтобы привязать:\n' +
            '1. Откройте Money Control → Настройки\n' +
            '2. Нажмите "Подключить Telegram"\n' +
            '3. Отправьте полученный код сюда',
        );
      } else {
        await ctx.reply(
          '📎 Отправьте файл выписки (PDF или CSV) из Тинькофф или Сбербанка.\n\n' +
            'Как получить выписку:\n' +
            '• Тинькофф: История → Заказать справку → PDF\n' +
            '• Сбер: История → Выписка → PDF',
        );
      }
    });
  }

  private async handleStart(ctx: Context) {
    if (!ctx.from) return;
    const telegramId = BigInt(ctx.from.id);
    const link = await this.prisma.telegramLink.findUnique({
      where: { telegramId },
      include: { user: true },
    });

    if (link) {
      await ctx.reply(
        `✅ Вы уже привязаны к аккаунту ${link.user.email}\n\n` +
          '📎 Отправьте файл выписки (PDF или CSV) из Тинькофф или Сбербанка для импорта транзакций.\n\n' +
          'Команды:\n' +
          '/status — проверить привязку\n' +
          '/unlink — отвязать аккаунт\n' +
          '/help — помощь',
      );
    } else {
      await ctx.reply(
        '👋 Привет! Я бот Money Control для импорта банковских выписок.\n\n' +
          'Чтобы начать:\n' +
          '1. Откройте Money Control → Настройки\n' +
          '2. Нажмите "Подключить Telegram"\n' +
          '3. Отправьте полученный код мне\n\n' +
          'Или отправьте код прямо сейчас, если он у вас есть.',
      );
    }
  }

  private async handleLinkCode(ctx: Context, code: string) {
    if (!ctx.from) return;
    const telegramId = BigInt(ctx.from.id);

    // Check if already linked
    const existingLink = await this.prisma.telegramLink.findUnique({
      where: { telegramId },
      include: { user: true },
    });

    if (existingLink) {
      await ctx.reply(
        `⚠️ Ваш Telegram уже привязан к аккаунту ${existingLink.user.email}\n\n` +
          'Используйте /unlink чтобы отвязать.',
      );
      return;
    }

    // Find and validate code
    const linkCode = await this.prisma.telegramLinkCode.findUnique({
      where: { code },
      include: { user: true },
    });

    if (!linkCode) {
      await ctx.reply(
        '❌ Неверный код привязки. Попробуйте сгенерировать новый в настройках.',
      );
      return;
    }

    if (linkCode.expiresAt < new Date()) {
      await this.prisma.telegramLinkCode.delete({ where: { id: linkCode.id } });
      await ctx.reply(
        '❌ Код привязки истёк. Сгенерируйте новый в настройках.',
      );
      return;
    }

    // Create link
    await this.prisma.telegramLink.create({
      data: {
        userId: linkCode.userId,
        telegramId,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
      },
    });

    // Delete used code
    await this.prisma.telegramLinkCode.delete({ where: { id: linkCode.id } });

    await ctx.reply(
      `✅ Аккаунт успешно привязан!\n\n` +
        `Email: ${linkCode.user.email}\n\n` +
        '📎 Теперь вы можете отправлять мне файлы выписок (PDF или CSV) из Тинькофф или Сбербанка.\n\n' +
        'Как получить выписку:\n' +
        '• Тинькофф: История → ⋯ → Выгрузить → CSV\n' +
        '• Сбер: История → Выписка → Сохранить как CSV',
    );
  }

  private async handleStatus(ctx: Context) {
    if (!ctx.from) return;
    const telegramId = BigInt(ctx.from.id);
    const link = await this.prisma.telegramLink.findUnique({
      where: { telegramId },
      include: { user: true },
    });

    if (link) {
      await ctx.reply(
        `✅ Telegram привязан\n\n` +
          `Email: ${link.user.email}\n` +
          `Привязан: ${link.createdAt.toLocaleDateString('ru-RU')}`,
      );
    } else {
      await ctx.reply(
        '❌ Telegram не привязан к аккаунту Money Control.\n\n' +
          'Для привязки откройте Настройки в приложении.',
      );
    }
  }

  private async handleUnlink(ctx: Context) {
    if (!ctx.from) return;
    const telegramId = BigInt(ctx.from.id);
    const link = await this.prisma.telegramLink.findUnique({
      where: { telegramId },
    });

    if (!link) {
      await ctx.reply('❌ Ваш Telegram не привязан к аккаунту.');
      return;
    }

    await this.prisma.telegramLink.delete({ where: { id: link.id } });
    await ctx.reply(
      '✅ Аккаунт отвязан. Для повторной привязки используйте код из настроек.',
    );
  }

  private async handleHelp(ctx: Context) {
    await ctx.reply(
      '📚 Money Control Bot — импорт банковских выписок\n\n' +
        'Команды:\n' +
        '/start — начало работы\n' +
        '/status — проверить привязку\n' +
        '/unlink — отвязать аккаунт\n' +
        '/help — эта справка\n\n' +
        'Как импортировать транзакции:\n' +
        '1. Скачайте выписку (PDF) из приложения банка\n' +
        '2. Отправьте файл мне\n' +
        '3. Готово!\n\n' +
        'Поддерживаемые банки:\n' +
        '• Тинькофф\n' +
        '• Сбербанк',
    );
  }

  private async handleDocument(ctx: Context) {
    if (!ctx.from) return;
    const telegramId = BigInt(ctx.from.id);

    // Check if linked
    const link = await this.prisma.telegramLink.findUnique({
      where: { telegramId },
      include: { user: true },
    });

    if (!link) {
      await ctx.reply(
        '❌ Сначала привяжите Telegram к аккаунту Money Control.\n' +
          'Откройте Настройки в приложении и нажмите "Подключить Telegram".',
      );
      return;
    }

    const message = ctx.message as {
      document?: { file_id: string; file_name?: string };
    };
    const document = message.document;
    if (!document) {
      await ctx.reply('❌ Пожалуйста, отправьте файл.');
      return;
    }
    const fileName = document.file_name?.toLowerCase() || '';
    const isCsv = fileName.endsWith('.csv');
    const isPdf = fileName.endsWith('.pdf');

    if (!isCsv && !isPdf) {
      await ctx.reply(
        '❌ Пожалуйста, отправьте файл выписки в формате CSV или PDF.',
      );
      return;
    }

    await ctx.reply('⏳ Обрабатываю файл...');

    try {
      // Download file
      const fileLink = await ctx.telegram.getFileLink(document.file_id);
      const response = await fetch(fileLink.href);

      let transactions: ParsedTransaction[];
      let bankName: string;

      if (isCsv) {
        // Handle CSV
        const csvContent = await response.text();

        if (this.tinkoffParser.canParse(csvContent)) {
          transactions = this.tinkoffParser.parse(csvContent);
          bankName = 'Тинькофф';
        } else if (this.sberParser.canParse(csvContent)) {
          transactions = this.sberParser.parse(csvContent);
          bankName = 'Сбербанк';
        } else {
          await ctx.reply(
            '❌ Не удалось определить формат CSV файла.\n\n' +
              'Поддерживаются выписки:\n' +
              '• Тинькофф\n' +
              '• Сбербанк',
          );
          return;
        }
      } else {
        // Handle PDF
        const pdfBuffer = Buffer.from(await response.arrayBuffer());
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const pdfParser = new PDFParse({ data: pdfBuffer });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        const pdfResult = await pdfParser.getText();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await pdfParser.destroy();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const pdfText: string = pdfResult.text as string;

        if (this.tinkoffPdfParser.canParse(pdfText)) {
          transactions = await this.tinkoffPdfParser.parse(pdfBuffer);
          bankName = 'Тинькофф';
        } else if (this.sberPdfParser.canParse(pdfText)) {
          transactions = await this.sberPdfParser.parse(pdfBuffer);
          bankName = 'Сбербанк';
        } else {
          await ctx.reply(
            '❌ Не удалось определить банк по PDF файлу.\n\n' +
              'Поддерживаются выписки:\n' +
              '• Тинькофф\n' +
              '• Сбербанк',
          );
          return;
        }
      }

      if (transactions.length === 0) {
        await ctx.reply('⚠️ В файле не найдено транзакций для импорта.');
        return;
      }

      // Get all user's accounts
      const accounts = await this.prisma.account.findMany({
        where: { userId: link.userId, isArchived: false },
        orderBy: { createdAt: 'asc' },
      });

      if (accounts.length === 0) {
        await ctx.reply(
          '❌ У вас нет счетов в Money Control.\n' +
            'Создайте хотя бы один счёт в приложении.',
        );
        return;
      }

      // Try to auto-match bank to account by name
      const bankKeywords =
        bankName === 'Сбербанк'
          ? ['сбер', 'sber', 'сбербанк']
          : ['тинькофф', 'tinkoff', 'т-банк', 't-bank'];

      const matchedAccount = accounts.find((acc) => {
        const lowerName = acc.name.toLowerCase();
        return bankKeywords.some((kw) => lowerName.includes(kw));
      });

      // If only one account or auto-matched, proceed directly
      if (accounts.length === 1 || matchedAccount) {
        const selectedAccount = matchedAccount || accounts[0];
        await this.importTransactions(
          ctx,
          link.userId,
          selectedAccount.id,
          transactions,
          bankName,
        );
        return;
      }

      // Multiple accounts and no auto-match - show selection
      // Store pending import
      const telegramIdStr = ctx.from.id.toString();
      this.pendingImports.set(telegramIdStr, {
        userId: link.userId,
        transactions,
        bankName,
        createdAt: new Date(),
      });

      // Create account selection buttons
      const buttons = accounts.map((acc) =>
        Markup.button.callback(`${acc.name}`, `import_account_${acc.id}`),
      );

      // Arrange in rows of 2
      const keyboard: ReturnType<typeof Markup.button.callback>[][] = [];
      for (let i = 0; i < buttons.length; i += 2) {
        keyboard.push(buttons.slice(i, i + 2));
      }

      await ctx.reply(
        `📊 Найдено ${transactions.length} транзакций из ${bankName}.\n\n` +
          '💳 Выберите счёт для импорта:',
        Markup.inlineKeyboard(keyboard),
      );
    } catch (error) {
      this.logger.error('Error processing file', error);
      await ctx.reply(
        '❌ Ошибка при обработке файла.\n' +
          'Убедитесь, что это корректный файл выписки (PDF или CSV).',
      );
    }
  }

  private async handleAccountSelection(ctx: Context) {
    if (!ctx.from) return;
    const telegramIdStr = ctx.from.id.toString();

    // Get pending import
    const pending = this.pendingImports.get(telegramIdStr);
    if (!pending) {
      await ctx.answerCbQuery(
        '⚠️ Данные импорта устарели. Отправьте файл заново.',
      );
      return;
    }

    // Check if expired (10 minutes)
    if (Date.now() - pending.createdAt.getTime() > 10 * 60 * 1000) {
      this.pendingImports.delete(telegramIdStr);
      await ctx.answerCbQuery(
        '⚠️ Данные импорта устарели. Отправьте файл заново.',
      );
      return;
    }

    // Get selected account ID from callback data
    const callbackQuery = ctx.callbackQuery as { data?: string };
    const match = callbackQuery.data?.match(/^import_account_(.+)$/);
    if (!match) {
      await ctx.answerCbQuery('❌ Ошибка выбора счёта.');
      return;
    }

    const accountId = match[1];

    // Verify account belongs to user
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId: pending.userId },
    });

    if (!account) {
      await ctx.answerCbQuery('❌ Счёт не найден.');
      return;
    }

    // Clear pending import
    this.pendingImports.delete(telegramIdStr);

    // Answer callback to remove loading state
    await ctx.answerCbQuery();

    // Update message to show processing
    await ctx.editMessageText(`⏳ Импортирую в "${account.name}"...`);

    // Perform import
    await this.importTransactions(
      ctx,
      pending.userId,
      accountId,
      pending.transactions,
      pending.bankName,
    );
  }

  private async importTransactions(
    ctx: Context,
    userId: string,
    accountId: string,
    transactions: ParsedTransaction[],
    bankName: string,
  ) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        await ctx.reply('❌ Счёт не найден.');
        return;
      }

      // Step 1: Categorize all transactions using keyword matching
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

      // Step 2: Collect low-confidence transactions for AI categorization
      const lowConfidenceTransactions = categorizedTransactions.filter(
        (tx) => tx.confidence === 'low',
      );

      let aiCategorized = 0;

      // Step 3: Use AI for low-confidence transactions (if available)
      if (lowConfidenceTransactions.length > 0 && this.aiCategorizer.isAvailable()) {
        try {
          await ctx.reply(
            `🤖 Распознаю ${lowConfidenceTransactions.length} транзакций через AI...`,
          );

          const aiInput = lowConfidenceTransactions.map((tx) => ({
            type: tx.type,
            description: tx.description,
          }));

          const aiResults = await this.aiCategorizer.categorizeTransactions(aiInput);

          // Update categories from AI results
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
          // Continue with default categories
        }
      }

      // Cache for categories to avoid repeated DB queries
      const categoryCache = new Map<string, string>(); // "type:name" -> categoryId

      // Import transactions
      let imported = 0;
      let skipped = 0;
      let categoriesCreated = 0;

      for (const tx of categorizedTransactions) {
        // Check for duplicates (same date, amount, description)
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

        // Get or create category
        const categoryName = tx.category;
        const cacheKey = `${tx.type}:${categoryName}`;
        let categoryId = categoryCache.get(cacheKey);

        if (!categoryId) {
          // Try to find existing category for this user
          let category = await this.prisma.category.findFirst({
            where: {
              userId,
              name: categoryName,
              type: tx.type,
            },
          });

          // If not found, create new user category
          if (!category) {
            category = await this.prisma.category.create({
              data: {
                userId,
                name: categoryName,
                type: tx.type,
                isSystem: false,
              },
            });
            categoriesCreated++;
          }

          categoryId = category.id;
          categoryCache.set(cacheKey, categoryId);
        }

        await this.prisma.transaction.create({
          data: {
            userId,
            accountId: account.id,
            categoryId,
            type: tx.type,
            amount: Math.abs(tx.amount),
            description: tx.description,
            date: tx.date,
          },
        });

        // Update account balance
        const balanceChange =
          tx.type === 'INCOME' ? Math.abs(tx.amount) : -Math.abs(tx.amount);
        await this.prisma.account.update({
          where: { id: account.id },
          data: { balance: { increment: balanceChange } },
        });

        imported++;
      }

      // Build result message
      let message =
        `✅ Импорт из ${bankName} завершён!\n\n` +
        `📊 Результат:\n` +
        `• Импортировано: ${imported}\n` +
        `• Пропущено (дубли): ${skipped}\n` +
        `• Счёт: ${account.name}`;

      if (categoriesCreated > 0) {
        message += `\n• Создано категорий: ${categoriesCreated}`;
      }

      // AI stats
      const keywordCategorized = transactions.length - lowConfidenceTransactions.length;
      if (this.aiCategorizer.isAvailable()) {
        message += `\n\n🤖 Категоризация:\n`;
        message += `• По ключевым словам: ${keywordCategorized}\n`;
        message += `• Через AI: ${aiCategorized}`;
        if (lowConfidenceTransactions.length > aiCategorized) {
          message += `\n• По умолчанию: ${lowConfidenceTransactions.length - aiCategorized}`;
        }
      }

      await ctx.reply(message);
    } catch (error) {
      this.logger.error('Error importing transactions', error);
      await ctx.reply(
        '❌ Ошибка при импорте транзакций.\n' +
          'Попробуйте ещё раз или обратитесь в поддержку.',
      );
    }
  }

  // API methods for controller
  async generateLinkCode(userId: string): Promise<string> {
    // Delete old codes for this user
    await this.prisma.telegramLinkCode.deleteMany({
      where: { userId },
    });

    // Generate new code (6 characters, alphanumeric)
    const code = randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.telegramLinkCode.create({
      data: {
        userId,
        code,
        expiresAt,
      },
    });

    return code;
  }

  async getLinkStatus(userId: string) {
    const link = await this.prisma.telegramLink.findUnique({
      where: { userId },
    });

    return link
      ? {
          linked: true,
          username: link.username,
          firstName: link.firstName,
          linkedAt: link.createdAt,
        }
      : {
          linked: false,
        };
  }

  async unlinkTelegram(userId: string): Promise<boolean> {
    const link = await this.prisma.telegramLink.findUnique({
      where: { userId },
    });

    if (!link) return false;

    await this.prisma.telegramLink.delete({ where: { id: link.id } });
    return true;
  }

  getBotUsername(): string | null {
    return this.bot?.botInfo?.username || null;
  }
}
