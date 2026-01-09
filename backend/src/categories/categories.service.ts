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
