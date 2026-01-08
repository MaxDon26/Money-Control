---
sidebar_position: 1
---

# Список счетов

Получение всех счетов пользователя.

## Эндпоинт

```http
GET /api/accounts
```

## Заголовки

```http
Authorization: Bearer <access_token>
```

## Успешный ответ

**Код:** `200 OK`

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Сбербанк",
    "type": "CARD",
    "currency": "RUB",
    "balance": "50000.00",
    "icon": "💳",
    "color": "#52c41a",
    "isArchived": false,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Наличные",
    "type": "CASH",
    "currency": "RUB",
    "balance": "5000.00",
    "icon": "💵",
    "color": "#1890ff",
    "isArchived": false,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-18T12:00:00.000Z"
  }
]
```

## Типы счетов

| Тип | Описание |
|-----|----------|
| `CASH` | Наличные |
| `CARD` | Банковская карта |
| `DEPOSIT` | Вклад/депозит |
| `CREDIT` | Кредитная карта |
| `INVESTMENT` | Инвестиции |

## Общий баланс

```http
GET /api/accounts/total
```

**Ответ:**

```json
{
  "total": 55000
}
```

## cURL пример

```bash
curl -X GET http://localhost:4000/api/accounts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## JavaScript пример

```javascript
const response = await fetch('/api/accounts', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

const accounts = await response.json();
console.log(accounts);
```
