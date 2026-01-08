---
sidebar_position: 2
---

# По категориям

Статистика расходов и доходов по категориям.

## Эндпоинт

```http
GET /api/analytics/by-category
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

## Пример запроса

```http
GET /api/analytics/by-category?dateFrom=2024-01-01&dateTo=2024-01-31
```

## Успешный ответ

**Код:** `200 OK`

```json
{
  "expenses": [
    {
      "category": {
        "id": "uuid-1",
        "name": "Продукты",
        "icon": "🛒",
        "type": "EXPENSE"
      },
      "amount": 25000
    },
    {
      "category": {
        "id": "uuid-2",
        "name": "Транспорт",
        "icon": "🚗",
        "type": "EXPENSE"
      },
      "amount": 15000
    },
    {
      "category": {
        "id": "uuid-3",
        "name": "Развлечения",
        "icon": "🎬",
        "type": "EXPENSE"
      },
      "amount": 10000
    }
  ],
  "incomes": [
    {
      "category": {
        "id": "uuid-4",
        "name": "Зарплата",
        "icon": "💰",
        "type": "INCOME"
      },
      "amount": 150000
    }
  ]
}
```

## Использование для графиков

### Круговая диаграмма (Recharts)

```jsx
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d'];

function ExpensesPieChart({ data }) {
  const pieData = data.expenses.map(item => ({
    name: item.category.name,
    value: item.amount,
  }));

  return (
    <PieChart width={400} height={300}>
      <Pie
        data={pieData}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={100}
        label
      >
        {pieData.map((_, index) => (
          <Cell key={index} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
    </PieChart>
  );
}
```

## cURL пример

```bash
curl -X GET "http://localhost:4000/api/analytics/by-category?dateFrom=2024-01-01" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```
