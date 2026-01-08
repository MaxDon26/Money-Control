# Money Control

Приложение для контроля доходов и расходов.

## Возможности

- Управление счетами (карты, наличные, депозиты)
- Учёт доходов и расходов
- Переводы между счетами
- Категоризация транзакций
- Бюджеты с отслеживанием прогресса
- Повторяющиеся платежи
- Аналитика и графики
- PWA (установка на устройство)

## Технологии

### Frontend
- React 18 + TypeScript
- Vite
- Ant Design 5
- Zustand + TanStack Query
- React Router 6
- Recharts
- PWA (vite-plugin-pwa)
- FSD Architecture

### Backend
- NestJS 10 + TypeScript
- Prisma ORM
- PostgreSQL 15
- JWT Authentication
- Swagger API Docs

### Testing
- Jest (backend unit tests)
- Playwright (E2E tests)

## Быстрый старт

### 1. Запуск базы данных

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd backend

# Установка зависимостей
npm install

# Применение миграций
npx prisma migrate dev

# Запуск в режиме разработки
npm run start:dev
```

- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs

### 3. Frontend

```bash
cd frontend

# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev
```

Frontend: http://localhost:3000

### Одновременный запуск (из корня проекта)

```bash
npm install
npm run dev
```

## Структура проекта

```
money/
├── frontend/              # React приложение
│   └── src/
│       ├── app/           # Инициализация, провайдеры, роутинг
│       ├── pages/         # Страницы
│       ├── widgets/       # Крупные UI-блоки (Layout)
│       ├── features/      # Бизнес-фичи
│       ├── entities/      # Бизнес-сущности
│       └── shared/        # Общий код (API, UI kit)
├── backend/               # NestJS приложение
│   └── src/
│       ├── auth/          # Аутентификация
│       ├── users/         # Пользователи
│       ├── accounts/      # Счета
│       ├── transactions/  # Транзакции
│       ├── transfers/     # Переводы
│       ├── categories/    # Категории
│       ├── budgets/       # Бюджеты
│       ├── recurring/     # Повторяющиеся платежи
│       ├── analytics/     # Аналитика
│       └── prisma/        # Prisma сервис
├── tests/                 # E2E тесты (Playwright)
└── docker-compose.yml     # PostgreSQL
```

## Команды

### Корень проекта
| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск frontend + backend |
| `npm run build` | Сборка всего |
| `npm run test` | Все тесты |
| `npm run test:e2e` | E2E тесты |
| `npm run test:e2e:ui` | E2E тесты с UI |
| `npm run lint` | Линтинг |
| `npm run db:migrate` | Миграции БД |
| `npm run db:studio` | Prisma Studio |

### Frontend
| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev сервер |
| `npm run build` | Production сборка |
| `npm run preview` | Просмотр сборки |
| `npm run lint` | ESLint |

### Backend
| Команда | Описание |
|---------|----------|
| `npm run start:dev` | Dev сервер с hot reload |
| `npm run build` | Production сборка |
| `npm run start:prod` | Production запуск |
| `npm run test` | Unit тесты |
| `npx prisma migrate dev` | Миграции |
| `npx prisma studio` | GUI для БД |

## Переменные окружения

### Backend (.env)
```env
DATABASE_URL="postgresql://money_user:money_password@localhost:5432/money_db?schema=public"
JWT_SECRET="your-secret-key-min-32-characters"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"
PORT=4000
NODE_ENV=development
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/refresh` - Обновление токенов
- `POST /api/auth/logout` - Выход

### Accounts
- `GET /api/accounts` - Список счетов
- `POST /api/accounts` - Создать счёт
- `PATCH /api/accounts/:id` - Обновить
- `DELETE /api/accounts/:id` - Удалить

### Transactions
- `GET /api/transactions` - Список (с фильтрами)
- `POST /api/transactions` - Создать
- `PATCH /api/transactions/:id` - Обновить
- `DELETE /api/transactions/:id` - Удалить

### Categories
- `GET /api/categories` - Список категорий
- `POST /api/categories` - Создать
- `PATCH /api/categories/:id` - Обновить
- `DELETE /api/categories/:id` - Удалить

### Budgets
- `GET /api/budgets` - Список бюджетов
- `GET /api/budgets/progress` - Прогресс
- `POST /api/budgets` - Создать
- `PATCH /api/budgets/:id` - Обновить
- `DELETE /api/budgets/:id` - Удалить

### Recurring
- `GET /api/recurring` - Повторяющиеся платежи
- `POST /api/recurring` - Создать
- `PATCH /api/recurring/:id` - Обновить
- `DELETE /api/recurring/:id` - Удалить
- `POST /api/recurring/:id/toggle` - Вкл/выкл
- `POST /api/recurring/:id/process` - Выполнить сейчас

### Analytics
- `GET /api/analytics/summary` - Общая статистика
- `GET /api/analytics/by-category` - По категориям
- `GET /api/analytics/trend` - Тренд по месяцам

Полная документация: http://localhost:4000/api/docs

## PWA

Приложение поддерживает установку на устройство:
1. Откройте http://localhost:3000 в браузере
2. В Chrome: меню → "Установить приложение"
3. На мобильном: "Добавить на главный экран"

Поддерживается:
- Оффлайн кэширование статики
- Кэширование Google Fonts
- NetworkFirst для API запросов

## Лицензия

ISC
# Deployment test  9 янв 2026 г.  2:02:34
