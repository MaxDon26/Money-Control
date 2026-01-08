---
sidebar_position: 1
---

# Установка

## Требования

- **Node.js** 18+ (рекомендуется 20+)
- **npm** 9+ или **yarn** 1.22+
- **PostgreSQL** 15+
- **Git**

## Клонирование репозитория

```bash
git clone https://github.com/money-control/money-control.git
cd money-control
```

## Установка зависимостей

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

## Настройка базы данных

1. Создайте базу данных PostgreSQL:

```sql
CREATE DATABASE money_control;
```

2. Создайте файл `.env` в папке `backend`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/money_control"
JWT_SECRET="your-super-secret-key-min-32-characters"
JWT_REFRESH_SECRET="another-super-secret-key-min-32-chars"
```

3. Выполните миграции:

```bash
cd backend
npx prisma migrate dev
```

4. Заполните начальные данные (категории):

```bash
npx prisma db seed
```

## Проверка установки

```bash
# Backend
cd backend
npm run start:dev
# Должен запуститься на http://localhost:4000

# Frontend (в другом терминале)
cd frontend
npm run dev
# Должен запуститься на http://localhost:3000
```

## Возможные проблемы

### Ошибка подключения к PostgreSQL

Убедитесь, что:
- PostgreSQL запущен
- Данные в `DATABASE_URL` корректны
- База данных создана

### Ошибка Prisma

```bash
npx prisma generate
```

### Порт занят

Измените порт в `.env`:
```env
PORT=4001
```
