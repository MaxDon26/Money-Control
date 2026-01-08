---
sidebar_position: 3
---

# Backend архитектура

## Структура проекта

```
backend/src/
├── main.ts                 # Точка входа
├── app.module.ts           # Корневой модуль
│
├── auth/                   # Аутентификация
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/         # Passport стратегии
│   │   ├── jwt.strategy.ts
│   │   └── local.strategy.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   └── dto/
│       ├── login.dto.ts
│       └── register.dto.ts
│
├── users/                  # Пользователи
├── accounts/               # Счета
├── transactions/           # Транзакции
├── transfers/              # Переводы
├── categories/             # Категории
├── budgets/                # Бюджеты
├── recurring/              # Повторяющиеся платежи
├── analytics/              # Аналитика
├── tags/                   # Теги
│
├── common/                 # Общие модули
│   └── prisma/
│       └── prisma.service.ts
│
└── prisma/                 # Prisma схема и миграции
    ├── schema.prisma
    ├── migrations/
    └── seed.ts
```

## Модули

### Структура модуля

Каждый модуль следует паттерну NestJS:

```typescript
// accounts/accounts.module.ts
@Module({
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
```

### Controller

Обработка HTTP запросов:

```typescript
@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.accountsService.findAll(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(user.id, dto);
  }
}
```

### Service

Бизнес-логика:

```typescript
@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: { ...dto, userId },
    });
  }
}
```

### DTO (Data Transfer Object)

Валидация входных данных:

```typescript
export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsNumber()
  @Min(0)
  balance: number;

  @IsString()
  @IsOptional()
  currency?: string = 'RUB';
}
```

## Аутентификация

### JWT Strategy

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
```

### Защита эндпоинтов

```typescript
// Защита всего контроллера
@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {}

// Или отдельного метода
@Get('protected')
@UseGuards(JwtAuthGuard)
getProtected() {}
```

## Swagger документация

Автоматически генерируется из декораторов:

```typescript
@ApiTags('accounts')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {

  @ApiOperation({ summary: 'Получить все счета' })
  @ApiResponse({ status: 200, type: [Account] })
  @Get()
  findAll() {}
}
```

## Scheduled Tasks

Для повторяющихся платежей:

```typescript
@Injectable()
export class RecurringService {
  @Cron('0 0 * * *') // Каждый день в полночь
  async processRecurringPayments() {
    const duePayments = await this.findDuePayments();
    for (const payment of duePayments) {
      await this.executePayment(payment);
    }
  }
}
```
