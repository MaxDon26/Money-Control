---
sidebar_position: 2
---

# Вход

Аутентификация существующего пользователя.

## Эндпоинт

```http
POST /api/auth/login
```

## Параметры запроса

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `email` | string | Да | Email пользователя |
| `password` | string | Да | Пароль |

## Пример запроса

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

## Успешный ответ

**Код:** `200 OK`

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "Иван",
    "defaultCurrency": "RUB",
    "emailVerified": true,
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Токены

| Токен | Время жизни | Назначение |
|-------|-------------|------------|
| `accessToken` | 15 минут | Авторизация запросов |
| `refreshToken` | 7 дней | Обновление access токена |

## Ошибки

### Неверные учётные данные

**Код:** `401 Unauthorized`

```json
{
  "statusCode": 401,
  "message": "Неверный email или пароль",
  "error": "Unauthorized"
}
```

## Использование токена

После входа добавляйте токен в заголовок:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## cURL пример

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

## JavaScript пример

```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

const data = await response.json();

// Сохранить токены
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);

// Использовать в запросах
const accounts = await fetch('/api/accounts', {
  headers: {
    'Authorization': `Bearer ${data.accessToken}`,
  },
});
```
