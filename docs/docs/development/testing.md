---
sidebar_position: 4
---

# Тестирование

## Backend тесты (Jest)

### Запуск

```bash
cd backend

# Все тесты
npm run test

# С покрытием
npm run test:cov

# Watch mode
npm run test:watch

# Конкретный файл
npm run test -- accounts.service.spec.ts
```

### Unit тест сервиса

```typescript
// accounts.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: PrismaService;

  const mockPrisma = {
    account: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return user accounts', async () => {
      const userId = 'user-123';
      const mockAccounts = [
        { id: '1', name: 'Card', balance: 1000 },
        { id: '2', name: 'Cash', balance: 500 },
      ];

      mockPrisma.account.findMany.mockResolvedValue(mockAccounts);

      const result = await service.findAll(userId);

      expect(result).toEqual(mockAccounts);
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
        where: { userId, isArchived: false },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('should create account with initial balance', async () => {
      const userId = 'user-123';
      const dto = { name: 'New Card', type: 'CARD', balance: 0 };
      const mockAccount = { id: '1', ...dto, userId };

      mockPrisma.account.create.mockResolvedValue(mockAccount);

      const result = await service.create(userId, dto);

      expect(result).toEqual(mockAccount);
    });
  });
});
```

### E2E тест

```typescript
// test/accounts.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AccountsController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Получить токен
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password' });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/accounts (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/api/accounts (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Account', type: 'CARD', balance: 1000 })
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toBe('Test Account');
      });
  });
});
```

## Frontend тесты (Vitest)

### Запуск

```bash
cd frontend

# Все тесты
npm run test

# Watch mode
npm run test:watch

# С UI
npm run test:ui
```

### Тест компонента

```typescript
// components/Example.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Example from './Example';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('Example', () => {
  it('renders correctly', () => {
    render(<Example />, { wrapper });
    expect(screen.getByText('Заголовок')).toBeInTheDocument();
  });

  it('handles click', async () => {
    const onClick = vi.fn();
    render(<Example onClick={onClick} />, { wrapper });

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Мок API

```typescript
import { vi } from 'vitest';
import * as api from '@/shared/api';

vi.mock('@/shared/api', () => ({
  exampleApi: {
    getAll: vi.fn().mockResolvedValue([
      { id: '1', name: 'Test' },
    ]),
  },
}));
```

## Покрытие кода

### Backend

```bash
npm run test:cov
```

Отчёт в `backend/coverage/lcov-report/index.html`

### Frontend

```bash
npm run test:coverage
```

## CI/CD интеграция

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd backend && npm ci
      - run: cd backend && npm run test:cov

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test
```
