import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string, dateFrom?: string, dateTo?: string) {
    const dateFilter = this.buildDateFilter(dateFrom, dateTo);

    const [accounts, income, expense] = await Promise.all([
      // Общий баланс всех счетов
      this.prisma.account.aggregate({
        where: { userId, isArchived: false },
        _sum: { balance: true },
      }),
      // Доходы за период
      this.prisma.transaction.aggregate({
        where: { userId, type: 'INCOME', ...dateFilter },
        _sum: { amount: true },
      }),
      // Расходы за период
      this.prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE', ...dateFilter },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalBalance: Number(accounts._sum.balance || 0),
      income: Number(income._sum.amount || 0),
      expense: Number(expense._sum.amount || 0),
      savings:
        Number(income._sum.amount || 0) - Number(expense._sum.amount || 0),
    };
  }

  async getByCategory(userId: string, dateFrom?: string, dateTo?: string) {
    const dateFilter = this.buildDateFilter(dateFrom, dateTo);

    const expenses = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'EXPENSE', ...dateFilter },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    const incomes = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'INCOME', ...dateFilter },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    // Получаем информацию о категориях
    const categoryIds = [
      ...expenses.map((e) => e.categoryId),
      ...incomes.map((i) => i.categoryId),
    ];

    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true, type: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return {
      expenses: expenses.map((e) => ({
        category: categoryMap.get(e.categoryId),
        amount: Number(e._sum.amount || 0),
      })),
      incomes: incomes.map((i) => ({
        category: categoryMap.get(i.categoryId),
        amount: Number(i._sum.amount || 0),
      })),
    };
  }

  async getTrend(userId: string, months: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      select: {
        type: true,
        amount: true,
        date: true,
      },
      orderBy: { date: 'asc' },
    });

    // Группируем по месяцам
    const monthlyData = new Map<string, { income: number; expense: number }>();

    // Инициализируем все месяцы
    for (let i = 0; i < months; i++) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(key, { income: 0, expense: 0 });
    }

    // Заполняем данными
    for (const tx of transactions) {
      const date = new Date(tx.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const current = monthlyData.get(key);
      if (current) {
        if (tx.type === 'INCOME') {
          current.income += Number(tx.amount);
        } else {
          current.expense += Number(tx.amount);
        }
      }
    }

    // Преобразуем в массив
    const monthNames = [
      'Янв',
      'Фев',
      'Мар',
      'Апр',
      'Май',
      'Июн',
      'Июл',
      'Авг',
      'Сен',
      'Окт',
      'Ноя',
      'Дек',
    ];

    return Array.from(monthlyData.entries()).map(([key, data]) => {
      const [year, month] = key.split('-');
      return {
        month: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
        income: Math.round(data.income),
        expense: Math.round(data.expense),
        balance: Math.round(data.income - data.expense),
      };
    });
  }

  async getRecentTransactions(userId: string, limit: number = 5) {
    return this.prisma.transaction.findMany({
      where: { userId },
      include: {
        account: { select: { id: true, name: true, currency: true } },
        category: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  async getTopCategories(
    userId: string,
    limit: number = 5,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const dateFilter = this.buildDateFilter(dateFrom, dateTo);

    const result = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'EXPENSE', ...dateFilter },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    const categories = await this.prisma.category.findMany({
      where: { id: { in: result.map((r) => r.categoryId) } },
      select: { id: true, name: true, icon: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return result.map((r) => ({
      category: categoryMap.get(r.categoryId),
      amount: Number(r._sum.amount || 0),
    }));
  }

  private buildDateFilter(
    dateFrom?: string,
    dateTo?: string,
  ): Prisma.TransactionWhereInput {
    if (!dateFrom && !dateTo) return {};

    return {
      date: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      },
    };
  }
}
