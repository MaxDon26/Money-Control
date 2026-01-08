import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Typography,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Segmented,
  Tabs,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SwapOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  transactionsApi,
  Transaction,
  TransactionType,
  CreateTransactionData,
  TransactionFilters,
  accountsApi,
  categoriesApi,
  transfersApi,
  Transfer,
  CreateTransferData,
  tagsApi,
  Tag as TagType,
} from '@/shared/api';
import { SEO } from '@/shared/ui';

const { Title } = Typography;
const { RangePicker } = DatePicker;

type OperationType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [operationType, setOperationType] = useState<OperationType>('EXPENSE');
  const [form] = Form.useForm();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedFromAccountId, setSelectedFromAccountId] = useState<string | null>(null);

  // Фильтры
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: 20,
  });

  // Данные
  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionsApi.getAll(filters),
  });

  const { data: stats } = useQuery({
    queryKey: ['transactions', 'stats', filters.dateFrom, filters.dateTo],
    queryFn: () => transactionsApi.getStats(filters.dateFrom, filters.dateTo),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAll,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['transfers'],
    queryFn: transfersApi.getAll,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getAll,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transfers'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
    queryClient.invalidateQueries({ queryKey: ['budgets'] });
    queryClient.invalidateQueries({ queryKey: ['tags'] });
  };

  const createTagMutation = useMutation({
    mutationFn: tagsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  // Мутации для транзакций
  const createMutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      invalidateAll();
      message.success('Транзакция создана');
      handleCloseModal();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const errorMessage = error.response?.data?.message || 'Ошибка при создании транзакции';
      message.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTransactionData> }) =>
      transactionsApi.update(id, data),
    onSuccess: () => {
      invalidateAll();
      message.success('Транзакция обновлена');
      handleCloseModal();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const errorMessage = error.response?.data?.message || 'Ошибка при обновлении транзакции';
      message.error(errorMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: transactionsApi.delete,
    onSuccess: () => {
      invalidateAll();
      message.success('Транзакция удалена');
    },
    onError: () => message.error('Ошибка при удалении транзакции'),
  });

  // Мутации для переводов
  const createTransferMutation = useMutation({
    mutationFn: transfersApi.create,
    onSuccess: () => {
      invalidateAll();
      message.success('Перевод выполнен');
      handleCloseModal();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const errorMessage = error.response?.data?.message || 'Ошибка при переводе';
      message.error(errorMessage);
    },
  });

  const deleteTransferMutation = useMutation({
    mutationFn: transfersApi.delete,
    onSuccess: () => {
      invalidateAll();
      message.success('Перевод удалён');
    },
    onError: () => message.error('Ошибка при удалении перевода'),
  });

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
  const incomeCategories = categories.filter((c) => c.type === 'INCOME');

  // Получаем выбранный счёт и его баланс
  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );
  const availableBalance = selectedAccount ? Number(selectedAccount.balance) : 0;

  // Для переводов - счёт-источник
  const selectedFromAccount = useMemo(
    () => accounts.find((a) => a.id === selectedFromAccountId),
    [accounts, selectedFromAccountId]
  );
  const availableFromBalance = selectedFromAccount ? Number(selectedFromAccount.balance) : 0;

  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setOperationType(transaction.type);
      setSelectedAccountId(transaction.accountId);
      form.setFieldsValue({
        ...transaction,
        amount: Number(transaction.amount),
        date: dayjs(transaction.date),
        tagIds: transaction.tags?.map((t) => t.id) || [],
      });
    } else {
      setEditingTransaction(null);
      setSelectedAccountId(null);
      setSelectedFromAccountId(null);
      form.resetFields();
      form.setFieldsValue({ date: dayjs(), tagIds: [] });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    setOperationType('EXPENSE');
    setSelectedAccountId(null);
    setSelectedFromAccountId(null);
    form.resetFields();
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    const date = (values.date as dayjs.Dayjs).toISOString();

    if (operationType === 'TRANSFER') {
      const transferData: CreateTransferData = {
        amount: values.amount as number,
        fromAccountId: values.fromAccountId as string,
        toAccountId: values.toAccountId as string,
        date,
        description: values.description as string | undefined,
      };
      await createTransferMutation.mutateAsync(transferData);
    } else {
      const transactionData: CreateTransactionData = {
        amount: values.amount as number,
        type: operationType as TransactionType,
        accountId: values.accountId as string,
        categoryId: values.categoryId as string,
        date,
        description: values.description as string | undefined,
        tagIds: (values.tagIds as string[]) || [],
      };

      if (editingTransaction) {
        await updateMutation.mutateAsync({ id: editingTransaction.id, data: transactionData });
      } else {
        await createMutation.mutateAsync(transactionData);
      }
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleFilterChange = (key: keyof TransactionFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setFilters((prev) => ({
        ...prev,
        dateFrom: dates[0]!.startOf('day').toISOString(),
        dateTo: dates[1]!.endOf('day').toISOString(),
        page: 1,
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        dateFrom: undefined,
        dateTo: undefined,
        page: 1,
      }));
    }
  };

  const columns: ColumnsType<Transaction> = [
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Категория',
      key: 'category',
      width: 150,
      render: (_, record) => (
        <Space>
          <span>{record.category.icon}</span>
          <span>{record.category.name}</span>
        </Space>
      ),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: 'Теги',
      key: 'tags',
      width: 150,
      render: (_, record) =>
        record.tags && record.tags.length > 0 ? (
          <Space size={2} wrap>
            {record.tags.map((tag) => (
              <Tag key={tag.id} color={tag.color || 'default'} style={{ margin: 0 }}>
                {tag.name}
              </Tag>
            ))}
          </Space>
        ) : null,
    },
    {
      title: 'Счёт',
      key: 'account',
      width: 140,
      render: (_, record) => record.account.name,
    },
    {
      title: 'Сумма',
      key: 'amount',
      width: 140,
      align: 'right',
      render: (_, record) => {
        const isIncome = record.type === 'INCOME';
        const prefix = record.account.currency === 'RUB' ? '₽' : record.account.currency === 'USD' ? '$' : '€';
        return (
          <Tag color={isIncome ? 'green' : 'red'} style={{ fontSize: 14 }}>
            {isIncome ? '+' : '-'}{Number(record.amount).toLocaleString()} {prefix}
          </Tag>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          />
          <Popconfirm
            title="Удалить транзакцию?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const transferColumns: ColumnsType<Transfer> = [
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Со счёта',
      key: 'fromAccount',
      render: (_, record) => record.fromAccount.name,
    },
    {
      title: '',
      key: 'arrow',
      width: 50,
      render: () => <SwapOutlined style={{ color: '#1890ff' }} />,
    },
    {
      title: 'На счёт',
      key: 'toAccount',
      render: (_, record) => record.toAccount.name,
    },
    {
      title: 'Сумма',
      key: 'amount',
      width: 140,
      align: 'right',
      render: (_, record) => (
        <Tag color="blue" style={{ fontSize: 14 }}>
          {Number(record.amount).toLocaleString()} ₽
        </Tag>
      ),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Popconfirm
          title="Удалить перевод?"
          description="Балансы счетов будут восстановлены"
          onConfirm={() => deleteTransferMutation.mutate(record.id)}
          okText="Да"
          cancelText="Нет"
        >
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <SEO
        title="Транзакции"
        description="Управление доходами и расходами в Money Control"
        noIndex
      />
      <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Транзакции</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Добавить
        </Button>
      </div>

      {/* Статистика */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Доходы"
                value={stats.income}
                precision={0}
                prefix={<ArrowUpOutlined />}
                suffix="₽"
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Расходы"
                value={stats.expense}
                precision={0}
                prefix={<ArrowDownOutlined />}
                suffix="₽"
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Экономия"
                value={stats.balance}
                precision={0}
                suffix="₽"
                valueStyle={{ color: stats.balance >= 0 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Фильтры */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <FilterOutlined style={{ marginRight: 8 }} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['От', 'До']}
              onChange={handleDateRangeChange}
              format="DD.MM.YYYY"
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Тип"
              allowClear
              onChange={(val) => handleFilterChange('type', val)}
              options={[
                { value: 'INCOME', label: 'Доходы' },
                { value: 'EXPENSE', label: 'Расходы' },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Счёт"
              allowClear
              onChange={(val) => handleFilterChange('accountId', val)}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Категория"
              allowClear
              showSearch
              optionFilterProp="label"
              onChange={(val) => handleFilterChange('categoryId', val)}
              options={[
                {
                  label: 'Расходы',
                  options: expenseCategories.map((c) => ({
                    value: c.id,
                    label: `${c.icon || ''} ${c.name}`.trim(),
                  })),
                },
                {
                  label: 'Доходы',
                  options: incomeCategories.map((c) => ({
                    value: c.id,
                    label: `${c.icon || ''} ${c.name}`.trim(),
                  })),
                },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Input.Search
              placeholder="Поиск..."
              allowClear
              onSearch={(val) => handleFilterChange('search', val || undefined)}
            />
          </Col>
        </Row>
      </Card>

      {/* Таблицы */}
      <Tabs
        defaultActiveKey="transactions"
        items={[
          {
            key: 'transactions',
            label: `Транзакции (${transactionsData?.meta.total || 0})`,
            children: (
              <Table
                columns={columns}
                dataSource={transactionsData?.data || []}
                rowKey="id"
                loading={isLoading}
                pagination={{
                  current: filters.page,
                  pageSize: filters.limit,
                  total: transactionsData?.meta.total || 0,
                  showSizeChanger: true,
                  showTotal: (total) => `Всего: ${total}`,
                  onChange: (page, pageSize) => {
                    setFilters((prev) => ({ ...prev, page, limit: pageSize }));
                  },
                }}
              />
            ),
          },
          {
            key: 'transfers',
            label: `Переводы (${transfers.length})`,
            children: (
              <Table
                columns={transferColumns}
                dataSource={transfers}
                rowKey="id"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `Всего: ${total}`,
                }}
              />
            ),
          },
        ]}
      />

      {/* Модальное окно */}
      <Modal
        title={editingTransaction ? 'Редактировать транзакцию' : 'Новая операция'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={500}
      >
        {!editingTransaction && (
          <Segmented
            block
            value={operationType}
            onChange={(val) => {
              setOperationType(val as OperationType);
              form.resetFields(['categoryId', 'accountId', 'fromAccountId', 'toAccountId']);
            }}
            options={[
              { value: 'EXPENSE', label: 'Расход', icon: <ArrowDownOutlined /> },
              { value: 'INCOME', label: 'Доход', icon: <ArrowUpOutlined /> },
              { value: 'TRANSFER', label: 'Перевод', icon: <SwapOutlined /> },
            ]}
            style={{ marginBottom: 24 }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="amount"
            label="Сумма"
            rules={[
              { required: true, message: 'Введите сумму' },
              {
                validator: (_, value) => {
                  // Валидация для расходов
                  if (operationType === 'EXPENSE' && selectedAccount && value > availableBalance) {
                    return Promise.reject(
                      new Error(`Сумма превышает доступный остаток (${availableBalance.toLocaleString()} ₽)`)
                    );
                  }
                  // Валидация для переводов
                  if (operationType === 'TRANSFER' && selectedFromAccount && value > availableFromBalance) {
                    return Promise.reject(
                      new Error(`Сумма превышает доступный остаток (${availableFromBalance.toLocaleString()} ₽)`)
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              max={
                operationType === 'EXPENSE' && selectedAccount
                  ? availableBalance
                  : operationType === 'TRANSFER' && selectedFromAccount
                    ? availableFromBalance
                    : undefined
              }
              placeholder="0"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
            />
          </Form.Item>

          {operationType === 'TRANSFER' ? (
            <>
              <Form.Item
                name="fromAccountId"
                label="Со счёта"
                rules={[{ required: true, message: 'Выберите счёт' }]}
              >
                <Select
                  placeholder="Выберите счёт"
                  onChange={(value) => setSelectedFromAccountId(value)}
                >
                  {accounts.map((a) => (
                    <Select.Option key={a.id} value={a.id}>
                      {a.name} ({Number(a.balance).toLocaleString()} ₽)
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Показываем доступный остаток для перевода */}
              {selectedFromAccount && (
                <Alert
                  message={`Доступно для перевода: ${availableFromBalance.toLocaleString()} ₽`}
                  type={availableFromBalance > 0 ? 'info' : 'warning'}
                  showIcon
                  style={{ marginBottom: 16, marginTop: -8 }}
                />
              )}

              <Form.Item
                name="toAccountId"
                label="На счёт"
                rules={[{ required: true, message: 'Выберите счёт' }]}
              >
                <Select placeholder="Выберите счёт">
                  {accounts.map((a) => (
                    <Select.Option key={a.id} value={a.id}>
                      {a.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                name="accountId"
                label="Счёт"
                rules={[{ required: true, message: 'Выберите счёт' }]}
              >
                <Select
                  placeholder="Выберите счёт"
                  onChange={(value) => setSelectedAccountId(value)}
                >
                  {accounts.map((a) => (
                    <Select.Option key={a.id} value={a.id}>
                      {a.name} ({Number(a.balance).toLocaleString()} ₽)
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Показываем доступный остаток для расходов */}
              {operationType === 'EXPENSE' && selectedAccount && (
                <Alert
                  message={`Доступно на счёте: ${availableBalance.toLocaleString()} ₽`}
                  type={availableBalance > 0 ? 'info' : 'warning'}
                  showIcon
                  style={{ marginBottom: 16, marginTop: -8 }}
                />
              )}

              <Form.Item
                name="categoryId"
                label="Категория"
                rules={[{ required: true, message: 'Выберите категорию' }]}
              >
                <Select placeholder="Выберите категорию">
                  {(operationType === 'INCOME' ? incomeCategories : expenseCategories).map((c) => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}

          <Form.Item
            name="date"
            label="Дата"
            rules={[{ required: true, message: 'Выберите дату' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={2} placeholder="Комментарий (необязательно)" />
          </Form.Item>

          {operationType !== 'TRANSFER' && (
            <Form.Item name="tagIds" label="Теги">
              <Select
                mode="multiple"
                placeholder="Выберите или создайте теги"
                allowClear
                options={tags.map((t) => ({
                  value: t.id,
                  label: t.name,
                }))}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                      <Input.Search
                        placeholder="Новый тег"
                        enterButton="Добавить"
                        size="small"
                        onSearch={async (value) => {
                          if (value.trim()) {
                            const newTag = await createTagMutation.mutateAsync({ name: value.trim() });
                            const currentTags = form.getFieldValue('tagIds') || [];
                            form.setFieldsValue({ tagIds: [...currentTags, newTag.id] });
                          }
                        }}
                      />
                    </div>
                  </>
                )}
              />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  createTransferMutation.isPending
                }
              >
                {editingTransaction ? 'Сохранить' : operationType === 'TRANSFER' ? 'Перевести' : 'Создать'}
              </Button>
              <Button onClick={handleCloseModal}>Отмена</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
    </>
  );
}
