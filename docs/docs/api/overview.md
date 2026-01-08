---
sidebar_position: 1
slug: /api/overview
---

# API Overview

## Базовый URL

```
http://localhost:4000/api
```

## Аутентификация

Все защищённые эндпоинты требуют JWT токен:

```http
Authorization: Bearer <access_token>
```

## Формат ответов

### Успешный ответ

```json
{
  "id": "uuid",
  "field": "value"
}
```

### Ошибка

```json
{
  "statusCode": 400,
  "message": ["error message"],
  "error": "Bad Request"
}
```

## HTTP коды

| Код | Описание |
|-----|----------|
| 200 | OK — успешный запрос |
| 201 | Created — ресурс создан |
| 400 | Bad Request — ошибка валидации |
| 401 | Unauthorized — требуется аутентификация |
| 403 | Forbidden — нет доступа |
| 404 | Not Found — ресурс не найден |
| 500 | Internal Server Error — ошибка сервера |

## Эндпоинты

### Аутентификация

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/auth/register` | Регистрация |
| POST | `/auth/login` | Вход |
| POST | `/auth/logout` | Выход |
| POST | `/auth/refresh` | Обновить токены |
| POST | `/auth/forgot-password` | Сброс пароля |
| POST | `/auth/reset-password` | Новый пароль |

### Пользователи

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/users/me` | Текущий пользователь |
| PATCH | `/users/me` | Обновить профиль |

### Счета

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/accounts` | Список счетов |
| POST | `/accounts` | Создать счёт |
| GET | `/accounts/:id` | Получить счёт |
| PATCH | `/accounts/:id` | Обновить счёт |
| DELETE | `/accounts/:id` | Архивировать счёт |
| GET | `/accounts/total` | Общий баланс |

### Транзакции

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/transactions` | Список с фильтрами |
| POST | `/transactions` | Создать |
| GET | `/transactions/:id` | Получить |
| PATCH | `/transactions/:id` | Обновить |
| DELETE | `/transactions/:id` | Удалить |
| GET | `/transactions/stats` | Статистика |

### Категории

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/categories` | Список категорий |
| POST | `/categories` | Создать |
| PATCH | `/categories/:id` | Обновить |
| DELETE | `/categories/:id` | Удалить |

### Бюджеты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/budgets` | Список бюджетов |
| POST | `/budgets` | Создать |
| PATCH | `/budgets/:id` | Обновить |
| DELETE | `/budgets/:id` | Удалить |
| GET | `/budgets/progress` | Прогресс |
| POST | `/budgets/copy-previous` | Копировать |

### Повторяющиеся платежи

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/recurring` | Список |
| POST | `/recurring` | Создать |
| PATCH | `/recurring/:id` | Обновить |
| DELETE | `/recurring/:id` | Удалить |
| POST | `/recurring/:id/toggle` | Вкл/выкл |
| POST | `/recurring/:id/process` | Выполнить |
| POST | `/recurring/:id/skip` | Пропустить |

### Аналитика

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/analytics/summary` | Сводка |
| GET | `/analytics/by-category` | По категориям |
| GET | `/analytics/trend` | Тренд |
| GET | `/analytics/top-categories` | Топ категорий |
| GET | `/analytics/recent` | Последние транзакции |

## Swagger

Интерактивная документация доступна:

```
http://localhost:4000/api/docs
```
