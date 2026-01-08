---
sidebar_position: 3
---

# Запуск

## Development режим

### Запуск Backend

```bash
cd backend
npm run start:dev
```

Backend будет доступен:
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs

### Запуск Frontend

```bash
cd frontend
npm run dev
```

Frontend будет доступен: http://localhost:3000

## Production сборка

### Backend

```bash
cd backend
npm run build
npm run start:prod
```

### Frontend

```bash
cd frontend
npm run build
npm run preview  # для локального просмотра
```

Сборка будет в папке `frontend/dist/`.

## Docker

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: money
      POSTGRES_PASSWORD: money123
      POSTGRES_DB: money_control
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://money:money123@postgres:5432/money_control
      JWT_SECRET: your-secret-key-here
      JWT_REFRESH_SECRET: your-refresh-secret
    ports:
      - "4000:4000"
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Запуск

```bash
docker-compose up -d
```

## Полезные команды

### Prisma

```bash
# Применить миграции
npx prisma migrate dev

# Создать миграцию
npx prisma migrate dev --name add_new_feature

# Открыть Prisma Studio (GUI для БД)
npx prisma studio

# Сбросить БД и применить миграции заново
npx prisma migrate reset

# Заполнить seed данные
npx prisma db seed
```

### Тесты

```bash
# Backend unit тесты
cd backend
npm run test

# Frontend тесты
cd frontend
npm run test
```

### Линтинг

```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```
