import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateBudgetDto, UpdateBudgetDto } from './dto';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBudgetDto) {
    // Если это общий бюджет
    if (dto.isTotal) {
      // Проверяем, что общий бюджет ещё не создан
      const existingTotal = await this.prisma.budget.findFirst({
        where: {
          userId,
          month: dto.month,
          year: dto.year,
          isTotal: true,
        },
      });

      if (existingTotal) {
        throw new ConflictException(
          'Общий бюджет на этот месяц уже существует',
        );
      }

      return this.prisma.budget.create({
        data: {
          userId,
          amount: dto.amount,
          month: dto.month,
          year: dto.year,
          isTotal: true,
          categoryId: null,
        },
      });
    }

    // Проверяем категорию для обычного бюджета
    const category = await this.prisma.category.findFirst({
      where: {
        id: dto.categoryId,
        type: 'EXPENSE', // Бюджеты только для расходов
        userId,
      },
    });

    if (!category) {
      throw new BadRequestException('Категория расходов не найдена');
    }

    // Проверяем уникальность
    const existing = await this.prisma.budget.findFirst({
      where: {
        userId,
        categoryId: dto.categoryId,
        month: dto.month,
        year: dto.year,
      },
    });

    if (existing) {
      throw new ConflictException('Бюджет для этой категории уже существует');
    }

    return this.prisma.budget.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        month: dto.month,
        year: dto.year,
        isTotal: false,
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });
  }

  async findAll(userId: string, month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        month: targetMonth,
        year: targetYear,
        isTotal: false, // Исключаем общий бюджет
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { category: { name: 'asc' } },
    });

    // Получаем расходы по каждой категории за этот месяц
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const categoryIds = budgets
      .map((b) => b.categoryId)
      .filter((id): id is string => id !== null);

    const expenses = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: startDate, lte: endDate },
        categoryId: { in: categoryIds },
      },
      _sum: { amount: true },
    });

    const expenseMap = new Map(
      expenses.map((e) => [e.categoryId, Number(e._sum?.amount || 0)]),
    );

    return budgets.map((budget) => {
      const spent = budget.categoryId
        ? expenseMap.get(budget.categoryId) || 0
        : 0;
      const remaining = Number(budget.amount) - spent;
      const percentage = (spent / Number(budget.amount)) * 100;

      return {
        ...budget,
        amount: Number(budget.amount),
        spent,
        remaining,
        percentage: Math.round(percentage * 10) / 10,
        status: this.getStatus(percentage),
      };
    });
  }

  async findOne(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });

    if (!budget) {
      throw new NotFoundException('Бюджет не найден');
    }

    return budget;
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    await this.findOne(userId, id);

    return this.prisma.budget.update({
      where: { id },
      data: { amount: dto.amount },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });
  }

  async delete(userId: string, id: string) {
    await this.findOne(userId, id);

    await this.prisma.budget.delete({ where: { id } });

    return { success: true };
  }

  async getProgress(userId: string, month?: number, year?: number) {
    const budgets = await this.findAll(userId, month, year);
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    // Получаем общий бюджет отдельно
    const totalBudgetRecord = await this.prisma.budget.findFirst({
      where: {
        userId,
        month: targetMonth,
        year: targetYear,
        isTotal: true,
      },
    });

    // Считаем все расходы за месяц для общего бюджета
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const totalExpensesResult = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const totalExpenses = Number(totalExpensesResult._sum.amount || 0);
    const categoryBudgetsSum = budgets.reduce((sum, b) => sum + b.amount, 0);
    const categorySpentSum = budgets.reduce((sum, b) => sum + b.spent, 0);

    // Формируем данные общего бюджета
    let totalBudgetInfo: {
      id: string;
      amount: number;
      spent: number;
      remaining: number;
      percentage: number;
      status: 'ok' | 'warning' | 'danger';
      month: number;
      year: number;
    } | null = null;
    if (totalBudgetRecord) {
      const totalAmount = Number(totalBudgetRecord.amount);
      const percentage = (totalExpenses / totalAmount) * 100;
      totalBudgetInfo = {
        id: totalBudgetRecord.id,
        amount: totalAmount,
        spent: totalExpenses,
        remaining: totalAmount - totalExpenses,
        percentage: Math.round(percentage * 10) / 10,
        status: this.getStatus(percentage),
        month: totalBudgetRecord.month,
        year: totalBudgetRecord.year,
      };
    }

    return {
      budgets,
      totalBudget: totalBudgetInfo,
      summary: {
        totalBudget: categoryBudgetsSum,
        totalSpent: categorySpentSum,
        totalRemaining: categoryBudgetsSum - categorySpentSum,
        overallPercentage:
          categoryBudgetsSum > 0
            ? Math.round((categorySpentSum / categoryBudgetsSum) * 1000) / 10
            : 0,
        // Дополнительно: общие расходы за месяц
        monthlyExpenses: totalExpenses,
      },
    };
  }

  async copyFromPreviousMonth(userId: string, month: number, year: number) {
    // Вычисляем предыдущий месяц
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const previousBudgets = await this.prisma.budget.findMany({
      where: { userId, month: prevMonth, year: prevYear },
    });

    if (previousBudgets.length === 0) {
      throw new NotFoundException('Нет бюджетов за предыдущий месяц');
    }

    // Проверяем, какие бюджеты уже существуют
    const existingBudgets = await this.prisma.budget.findMany({
      where: { userId, month, year },
      select: { categoryId: true },
    });

    const existingCategoryIds = new Set(
      existingBudgets.map((b) => b.categoryId),
    );

    const budgetsToCreate = previousBudgets
      .filter((b) => !existingCategoryIds.has(b.categoryId))
      .map((b) => ({
        userId,
        categoryId: b.categoryId,
        amount: b.amount,
        month,
        year,
      }));

    if (budgetsToCreate.length === 0) {
      return { created: 0, message: 'Все бюджеты уже существуют' };
    }

    await this.prisma.budget.createMany({ data: budgetsToCreate });

    return { created: budgetsToCreate.length };
  }

  private getStatus(percentage: number): 'ok' | 'warning' | 'danger' {
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return 'ok';
  }
}
