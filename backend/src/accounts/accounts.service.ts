import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateAccountDto, UpdateAccountDto } from './dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        currency: dto.currency || 'RUB',
        balance: dto.balance,
        icon: dto.icon,
        color: dto.color,
        cardNumber: dto.cardNumber,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        accountNumber: dto.accountNumber,
        bankName: dto.bankName,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId },
    });

    if (!account) {
      throw new NotFoundException('Счёт не найден');
    }

    return account;
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    await this.findOne(userId, id);

    return this.prisma.account.update({
      where: { id },
      data: {
        ...dto,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });
  }

  async archive(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.account.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async getTotalBalance(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId, isArchived: false },
      select: { balance: true, currency: true },
    });

    // Простой подсчёт без конвертации валют
    const total = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    return { total, currency: 'RUB' };
  }
}
