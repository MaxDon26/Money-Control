---
sidebar_position: 1
---

# Регистрация

Создание нового аккаунта.

## Эндпоинт

```http
POST /api/auth/register
```

## Параметры запроса

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `email` | string | Да | Email пользователя |
| `password` | string | Да | Пароль (мин. 8 символов) |
| `name` | string | Нет | Имя пользователя |

## Пример запроса

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Иван"
}
```

## Успешный ответ

**Код:** `201 Created`

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "Иван",
    "defaultCurrency": "RUB",
    "emailVerified": false,
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Ошибки

### Email уже используется

**Код:** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Email уже используется",
  "error": "Bad Request"
}
```

### Ошибка валидации

**Код:** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

## cURL пример

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "Иван"
  }'
```

## JavaScript пример

```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'Иван',
  }),
});

const data = await response.json();
// Сохранить токены
localStorage.setItem('accessToken', data.accessToken);
```
