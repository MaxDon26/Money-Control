import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionType, Frequency as PrismaFrequency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma';
import { CreateRecurringDto, UpdateRecurringDto, Frequency } from './dto';

interface RecurringPaymentRecord {
  id: string;
  userId: string;
  name: string;
  amount: Decimal;
  categoryId: string;
  accountId: string;
  type: TransactionType;
  frequency: PrismaFrequency;
  startDate: Date;
  nextDate: Date;
  endDate: Date | null;
  isActive: boolean;
}

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(private prisma: PrismaService) {}

  // Запускается каждый день в 00:05
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processDuePayments() {
    this.logger.log(
      'Запуск автоматической обработки повторяющихся платежей...',
    );

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Получаем все активные платежи, у которых nextDate <= сегодня
    const duePayments = await this.prisma.recurringPayment.findMany({
      where: {
        isActive: true,
        nextDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
    });

    this.logger.log(`Найдено ${duePayments.length} платежей для обработки`);

    for (const payment of duePayments) {
      try {
        await this.processPaymentInternal(payment);
        this.logger.log(`Обработан платёж: ${payment.name}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Ошибка обработки платежа ${payment.name}: ${errorMessage}`,
        );
      }
    }

    this.logger.log('Обработка повторяющихся платежей завершена');
  }

  private async processPaymentInternal(payment: RecurringPaymentRecord) {
    const balanceChange =
      payment.type === 'INCOME'
        ? Number(payment.amount)
        : -Number(payment.amount);

    await this.prisma.$transaction([
      this.prisma.transaction.create({
        data: {
          userId: payment.userId,
          accountId: payment.accountId,
          categoryId: payment.categoryId,
          type: payment.type,
          amount: payment.amount,
          description: `${payment.name} (авто)`,
          date: new Date(),
        },
      }),
      this.prisma.account.update({
        where: { id: payment.accountId },
        data: { balance: { increment: balanceChange } },
      }),
      this.prisma.recurringPayment.update({
        where: { id: payment.id },
        data: {
          nextDate: this.calculateNextDate(
            payment.nextDate,
            payment.frequency as Frequency,
          ),
        },
      }),
    ]);
  }

  async create(userId: string, dto: CreateRecurringDto) {
    // Проверяем счёт
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
    });
    if (!account) {
      throw new BadRequestException('Счёт не найден');
    }

    // Проверяем категорию
    const category = await this.prisma.category.findFirst({
      where: {
        id: dto.categoryId,
        OR: [{ userId }, { isSystem: true }],
      },
    });
    if (!category) {
      throw new BadRequestException('Категория не найдена');
    }

    const startDate = new Date(dto.startDate);
    const nextDate = this.calculateNextDate(startDate, dto.frequency);

    return this.prisma.recurringPayment.create({
      data: {
        userId,
        name: dto.name,
        amount: dto.amount,
        categoryId: dto.categoryId,
        accountId: dto.accountId,
        type: dto.type,
        frequency: dto.frequency,
        startDate,
        nextDate,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isActive: true,
      },
    });
  }

  async findAll(userId: string) {
    const payments = await this.prisma.recurringPayment.findMany({
      where: { userId },
      orderBy: { nextDate: 'asc' },
    });

    // Получаем информацию о счетах и категориях
    const accountIds = [...new Set(payments.map((p) => p.accountId))];
    const categoryIds = [...new Set(payments.map((p) => p.categoryId))];

    const [accounts, categories] = await Promise.all([
      this.prisma.account.findMany({
        where: { id: { in: accountIds } },
        select: { id: true, name: true },
      }),
      this.prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, icon: true },
      }),
    ]);

    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      account: accountMap.get(p.accountId),
      category: categoryMap.get(p.categoryId),
    }));
  }

  async findOne(userId: string, id: string) {
    const payment = await this.prisma.recurringPayment.findFirst({
      where: { id, userId },
    });

    if (!payment) {
      throw new NotFoundException('Повторяющийся платёж не найден');
    }

    return payment;
  }

  async update(userId: string, id: string, dto: UpdateRecurringDto) {
    await this.findOne(userId, id);

    // Проверяем новый счёт если указан
    if (dto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.accountId, userId },
      });
      if (!account) {
        throw new BadRequestException('Счёт не найден');
      }
    }

    // Проверяем новую категорию если указана
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          OR: [{ userId }, { isSystem: true }],
        },
      });
      if (!category) {
        throw new BadRequestException('Категория не найдена');
      }
    }

    return this.prisma.recurringPayment.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.accountId && { accountId: dto.accountId }),
        ...(dto.type && { type: dto.type }),
        ...(dto.frequency && { frequency: dto.frequency }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async delete(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.recurringPayment.delete({ where: { id } });
    return { success: true };
  }

  async toggle(userId: string, id: string) {
    const payment = await this.findOne(userId, id);

    return this.prisma.recurringPayment.update({
      where: { id },
      data: { isActive: !payment.isActive },
    });
  }

  async skip(userId: string, id: string) {
    const payment = await this.findOne(userId, id);

    if (!payment.isActive) {
      throw new BadRequestException('Платёж неактивен');
    }

    // Пропускаем текущий платёж, переносим nextDate на следующую дату
    const nextDate = this.calculateNextDate(
      payment.nextDate,
      payment.frequency as Frequency,
    );

    return this.prisma.recurringPayment.update({
      where: { id },
      data: { nextDate },
    });
  }

  async processPayment(userId: string, id: string) {
    const payment = await this.findOne(userId, id);

    if (!payment.isActive) {
      throw new BadRequestException('Платёж неактивен');
    }

    // Создаём транзакцию
    const balanceChange =
      payment.type === 'INCOME'
        ? Number(payment.amount)
        : -Number(payment.amount);

    const [transaction] = await this.prisma.$transaction([
      this.prisma.transaction.create({
        data: {
          userId,
          accountId: payment.accountId,
          categoryId: payment.categoryId,
          type: payment.type,
          amount: payment.amount,
          description: payment.name,
          date: new Date(),
        },
      }),
      this.prisma.account.update({
        where: { id: payment.accountId },
        data: { balance: { increment: balanceChange } },
      }),
      this.prisma.recurringPayment.update({
        where: { id },
        data: {
          nextDate: this.calculateNextDate(
            payment.nextDate,
            payment.frequency as Frequency,
          ),
        },
      }),
    ]);

    return transaction;
  }

  async getUpcoming(userId: string, days: number = 7) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const payments = await this.prisma.recurringPayment.findMany({
      where: {
        userId,
        isActive: true,
        nextDate: { lte: endDate },
      },
      orderBy: { nextDate: 'asc' },
    });

    const categoryIds = [...new Set(payments.map((p) => p.categoryId))];
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      category: categoryMap.get(p.categoryId),
      daysUntil: Math.ceil(
        (p.nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    }));
  }

  private calculateNextDate(fromDate: Date, frequency: Frequency): Date {
    const next = new Date(fromDate);

    switch (frequency) {
      case Frequency.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case Frequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case Frequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case Frequency.YEARLY:
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }
}
