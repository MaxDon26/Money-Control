---
sidebar_position: 2
---

# Создание счёта

Создание нового счёта.

## Эндпоинт

```http
POST /api/accounts
```

## Заголовки

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Параметры запроса

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `name` | string | Да | Название счёта |
| `type` | string | Да | Тип счёта |
| `balance` | number | Да | Начальный баланс |
| `currency` | string | Нет | Валюта (по умолчанию RUB) |
| `icon` | string | Нет | Emoji иконка |
| `color` | string | Нет | HEX цвет |

## Типы счетов

- `CASH` — Наличные
- `CARD` — Банковская карта
- `DEPOSIT` — Вклад
- `CREDIT` — Кредит
- `INVESTMENT` — Инвестиции

## Пример запроса

```json
{
  "name": "Тинькофф",
  "type": "CARD",
  "balance": 100000,
  "currency": "RUB",
  "icon": "💳",
  "color": "#faad14"
}
```

## Успешный ответ

**Код:** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Тинькофф",
  "type": "CARD",
  "currency": "RUB",
  "balance": "100000.00",
  "icon": "💳",
  "color": "#faad14",
  "isArchived": false,
  "createdAt": "2024-01-20T10:00:00.000Z",
  "updatedAt": "2024-01-20T10:00:00.000Z"
}
```

## Ошибки

### Ошибка валидации

**Код:** `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "type must be a valid enum value"
  ],
  "error": "Bad Request"
}
```

## cURL пример

```bash
curl -X POST http://localhost:4000/api/accounts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Тинькофф",
    "type": "CARD",
    "balance": 100000
  }'
```

## JavaScript пример

```javascript
const response = await fetch('/api/accounts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Тинькофф',
    type: 'CARD',
    balance: 100000,
    icon: '💳',
  }),
});

const account = await response.json();
console.log(account);
```
