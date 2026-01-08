---
sidebar_position: 3
---

# Обновление токена

Получение нового access токена с помощью refresh токена.

## Эндпоинт

```http
POST /api/auth/refresh
```

## Параметры запроса

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `refreshToken` | string | Да | Refresh токен |

## Пример запроса

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Успешный ответ

**Код:** `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

:::note
При каждом обновлении выдаётся новый refresh токен. Старый становится недействительным.
:::

## Ошибки

### Недействительный токен

**Код:** `401 Unauthorized`

```json
{
  "statusCode": 401,
  "message": "Недействительный refresh токен",
  "error": "Unauthorized"
}
```

### Токен истёк

**Код:** `401 Unauthorized`

```json
{
  "statusCode": 401,
  "message": "Refresh токен истёк",
  "error": "Unauthorized"
}
```

## Автоматическое обновление

Рекомендуется настроить автоматическое обновление в API клиенте:

```javascript
// Interceptor для axios
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');

      try {
        const { data } = await axios.post('/api/auth/refresh', {
          refreshToken,
        });

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Повторить оригинальный запрос
        error.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(error.config);
      } catch {
        // Redirect to login
        window.location.href = '/login';
      }
    }

    throw error;
  }
);
```

## cURL пример

```bash
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```
