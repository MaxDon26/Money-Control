---
sidebar_position: 3
---

# Работа с базой данных

## Prisma CLI

### Основные команды

```bash
# Применить миграции в development
npx prisma migrate dev

# Создать миграцию с именем
npx prisma migrate dev --name add_new_field

# Применить миграции в production
npx prisma migrate deploy

# Сбросить БД и применить заново
npx prisma migrate reset

# Сгенерировать Prisma Client
npx prisma generate

# Открыть Prisma Studio
npx prisma studio

# Заполнить seed данные
npx prisma db seed
```

## Добавление новой модели

### 1. Обновите schema.prisma

```prisma
// prisma/schema.prisma

model Example {
  id          String   @id @default(uuid())
  userId      String
  name        String
  description String?
  amount      Decimal  @db.Decimal(15, 2)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

### 2. Обновите модель User

```prisma
model User {
  // ... существующие поля
  examples Example[]
}
```

### 3. Создайте миграцию

```bash
npx prisma migrate dev --name add_example_model
```

## Типы полей Prisma

| Тип Prisma | PostgreSQL | Описание |
|------------|------------|----------|
| `String` | `TEXT` | Строка |
| `Int` | `INTEGER` | Целое число |
| `Float` | `DOUBLE PRECISION` | Число с плавающей точкой |
| `Decimal` | `DECIMAL(p,s)` | Точное десятичное |
| `Boolean` | `BOOLEAN` | Логическое |
| `DateTime` | `TIMESTAMP` | Дата и время |
| `Json` | `JSONB` | JSON данные |

## Связи

### One-to-Many

```prisma
model User {
  id       String    @id @default(uuid())
  accounts Account[] // Один пользователь — много счетов
}

model Account {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id])
}
```

### Many-to-Many

```prisma
model Transaction {
  id   String @id @default(uuid())
  tags Tag[]  // Транзакция имеет много тегов
}

model Tag {
  id           String        @id @default(uuid())
  transactions Transaction[] // Тег на многих транзакциях
}
```

### Self-relation (подкатегории)

```prisma
model Category {
  id       String     @id @default(uuid())
  parentId String?
  parent   Category?  @relation("SubCategories", fields: [parentId], references: [id])
  children Category[] @relation("SubCategories")
}
```

## Запросы Prisma

### Базовые операции

```typescript
// Получить все
const items = await prisma.example.findMany({
  where: { userId },
});

// Получить один
const item = await prisma.example.findUnique({
  where: { id },
});

// Создать
const item = await prisma.example.create({
  data: { name: 'Test', userId },
});

// Обновить
const item = await prisma.example.update({
  where: { id },
  data: { name: 'Updated' },
});

// Удалить
await prisma.example.delete({
  where: { id },
});
```

### Фильтры

```typescript
const items = await prisma.example.findMany({
  where: {
    userId,
    isActive: true,
    amount: { gte: 100 },           // >= 100
    name: { contains: 'test' },     // LIKE '%test%'
    createdAt: {
      gte: new Date('2024-01-01'),
      lte: new Date('2024-12-31'),
    },
  },
});
```

### Сортировка и пагинация

```typescript
const items = await prisma.example.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * limit,
  take: limit,
});
```

### Включение связей

```typescript
const items = await prisma.transaction.findMany({
  include: {
    account: true,
    category: true,
    tags: true,
  },
});
```

### Агрегации

```typescript
const sum = await prisma.transaction.aggregate({
  where: { userId, type: 'EXPENSE' },
  _sum: { amount: true },
});

const grouped = await prisma.transaction.groupBy({
  by: ['categoryId'],
  where: { userId, type: 'EXPENSE' },
  _sum: { amount: true },
});
```

## Транзакции

```typescript
await prisma.$transaction(async (tx) => {
  // Списать со счёта
  await tx.account.update({
    where: { id: fromAccountId },
    data: { balance: { decrement: amount } },
  });

  // Зачислить на счёт
  await tx.account.update({
    where: { id: toAccountId },
    data: { balance: { increment: amount } },
  });

  // Создать запись перевода
  await tx.transfer.create({
    data: { fromAccountId, toAccountId, amount },
  });
});
```
