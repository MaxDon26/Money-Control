import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateTransferDto } from './dto';

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTransferDto) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Нельзя перевести на тот же счёт');
    }

    // Проверяем, что оба счёта принадлежат пользователю
    const [fromAccount, toAccount] = await Promise.all([
      this.prisma.account.findFirst({
        where: { id: dto.fromAccountId, userId },
      }),
      this.prisma.account.findFirst({
        where: { id: dto.toAccountId, userId },
      }),
    ]);

    if (!fromAccount) {
      throw new BadRequestException('Счёт отправителя не найден');
    }

    if (!toAccount) {
      throw new BadRequestException('Счёт получателя не найден');
    }

    // Проверяем, что на счёте отправителя достаточно средств
    const currentBalance = Number(fromAccount.balance);
    if (dto.amount > currentBalance) {
      throw new BadRequestException(
        `Недостаточно средств на счёте. Доступно: ${currentBalance.toFixed(2)}`,
      );
    }

    // Создаём перевод и обновляем балансы атомарно
    const [transfer] = await this.prisma.$transaction([
      this.prisma.transfer.create({
        data: {
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          amount: dto.amount,
          date: new Date(dto.date),
          description: dto.description,
        },
        include: {
          fromAccount: { select: { id: true, name: true, currency: true } },
          toAccount: { select: { id: true, name: true, currency: true } },
        },
      }),
      this.prisma.account.update({
        where: { id: dto.fromAccountId },
        data: { balance: { decrement: dto.amount } },
      }),
      this.prisma.account.update({
        where: { id: dto.toAccountId },
        data: { balance: { increment: dto.amount } },
      }),
    ]);

    return transfer;
  }

  async findAll(userId: string) {
    // Получаем все счета пользователя
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });

    const accountIds = accounts.map((a) => a.id);

    return this.prisma.transfer.findMany({
      where: {
        OR: [
          { fromAccountId: { in: accountIds } },
          { toAccountId: { in: accountIds } },
        ],
      },
      include: {
        fromAccount: { select: { id: true, name: true, currency: true } },
        toAccount: { select: { id: true, name: true, currency: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });

    const accountIds = accounts.map((a) => a.id);

    const transfer = await this.prisma.transfer.findFirst({
      where: {
        id,
        OR: [
          { fromAccountId: { in: accountIds } },
          { toAccountId: { in: accountIds } },
        ],
      },
      include: {
        fromAccount: true,
        toAccount: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Перевод не найден');
    }

    return transfer;
  }

  async delete(userId: string, id: string) {
    const transfer = await this.findOne(userId, id);

    // Откатываем балансы
    await this.prisma.$transaction([
      this.prisma.transfer.delete({ where: { id } }),
      this.prisma.account.update({
        where: { id: transfer.fromAccountId },
        data: { balance: { increment: transfer.amount } },
      }),
      this.prisma.account.update({
        where: { id: transfer.toAccountId },
        data: { balance: { decrement: transfer.amount } },
      }),
    ]);

    return { success: true };
  }
}
