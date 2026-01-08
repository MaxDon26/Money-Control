---
sidebar_position: 4
---

# База данных

## Схема

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     User     │───┬──▶│   Account    │◀──────│ Transaction  │
└──────────────┘   │   └──────────────┘       └──────┬───────┘
                   │                                  │
                   │   ┌──────────────┐              │
                   ├──▶│   Category   │◀─────────────┘
                   │   └──────────────┘
                   │
                   │   ┌──────────────┐
                   ├──▶│    Budget    │
                   │   └──────────────┘
                   │
                   │   ┌──────────────┐
                   └──▶│  Recurring   │
                       └──────────────┘
```

## Модели

### User

```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  passwordHash    String
  name            String?
  defaultCurrency String    @default("RUB")
  emailVerified   Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  accounts        Account[]
  categories      Category[]
  transactions    Transaction[]
  budgets         Budget[]
  recurring       RecurringPayment[]
  tags            Tag[]
}
```

### Account

```prisma
model Account {
  id          String      @id @default(uuid())
  userId      String
  name        String
  type        AccountType
  currency    String      @default("RUB")
  balance     Decimal     @db.Decimal(15, 2)
  icon        String?
  color       String?
  isArchived  Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user        User        @relation(...)
  transactions Transaction[]
}

enum AccountType {
  CASH
  CARD
  DEPOSIT
  CREDIT
  INVESTMENT
}
```

### Transaction

```prisma
model Transaction {
  id          String          @id @default(uuid())
  userId      String
  accountId   String
  categoryId  String
  type        TransactionType
  amount      Decimal         @db.Decimal(15, 2)
  description String?
  date        DateTime
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  user        User            @relation(...)
  account     Account         @relation(...)
  category    Category        @relation(...)
  tags        Tag[]

  @@index([userId, date])
  @@index([accountId])
  @@index([categoryId])
}

enum TransactionType {
  INCOME
  EXPENSE
}
```

### Category

```prisma
model Category {
  id        String       @id @default(uuid())
  userId    String?      // null = системная категория
  name      String
  type      CategoryType
  icon      String?
  parentId  String?      // для подкатегорий
  isSystem  Boolean      @default(false)
  createdAt DateTime     @default(now())

  user      User?        @relation(...)
  parent    Category?    @relation("SubCategories", ...)
  children  Category[]   @relation("SubCategories")
}
```

### Budget

```prisma
model Budget {
  id         String   @id @default(uuid())
  userId     String
  categoryId String?  // null для общего бюджета
  amount     Decimal  @db.Decimal(15, 2)
  month      Int      // 1-12
  year       Int
  isTotal    Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user       User     @relation(...)
  category   Category? @relation(...)

  @@unique([userId, categoryId, month, year])
  @@index([userId, year, month])
}
```

### RecurringPayment

```prisma
model RecurringPayment {
  id         String          @id @default(uuid())
  userId     String
  name       String
  amount     Decimal         @db.Decimal(15, 2)
  categoryId String
  accountId  String
  type       TransactionType
  frequency  Frequency
  startDate  DateTime
  nextDate   DateTime
  endDate    DateTime?
  isActive   Boolean         @default(true)
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  user       User            @relation(...)
}

enum Frequency {
  DAILY
  WEEKLY
  MONTHLY
  YEARLY
}
```

## Индексы

Оптимизация частых запросов:

```prisma
@@index([userId, date])      // Транзакции по пользователю и дате
@@index([accountId])         // Транзакции по счёту
@@index([categoryId])        // Транзакции по категории
@@index([userId, year, month]) // Бюджеты по периоду
```

## Миграции

```bash
# Создать миграцию
npx prisma migrate dev --name add_tags

# Применить миграции в production
npx prisma migrate deploy

# Сбросить БД (ОСТОРОЖНО!)
npx prisma migrate reset
```

## Seed данные

Начальные категории создаются через `prisma/seed.ts`:

```typescript
const expenseCategories = [
  { name: 'Продукты', icon: '🛒', type: 'EXPENSE' },
  { name: 'Транспорт', icon: '🚗', type: 'EXPENSE' },
  // ...
];

await prisma.category.createMany({
  data: expenseCategories.map(c => ({ ...c, isSystem: true })),
});
```
