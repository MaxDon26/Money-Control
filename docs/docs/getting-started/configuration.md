---
sidebar_position: 2
---

# Конфигурация

## Переменные окружения Backend

Создайте файл `backend/.env`:

```env
# База данных
DATABASE_URL="postgresql://user:password@localhost:5432/money_control"

# JWT токены
JWT_SECRET="your-super-secret-key-minimum-32-characters"
JWT_REFRESH_SECRET="another-secret-key-minimum-32-characters"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Сервер
PORT=4000
NODE_ENV=development

# Frontend URL (для CORS)
FRONTEND_URL=http://localhost:3000

# Email (опционально, для восстановления пароля)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@money-control.app
```

### Описание переменных

| Переменная | Описание | Обязательно |
|------------|----------|-------------|
| `DATABASE_URL` | Строка подключения к PostgreSQL | Да |
| `JWT_SECRET` | Секрет для подписи access токенов | Да |
| `JWT_REFRESH_SECRET` | Секрет для refresh токенов | Да |
| `JWT_EXPIRES_IN` | Время жизни access токена | Нет (15m) |
| `JWT_REFRESH_EXPIRES_IN` | Время жизни refresh токена | Нет (7d) |
| `PORT` | Порт сервера | Нет (4000) |
| `NODE_ENV` | Окружение | Нет (development) |
| `FRONTEND_URL` | URL фронтенда для CORS | Нет |
| `RESEND_API_KEY` | API ключ Resend для email | Нет |
| `EMAIL_FROM` | Email отправителя | Нет |

## Переменные окружения Frontend

Создайте файл `frontend/.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

### Описание переменных

| Переменная | Описание | Обязательно |
|------------|----------|-------------|
| `VITE_API_URL` | URL бэкенд API | Нет (по умолчанию /api) |

## Конфигурация для Production

### Backend

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:password@production-db:5432/money_control"
JWT_SECRET="production-secret-key-very-long-and-random"
JWT_REFRESH_SECRET="another-production-secret-key"
FRONTEND_URL=https://money-control.app
```

### Frontend

```env
VITE_API_URL=https://api.money-control.app/api
```

## CORS настройка

CORS автоматически настраивается на основе `FRONTEND_URL`:
- В development разрешён `http://localhost:3000`
- В production разрешён только указанный `FRONTEND_URL`
