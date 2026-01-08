---
sidebar_position: 1
---

# Сводка

Общая статистика за период.

## Эндпоинт

```http
GET /api/analytics/summary
```

## Заголовки

```http
Authorization: Bearer <access_token>
```

## Query параметры

| Параметр | Тип | Обязательно | Описание |
|----------|-----|-------------|----------|
| `dateFrom` | ISO date | Нет | Дата от |
| `dateTo` | ISO date | Нет | Дата до |

Если даты не указаны — статистика за весь период.

## Пример запроса

```http
GET /api/analytics/summary?dateFrom=2024-01-01&dateTo=2024-01-31
```

## Успешный ответ

**Код:** `200 OK`

```json
{
  "totalBalance": 250000,
  "income": 150000,
  "expense": 85000,
  "savings": 65000
}
```

## Поля ответа

| Поле | Описание |
|------|----------|
| `totalBalance` | Сумма балансов всех активных счетов |
| `income` | Сумма доходов за период |
| `expense` | Сумма расходов за период |
| `savings` | Экономия (income - expense) |

## cURL пример

```bash
curl -X GET "http://localhost:4000/api/analytics/summary?dateFrom=2024-01-01&dateTo=2024-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## JavaScript пример

```javascript
const dateFrom = '2024-01-01';
const dateTo = '2024-01-31';

const response = await fetch(
  `/api/analytics/summary?dateFrom=${dateFrom}&dateTo=${dateTo}`,
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);

const summary = await response.json();
console.log(`Баланс: ${summary.totalBalance} ₽`);
console.log(`Доходы: ${summary.income} ₽`);
console.log(`Расходы: ${summary.expense} ₽`);
console.log(`Экономия: ${summary.savings} ₽`);
```
