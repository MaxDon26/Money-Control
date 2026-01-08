---
sidebar_position: 3
---

# Тренд

Динамика доходов и расходов по месяцам.

## Эндпоинт

```http
GET /api/analytics/trend
```

## Заголовки

```http
Authorization: Bearer <access_token>
```

## Query параметры

| Параметр | Тип | Обязательно | По умолчанию | Описание |
|----------|-----|-------------|--------------|----------|
| `months` | number | Нет | 6 | Количество месяцев |

## Пример запроса

```http
GET /api/analytics/trend?months=12
```

## Успешный ответ

**Код:** `200 OK`

```json
[
  {
    "month": "Фев",
    "income": 150000,
    "expense": 80000,
    "balance": 70000
  },
  {
    "month": "Мар",
    "income": 150000,
    "expense": 95000,
    "balance": 55000
  },
  {
    "month": "Апр",
    "income": 160000,
    "expense": 85000,
    "balance": 75000
  },
  {
    "month": "Май",
    "income": 150000,
    "expense": 90000,
    "balance": 60000
  },
  {
    "month": "Июн",
    "income": 180000,
    "expense": 120000,
    "balance": 60000
  },
  {
    "month": "Июл",
    "income": 150000,
    "expense": 85000,
    "balance": 65000
  }
]
```

## Поля ответа

| Поле | Описание |
|------|----------|
| `month` | Название месяца (сокращённое) |
| `income` | Сумма доходов за месяц |
| `expense` | Сумма расходов за месяц |
| `balance` | Разница (income - expense) |

## Использование для графиков

### Столбчатый график (Recharts)

```jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

function TrendBarChart({ data }) {
  return (
    <BarChart width={600} height={300} data={data}>
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="income" name="Доходы" fill="#52c41a" />
      <Bar dataKey="expense" name="Расходы" fill="#f5222d" />
    </BarChart>
  );
}
```

### Линейный график

```jsx
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

function TrendLineChart({ data }) {
  return (
    <LineChart width={600} height={300} data={data}>
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="income" stroke="#52c41a" />
      <Line type="monotone" dataKey="expense" stroke="#f5222d" />
      <Line type="monotone" dataKey="balance" stroke="#1890ff" strokeDasharray="5 5" />
    </LineChart>
  );
}
```

## cURL пример

```bash
curl -X GET "http://localhost:4000/api/analytics/trend?months=12" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```
