import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { CategoryType } from '@prisma/client';

// Базовые категории расходов
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Супермаркеты', icon: '🛒' },
  { name: 'Рестораны и кафе', icon: '🍽️' },
  { name: 'Транспорт и авто', icon: '🚗' },
  { name: 'Здоровье и аптеки', icon: '💊' },
  { name: 'Связь и интернет', icon: '📱' },
  { name: 'Подписки и сервисы', icon: '🌐' },
  { name: 'Одежда и обувь', icon: '👕' },
  { name: 'Развлечения', icon: '🎮' },
  { name: 'Жильё и ЖКХ', icon: '🏠' },
  { name: 'Техника', icon: '🖥️' },
  { name: 'Образование', icon: '📚' },
  { name: 'Кредиты и займы', icon: '🏦' },
  { name: 'Переводы исходящие', icon: '💸' },
  { name: 'Снятие наличных', icon: '💵' },
  { name: 'Прочие расходы', icon: '📦' },
];

// Базовые категории доходов
const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Зарплата', icon: '💰' },
  { name: 'Переводы входящие', icon: '💸' },
  { name: 'Кэшбэк и возврат', icon: '🔄' },
  { name: 'Проценты и дивиденды', icon: '📈' },
  { name: 'Прочие доходы', icon: '📥' },
];

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Создаёт базовые категории для нового пользователя
   */
  async createDefaultCategories(userId: string): Promise<void> {
    const existingCount = await this.prisma.category.count({
      where: { userId },
    });

    // Если у пользователя уже есть категории, не создаём
    if (existingCount > 0) {
      return;
    }

    // Создаём категории расходов
    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      await this.prisma.category.create({
        data: {
          userId,
          name: cat.name,
          type: 'EXPENSE',
          icon: cat.icon,
          isSystem: false,
        },
      });
    }

    // Создаём категории доходов
    for (const cat of DEFAULT_INCOME_CATEGORIES) {
      await this.prisma.category.create({
        data: {
          userId,
          name: cat.name,
          type: 'INCOME',
          icon: cat.icon,
          isSystem: false,
        },
      });
    }
  }

  async create(userId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        icon: dto.icon,
        parentId: dto.parentId,
        isSystem: false,
      },
    });
  }

  async findAll(userId: string, type?: CategoryType) {
    return this.prisma.category.findMany({
      where: {
        userId,
        ...(type && { type }),
      },
      include: {
        children: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        children: true,
        parent: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    return category;
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(userId, id); // Проверяем существование

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // Проверяем существование

    // Проверяем, есть ли транзакции с этой категорией
    const transactionsCount = await this.prisma.transaction.count({
      where: { categoryId: id },
    });

    if (transactionsCount > 0) {
      throw new BadRequestException(
        `Нельзя удалить категорию: есть ${transactionsCount} транзакций`,
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
