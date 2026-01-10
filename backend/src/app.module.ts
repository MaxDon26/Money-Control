import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma';
import { EmailModule } from './email';
import { AuthModule } from './auth';
import { UsersModule } from './users';
import { AccountsModule } from './accounts';
import { CategoriesModule } from './categories';
import { TransactionsModule } from './transactions';
import { TransfersModule } from './transfers';
import { AnalyticsModule } from './analytics';
import { BudgetsModule } from './budgets';
import { RecurringModule } from './recurring';
import { TagsModule } from './tags';
import { TelegramModule } from './telegram/telegram.module';
import { ImportModule } from './import/import.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 секунда
        limit: 30, // 30 запросов в секунду
      },
      {
        name: 'medium',
        ttl: 60000, // 1 минута
        limit: 300, // 300 запросов в минуту
      },
    ]),
    PrismaModule,
    EmailModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    TransfersModule,
    AnalyticsModule,
    BudgetsModule,
    RecurringModule,
    TagsModule,
    TelegramModule,
    ImportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
