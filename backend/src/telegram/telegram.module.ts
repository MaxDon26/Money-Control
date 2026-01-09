import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TinkoffParser } from './parsers/tinkoff.parser';
import { SberParser } from './parsers/sber.parser';
import { TinkoffPdfParser } from './parsers/tinkoff-pdf.parser';
import { SberPdfParser } from './parsers/sber-pdf.parser';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [TelegramController],
  providers: [
    TelegramService,
    TinkoffParser,
    SberParser,
    TinkoffPdfParser,
    SberPdfParser,
  ],
  exports: [TelegramService],
})
export class TelegramModule {}
