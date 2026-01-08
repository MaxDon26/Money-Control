---
sidebar_position: 3
---

# Фильтрация транзакций

Подробное описание параметров фильтрации.

## Параметры

### По периоду

```http
GET /api/transactions?dateFrom=2024-01-01&dateTo=2024-01-31
```

Формат даты: ISO 8601 (`YYYY-MM-DD` или `YYYY-MM-DDTHH:mm:ss.sssZ`)

### По типу

```http
GET /api/transactions?type=EXPENSE
GET /api/transactions?type=INCOME
```

### По счёту

```http
GET /api/transactions?accountId=550e8400-e29b-41d4-a716-446655440000
```

### По категории

```http
GET /api/transactions?categoryId=550e8400-e29b-41d4-a716-446655440001
```

### Поиск

```http
GET /api/transactions?search=продукты
```

Поиск выполняется по полю `description` (без учёта регистра).

## Комбинирование фильтров

Все фильтры можно комбинировать:

```http
GET /api/transactions?dateFrom=2024-01-01&dateTo=2024-01-31&type=EXPENSE&categoryId=uuid&search=обед
```

## Пагинация

```http
GET /api/transactions?page=2&limit=50
```

| Параметр | По умолчанию | Макс. значение |
|----------|--------------|----------------|
| `page` | 1 | - |
| `limit` | 20 | 100 |

## Ответ с мета-данными

```json
{
  "data": [...],
  "meta": {
    "total": 150,      // Всего записей
    "page": 2,         // Текущая страница
    "limit": 50,       // Записей на странице
    "totalPages": 3    // Всего страниц
  }
}
```

## Примеры использования

### Расходы за текущий месяц

```javascript
const now = new Date();
const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
const dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

const params = new URLSearchParams({
  dateFrom,
  dateTo,
  type: 'EXPENSE',
});

const response = await fetch(`/api/transactions?${params}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Транзакции по категории "Продукты"

```javascript
const response = await fetch(`/api/transactions?categoryId=${productsCategoryId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Поиск по описанию

```javascript
const response = await fetch(`/api/transactions?search=${encodeURIComponent('кафе')}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```
