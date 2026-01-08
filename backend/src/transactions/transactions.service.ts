import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  FilterTransactionsDto,
  TransactionType,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTransactionDto) {
    // Проверяем, что счёт принадлежит пользователю
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
    });

    if (!account) {
      throw new BadRequestException('Счёт не найден');
    }

    // Проверяем, что расход не превышает баланс счёта
    if (dto.type === TransactionType.EXPENSE) {
      const currentBalance = Number(account.balance);
      if (dto.amount > currentBalance) {
        throw new BadRequestException(
          `Недостаточно средств на счёте. Доступно: ${currentBalance.toFixed(2)}`,
        );
      }
    }

    // Проверяем категорию (системная или пользовательская)
    const category = await this.prisma.category.findFirst({
      where: {
        id: dto.categoryId,
        OR: [{ userId }, { isSystem: true }],
      },
    });

    if (!category) {
      throw new BadRequestException('Категория не найдена');
    }

    // Создаём транзакцию и обновляем баланс атомарно
    const balanceChange =
      dto.type === TransactionType.INCOME ? dto.amount : -dto.amount;

    const [transaction] = await this.prisma.$transaction([
      this.prisma.transaction.create({
        data: {
          userId,
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          type: dto.type,
          amount: dto.amount,
          description: dto.description,
          date: new Date(dto.date),
          ...(dto.tagIds?.length && {
            tags: {
              create: dto.tagIds.map((tagId) => ({ tagId })),
            },
          }),
        },
        include: {
          account: true,
          category: true,
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.account.update({
        where: { id: dto.accountId },
        data: {
          balance: { increment: balanceChange },
        },
      }),
    ]);

    return {
      ...transaction,
      tags: transaction.tags.map((t) => t.tag),
    };
  }

  async findAll(userId: string, filters: FilterTransactionsDto) {
    const {
      type,
      accountId,
      categoryId,
      dateFrom,
      dateTo,
      search,
      page,
      limit,
    } = filters;

    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(type && { type }),
      ...(accountId && { accountId }),
      ...(categoryId && { categoryId }),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
      ...(search && {
        description: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: {
          account: { select: { id: true, name: true, currency: true } },
          category: {
            select: { id: true, name: true, icon: true, type: true },
          },
          tags: { include: { tag: true } },
        },
        orderBy: { date: 'desc' },
        skip: ((page || 1) - 1) * (limit || 20),
        take: limit || 20,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions.map((t) => ({
        ...t,
        tags: t.tags.map((tt) => tt.tag),
      })),
      meta: {
        total,
        page: page || 1,
        limit: limit || 20,
        totalPages: Math.ceil(total / (limit || 20)),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: {
        account: true,
        category: true,
        tags: { include: { tag: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Транзакция не найдена');
    }

    return {
      ...transaction,
      tags: transaction.tags.map((t) => t.tag),
    };
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.findOne(userId, id);

    // Если меняется счёт, проверяем права
    if (dto.accountId && dto.accountId !== existing.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.accountId, userId },
      });
      if (!account) {
        throw new BadRequestException('Счёт не найден');
      }
    }

    // Если меняется категория, проверяем права
    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
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

    // Проверяем, что после изменения баланс счёта не станет отрицательным
    const targetAccountId = dto.accountId || existing.accountId;
    const targetAccount = await this.prisma.account.findUnique({
      where: { id: targetAccountId },
    });

    if (targetAccount) {
      const newType = dto.type || existing.type;
      const newAmount = dto.amount ?? Number(existing.amount);

      // Вычисляем как изменится баланс
      let balanceAfterUpdate = Number(targetAccount.balance);

      // Если счёт меняется, учитываем это
      if (dto.accountId && dto.accountId !== existing.accountId) {
        // На новом счёте просто применяем новую транзакцию
        if (newType === TransactionType.EXPENSE) {
          balanceAfterUpdate -= newAmount;
        }
      } else {
        // На том же счёте - учитываем разницу
        const oldEffect =
          existing.type === 'EXPENSE'
            ? -Number(existing.amount)
            : Number(existing.amount);
        const newEffect =
          newType === TransactionType.EXPENSE ? -newAmount : newAmount;

        // Откатываем старый эффект и применяем новый
        balanceAfterUpdate = balanceAfterUpdate - oldEffect + newEffect;
      }

      if (balanceAfterUpdate < 0) {
        throw new BadRequestException(
          `Недостаточно средств на счёте. После изменения баланс станет отрицательным.`,
        );
      }
    }

    // Вычисляем изменение баланса
    const oldBalanceEffect =
      existing.type === 'INCOME'
        ? -Number(existing.amount)
        : Number(existing.amount);

    const newType = dto.type || existing.type;
    const newAmount = dto.amount ?? Number(existing.amount);
    const newBalanceEffect =
      newType === TransactionType.INCOME ? newAmount : -newAmount;

    const accountChanged =
      dto.accountId && dto.accountId !== existing.accountId;

    // Обновляем транзакцию и балансы атомарно
    const operations: Prisma.PrismaPromise<unknown>[] = [];

    // Если переданы теги, удаляем старые связи
    if (dto.tagIds !== undefined) {
      operations.push(
        this.prisma.tagsOnTransactions.deleteMany({
          where: { transactionId: id },
        }),
      );
    }

    operations.push(
      this.prisma.transaction.update({
        where: { id },
        data: {
          ...(dto.type && { type: dto.type }),
          ...(dto.amount !== undefined && { amount: dto.amount }),
          ...(dto.accountId && { accountId: dto.accountId }),
          ...(dto.categoryId && { categoryId: dto.categoryId }),
          ...(dto.date && { date: new Date(dto.date) }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.tagIds !== undefined && {
            tags: {
              create: dto.tagIds.map((tagId) => ({ tagId })),
            },
          }),
        },
        include: {
          account: true,
          category: true,
          tags: { include: { tag: true } },
        },
      }),
    );

    if (accountChanged) {
      // Откатываем со старого счёта
      operations.push(
        this.prisma.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: oldBalanceEffect } },
        }),
      );
      // Применяем к новому счёту
      operations.push(
        this.prisma.account.update({
          where: { id: dto.accountId },
          data: { balance: { increment: newBalanceEffect } },
        }),
      );
    } else if (dto.amount !== undefined || dto.type) {
      // Корректируем баланс на том же счёте
      const balanceDiff = newBalanceEffect - -oldBalanceEffect;
      operations.push(
        this.prisma.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: balanceDiff } },
        }),
      );
    }

    const results = await this.prisma.$transaction(operations);
    // Находим результат обновления транзакции (после deleteMany если был)
    const transaction = results.find(
      (r) => r && typeof r === 'object' && 'accountId' in r,
    ) as {
      tags: { tag: unknown }[];
      [key: string]: unknown;
    };

    return {
      ...transaction,
      tags: transaction.tags.map((t) => t.tag),
    };
  }

  async delete(userId: string, id: string) {
    const existing = await this.findOne(userId, id);

    // Откатываем баланс
    const balanceRollback =
      existing.type === 'INCOME'
        ? -Number(existing.amount)
        : Number(existing.amount);

    await this.prisma.$transaction([
      this.prisma.transaction.delete({ where: { id } }),
      this.prisma.account.update({
        where: { id: existing.accountId },
        data: { balance: { increment: balanceRollback } },
      }),
    ]);

    return { success: true };
  }

  async getStats(userId: string, dateFrom?: string, dateTo?: string) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const [income, expense] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
    ]);

    return {
      income: Number(income._sum.amount || 0),
      expense: Number(expense._sum.amount || 0),
      balance:
        Number(income._sum.amount || 0) - Number(expense._sum.amount || 0),
    };
  }
}
