---
sidebar_position: 1
slug: /
---

# Money Control

**Money Control** — веб-приложение для учёта личных финансов с поддержкой PWA.

## Возможности

- **Управление счетами** — банковские карты, наличные, депозиты, кредиты, инвестиции
- **Учёт транзакций** — доходы, расходы, переводы между счетами
- **Категории** — иерархические категории с подкатегориями
- **Бюджеты** — планирование месячных лимитов по категориям
- **Повторяющиеся платежи** — автоматизация регулярных операций
- **Аналитика** — графики, диаграммы, статистика по периодам
- **PWA** — установка на устройство, работа оффлайн

## Технологии

### Frontend
- React 18 + TypeScript
- Vite
- Ant Design 5
- TanStack Query
- Zustand
- Recharts
- Feature-Sliced Design

### Backend
- NestJS 11
- Prisma ORM
- PostgreSQL
- JWT аутентификация
- Swagger API

## Быстрый старт

```bash
# Клонирование
git clone https://github.com/money-control/money-control.git
cd money-control

# Backend
cd backend
npm install
npm run start:dev

# Frontend (в другом терминале)
cd frontend
npm install
npm run dev
```

Приложение будет доступно:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs

## Структура проекта

```
money/
├── frontend/          # React приложение
│   ├── src/
│   │   ├── app/       # Инициализация, роутинг
│   │   ├── pages/     # Страницы
│   │   ├── widgets/   # Виджеты (layouts)
│   │   ├── features/  # Бизнес-фичи
│   │   ├── entities/  # Бизнес-сущности
│   │   └── shared/    # Общий код
│   └── public/        # Статика
├── backend/           # NestJS API
│   ├── src/
│   │   ├── auth/      # Аутентификация
│   │   ├── users/     # Пользователи
│   │   ├── accounts/  # Счета
│   │   ├── transactions/ # Транзакции
│   │   ├── categories/   # Категории
│   │   ├── budgets/   # Бюджеты
│   │   ├── recurring/ # Повторяющиеся платежи
│   │   └── analytics/ # Аналитика
│   └── prisma/        # Схема БД
└── docs/              # Документация (вы здесь)
```
