---
sidebar_position: 2
---

# Frontend архитектура

## Структура проекта

```
frontend/src/
├── app/                    # Инициализация приложения
│   ├── App.tsx            # Корневой компонент
│   ├── providers.tsx      # Провайдеры (Query, Router)
│   └── router.tsx         # Конфигурация роутинга
│
├── pages/                  # Страницы приложения
│   ├── dashboard/         # Главная страница
│   ├── transactions/      # Транзакции
│   ├── accounts/          # Счета
│   ├── categories/        # Категории
│   ├── budgets/           # Бюджеты
│   ├── recurring/         # Повторяющиеся платежи
│   ├── analytics/         # Аналитика
│   ├── settings/          # Настройки
│   ├── login/             # Вход
│   └── register/          # Регистрация
│
├── widgets/               # Крупные UI-блоки
│   └── layouts/
│       ├── MainLayout.tsx    # Основной layout с меню
│       └── AuthLayout.tsx    # Layout для auth страниц
│
├── entities/              # Бизнес-сущности
│   └── user/
│       └── model/
│           └── store.ts   # Zustand store пользователя
│
└── shared/                # Общий код
    ├── api/               # API клиент и эндпоинты
    │   ├── client.ts      # Axios instance
    │   ├── auth.ts        # Auth API
    │   ├── accounts.ts    # Accounts API
    │   └── ...
    ├── ui/                # UI компоненты
    │   └── SEO.tsx        # SEO компонент
    └── lib/               # Утилиты
```

## Технологии

### State Management

**Zustand** — глобальное состояние (auth, user):

```typescript
// entities/user/model/store.ts
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (data) => {
    const response = await authApi.login(data);
    set({ user: response.user, isAuthenticated: true });
  },
}));
```

**TanStack Query** — серверное состояние:

```typescript
// Кэширование, автоматические ре-фетчи
const { data, isLoading } = useQuery({
  queryKey: ['transactions', filters],
  queryFn: () => transactionsApi.getAll(filters),
});
```

### Маршрутизация

**React Router v6** с защищёнными маршрутами:

```typescript
<Routes>
  <Route element={<AuthLayout />}>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
  </Route>

  <Route element={<ProtectedRoute />}>
    <Route element={<MainLayout />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/transactions" element={<TransactionsPage />} />
    </Route>
  </Route>
</Routes>
```

### UI Framework

**Ant Design 5** — готовые компоненты:
- Form, Input, Select — формы
- Table, List — отображение данных
- Card, Modal — контейнеры
- Statistic, Progress — статистика

### Графики

**Recharts** — визуализация данных:
- PieChart — расходы по категориям
- BarChart — тренд по месяцам
- LineChart — динамика

## API клиент

```typescript
// shared/api/client.ts
const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Автоматическое добавление токена
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Автоматический refresh при 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await useAuthStore.getState().refresh();
      return apiClient(error.config);
    }
    throw error;
  }
);
```

## PWA

Настроено через `vite-plugin-pwa`:
- Service Worker для кэширования
- Manifest для установки
- Оффлайн-режим для статики

```typescript
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Money Control',
    short_name: 'Money',
    theme_color: '#1890ff',
  },
})
```
