import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { CategoryType } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

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
        OR: [{ userId }, { isSystem: true }],
        ...(type && { type }),
      },
      include: {
        children: true,
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        OR: [{ userId }, { isSystem: true }],
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
    const category = await this.findOne(userId, id);

    if (category.isSystem) {
      throw new BadRequestException('Нельзя редактировать системную категорию');
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    const category = await this.findOne(userId, id);

    if (category.isSystem) {
      throw new BadRequestException('Нельзя удалить системную категорию');
    }

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

  async deleteSystemCategories() {
    await this.prisma.category.deleteMany({
      where: { isSystem: true },
    });
    return { message: 'Системные категории удалены' };
  }

  async seedSystemCategories() {
    const expenseCategories = [
      { name: 'Продукты', icon: '🛒' },
      { name: 'Транспорт', icon: '🚗' },
      { name: 'Жильё', icon: '🏠' },
      { name: 'Связь', icon: '📱' },
      { name: 'Здоровье', icon: '💊' },
      { name: 'Одежда', icon: '👕' },
      { name: 'Развлечения', icon: '🎮' },
      { name: 'Рестораны', icon: '🍽️' },
      { name: 'Подписки', icon: '📺' },
      { name: 'Образование', icon: '📚' },
      { name: 'Подарки', icon: '🎁' },
      { name: 'Другое', icon: '📦' },
    ];

    const incomeCategories = [
      { name: 'Зарплата', icon: '💰' },
      { name: 'Фриланс', icon: '💻' },
      { name: 'Инвестиции', icon: '📈' },
      { name: 'Подарки', icon: '🎁' },
      { name: 'Возврат', icon: '↩️' },
      { name: 'Другое', icon: '📦' },
    ];

    // Удаляем старые системные категории
    await this.prisma.category.deleteMany({
      where: { isSystem: true },
    });

    // Создаём новые с автогенерируемыми UUID
    for (const cat of expenseCategories) {
      await this.prisma.category.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          type: 'EXPENSE',
          isSystem: true,
        },
      });
    }

    for (const cat of incomeCategories) {
      await this.prisma.category.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          type: 'INCOME',
          isSystem: true,
        },
      });
    }

    return { message: 'Системные категории созданы' };
  }
}
