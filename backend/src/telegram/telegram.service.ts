import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { PrismaService } from '../prisma/prisma.service';
import { TinkoffParser } from './parsers/tinkoff.parser';
import { SberParser } from './parsers/sber.parser';
import { TinkoffPdfParser } from './parsers/tinkoff-pdf.parser';
import { SberPdfParser } from './parsers/sber-pdf.parser';
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

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Telegraf;
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private tinkoffParser: TinkoffParser,
    private sberParser: SberParser,
    private tinkoffPdfParser: TinkoffPdfParser,
    private sberPdfParser: SberPdfParser,
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

      // Get user's default account or first account
      const account = await this.prisma.account.findFirst({
        where: { userId: link.userId, isArchived: false },
        orderBy: { createdAt: 'asc' },
      });

      if (!account) {
        await ctx.reply(
          '❌ У вас нет счетов в Money Control.\n' +
            'Создайте хотя бы один счёт в приложении.',
        );
        return;
      }

      // Get default category for expenses and income
      const expenseCategory = await this.prisma.category.findFirst({
        where: {
          OR: [
            { userId: link.userId, type: 'EXPENSE' },
            { isSystem: true, type: 'EXPENSE' },
          ],
        },
      });

      const incomeCategory = await this.prisma.category.findFirst({
        where: {
          OR: [
            { userId: link.userId, type: 'INCOME' },
            { isSystem: true, type: 'INCOME' },
          ],
        },
      });

      if (!expenseCategory || !incomeCategory) {
        await ctx.reply('❌ Не найдены категории. Обратитесь в поддержку.');
        return;
      }

      // Import transactions
      let imported = 0;
      let skipped = 0;

      for (const tx of transactions) {
        // Check for duplicates (same date, amount, description)
        const existing = await this.prisma.transaction.findFirst({
          where: {
            userId: link.userId,
            date: tx.date,
            amount: Math.abs(tx.amount),
            description: tx.description,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await this.prisma.transaction.create({
          data: {
            userId: link.userId,
            accountId: account.id,
            categoryId:
              tx.type === 'EXPENSE' ? expenseCategory.id : incomeCategory.id,
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

      const message =
        `✅ Импорт из ${bankName} завершён!\n\n` +
        `📊 Результат:\n` +
        `• Импортировано: ${imported}\n` +
        `• Пропущено (дубли): ${skipped}\n` +
        `• Счёт: ${account.name}\n\n` +
        `💡 Откройте Money Control для просмотра и редактирования категорий.`;

      await ctx.reply(message);
    } catch (error) {
      this.logger.error('Error processing file', error);
      await ctx.reply(
        '❌ Ошибка при обработке файла.\n' +
          'Убедитесь, что это корректный файл выписки (PDF или CSV).',
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
