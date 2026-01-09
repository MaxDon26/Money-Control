import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoryMapper } from './parsers/category-mapper';
import { TinkoffParser } from './parsers/tinkoff.parser';
import { SberParser } from './parsers/sber.parser';
import { TinkoffPdfParser } from './parsers/tinkoff-pdf.parser';
import { SberPdfParser } from './parsers/sber-pdf.parser';
import { AiCategorizerService } from './ai/ai-categorizer.service';
import { AnthropicProvider } from './ai/anthropic.provider';
import { OpenAiProvider } from './ai/openai.provider';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [TelegramController],
  providers: [
    TelegramService,
    CategoryMapper,
    TinkoffParser,
    SberParser,
    TinkoffPdfParser,
    SberPdfParser,
    // AI categorization
    AiCategorizerService,
    AnthropicProvider,
    OpenAiProvider,
  ],
  exports: [TelegramService, AiCategorizerService],
})
export class TelegramModule {}
