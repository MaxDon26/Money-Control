---
sidebar_position: 1
---

# Разработка Frontend

## Структура компонента страницы

```typescript
// pages/example/index.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography, Button, Table, message } from 'antd';
import { exampleApi } from '@/shared/api';
import { SEO } from '@/shared/ui';

export default function ExamplePage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Загрузка данных
  const { data, isLoading } = useQuery({
    queryKey: ['examples'],
    queryFn: exampleApi.getAll,
  });

  // Мутация
  const createMutation = useMutation({
    mutationFn: exampleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examples'] });
      message.success('Создано!');
    },
  });

  return (
    <>
      <SEO title="Пример" description="Описание страницы" noIndex />
      <div>
        <Typography.Title level={2}>Пример</Typography.Title>
        <Table dataSource={data} loading={isLoading} />
      </div>
    </>
  );
}
```

## Добавление нового API

### 1. Создайте файл API

```typescript
// shared/api/example.ts
import { apiClient } from './client';

export interface Example {
  id: string;
  name: string;
}

export const exampleApi = {
  getAll: async (): Promise<Example[]> => {
    const { data } = await apiClient.get('/examples');
    return data;
  },

  create: async (dto: { name: string }): Promise<Example> => {
    const { data } = await apiClient.post('/examples', dto);
    return data;
  },

  update: async (id: string, dto: Partial<Example>): Promise<Example> => {
    const { data } = await apiClient.patch(`/examples/${id}`, dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/examples/${id}`);
  },
};
```

### 2. Экспортируйте из index

```typescript
// shared/api/index.ts
export * from './example';
```

## Работа с формами

```typescript
import { Form, Input, Button, message } from 'antd';
import { useMutation } from '@tanstack/react-query';

function ExampleForm() {
  const [form] = Form.useForm();

  const mutation = useMutation({
    mutationFn: exampleApi.create,
    onSuccess: () => {
      message.success('Сохранено');
      form.resetFields();
    },
    onError: () => message.error('Ошибка'),
  });

  return (
    <Form form={form} onFinish={mutation.mutate} layout="vertical">
      <Form.Item
        name="name"
        label="Название"
        rules={[{ required: true, message: 'Обязательное поле' }]}
      >
        <Input />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={mutation.isPending}>
        Сохранить
      </Button>
    </Form>
  );
}
```

## Работа с таблицами

```typescript
import { Table, Button, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const columns: ColumnsType<Example> = [
  {
    title: 'Название',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Действия',
    key: 'actions',
    render: (_, record) => (
      <Space>
        <Button onClick={() => onEdit(record)}>Изменить</Button>
        <Popconfirm title="Удалить?" onConfirm={() => onDelete(record.id)}>
          <Button danger>Удалить</Button>
        </Popconfirm>
      </Space>
    ),
  },
];

<Table
  columns={columns}
  dataSource={data}
  rowKey="id"
  loading={isLoading}
  pagination={{ pageSize: 20 }}
/>
```

## Стили

Используйте inline стили или Ant Design токены:

```typescript
// Inline стили
<div style={{ padding: 24, marginBottom: 16 }}>

// Токены через CSS переменные
<div style={{ color: 'var(--ant-color-primary)' }}>
```

## Тестирование

```typescript
// example.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExamplePage from './index';

const queryClient = new QueryClient();

test('renders page title', () => {
  render(
    <QueryClientProvider client={queryClient}>
      <ExamplePage />
    </QueryClientProvider>
  );
  expect(screen.getByText('Пример')).toBeInTheDocument();
});
```
