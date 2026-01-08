---
sidebar_position: 1
---

# Список транзакций

Получение транзакций с фильтрацией и пагинацией.

## Эндпоинт

```http
GET /api/transactions
```

## Заголовки

```http
Authorization: Bearer <access_token>
```

## Query параметры

| Параметр | Тип | Обязательно | Описание |
|----------|-----|-------------|----------|
| `page` | number | Нет | Номер страницы (по умолчанию 1) |
| `limit` | number | Нет | Элементов на странице (по умолчанию 20) |
| `dateFrom` | ISO date | Нет | Дата от |
| `dateTo` | ISO date | Нет | Дата до |
| `type` | string | Нет | INCOME или EXPENSE |
| `accountId` | UUID | Нет | Фильтр по счёту |
| `categoryId` | UUID | Нет | Фильтр по категории |
| `search` | string | Нет | Поиск по описанию |

## Пример запроса

```http
GET /api/transactions?page=1&limit=10&type=EXPENSE&dateFrom=2024-01-01
```

## Успешный ответ

**Код:** `200 OK`

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "EXPENSE",
      "amount": "500.00",
      "description": "Обед в кафе",
      "date": "2024-01-20T12:00:00.000Z",
      "createdAt": "2024-01-20T12:00:00.000Z",
      "account": {
        "id": "...",
        "name": "Сбербанк",
        "currency": "RUB"
      },
      "category": {
        "id": "...",
        "name": "Рестораны",
        "icon": "🍽️"
      },
      "tags": [
        { "id": "...", "name": "Бизнес-ланч", "color": "#1890ff" }
      ]
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}
```

## Статистика

```http
GET /api/transactions/stats?dateFrom=2024-01-01&dateTo=2024-01-31
```

**Ответ:**

```json
{
  "income": 150000,
  "expense": 85000,
  "balance": 65000
}
```

## cURL пример

```bash
curl -X GET "http://localhost:4000/api/transactions?type=EXPENSE&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## JavaScript пример

```javascript
const params = new URLSearchParams({
  page: '1',
  limit: '20',
  type: 'EXPENSE',
  dateFrom: '2024-01-01',
});

const response = await fetch(`/api/transactions?${params}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

const { data, meta } = await response.json();
console.log(`Всего: ${meta.total} транзакций`);
```
