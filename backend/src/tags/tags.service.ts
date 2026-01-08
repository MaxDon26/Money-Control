import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateTagDto, UpdateTagDto } from './dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, userId },
    });
    if (!tag) {
      throw new NotFoundException('Тег не найден');
    }
    return tag;
  }

  async create(userId: string, dto: CreateTagDto) {
    const existing = await this.prisma.tag.findUnique({
      where: { userId_name: { userId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException('Тег с таким названием уже существует');
    }

    return this.prisma.tag.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateTagDto) {
    await this.findOne(id, userId);

    if (dto.name) {
      const existing = await this.prisma.tag.findFirst({
        where: {
          userId,
          name: dto.name,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Тег с таким названием уже существует');
      }
    }

    return this.prisma.tag.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.tag.delete({ where: { id } });
  }
}
