import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Typography,
  Button,
  Card,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Switch,
  message,
  Popconfirm,
  Spin,
  Empty,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  StepForwardOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  recurringApi,
  RecurringPayment,
  CreateRecurringData,
  Frequency,
  accountsApi,
  categoriesApi,
  TransactionType,
} from '@/shared/api';
import { SEO } from '@/shared/ui';

const { Title, Text } = Typography;

const frequencyLabels: Record<Frequency, string> = {
  DAILY: 'Ежедневно',
  WEEKLY: 'Еженедельно',
  MONTHLY: 'Ежемесячно',
  YEARLY: 'Ежегодно',
};

const typeLabels: Record<TransactionType, string> = {
  INCOME: 'Доход',
  EXPENSE: 'Расход',
};

export default function RecurringPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RecurringPayment | null>(null);
  const [form] = Form.useForm();
  const selectedType = Form.useWatch('type', form);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['recurring'],
    queryFn: recurringApi.getAll,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAll,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
  const incomeCategories = categories.filter((c) => c.type === 'INCOME');

  const createMutation = useMutation({
    mutationFn: recurringApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      message.success('Платёж создан');
      handleCloseModal();
    },
    onError: () => message.error('Ошибка при создании'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRecurringData> }) =>
      recurringApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      message.success('Платёж обновлён');
      handleCloseModal();
    },
    onError: () => message.error('Ошибка при обновлении'),
  });

  const deleteMutation = useMutation({
    mutationFn: recurringApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      message.success('Платёж удалён');
    },
    onError: () => message.error('Ошибка при удалении'),
  });

  const toggleMutation = useMutation({
    mutationFn: recurringApi.toggle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
    },
    onError: () => message.error('Ошибка'),
  });

  const processMutation = useMutation({
    mutationFn: recurringApi.process,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      message.success('Платёж выполнен');
    },
    onError: () => message.error('Ошибка при выполнении'),
  });

  const skipMutation = useMutation({
    mutationFn: recurringApi.skip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      message.success('Платёж пропущен');
    },
    onError: () => message.error('Ошибка при пропуске'),
  });

  const handleOpenModal = (payment?: RecurringPayment) => {
    if (payment) {
      setEditingPayment(payment);
      form.setFieldsValue({
        ...payment,
        startDate: dayjs(payment.startDate),
        endDate: payment.endDate ? dayjs(payment.endDate) : undefined,
      });
    } else {
      setEditingPayment(null);
      form.resetFields();
      form.setFieldsValue({ type: 'EXPENSE', frequency: 'MONTHLY', startDate: dayjs() });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
    form.resetFields();
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    const data: CreateRecurringData = {
      name: values.name as string,
      amount: values.amount as number,
      categoryId: values.categoryId as string,
      accountId: values.accountId as string,
      type: values.type as TransactionType,
      frequency: values.frequency as Frequency,
      startDate: (values.startDate as dayjs.Dayjs).toISOString(),
      endDate: values.endDate ? (values.endDate as dayjs.Dayjs).toISOString() : undefined,
    };

    if (editingPayment) {
      await updateMutation.mutateAsync({ id: editingPayment.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const columns: ColumnsType<RecurringPayment> = [
    {
      title: 'Название',
      key: 'name',
      render: (_, record) => (
        <Space>
          <span style={{ fontSize: 18 }}>{record.category?.icon}</span>
          <div>
            <div>{record.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.category?.name}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Сумма',
      key: 'amount',
      width: 140,
      render: (_, record) => (
        <Tag color={record.type === 'INCOME' ? 'green' : 'red'}>
          {record.type === 'INCOME' ? '+' : '-'}
          {Number(record.amount).toLocaleString()} ₽
        </Tag>
      ),
    },
    {
      title: 'Периодичность',
      dataIndex: 'frequency',
      key: 'frequency',
      width: 130,
      render: (freq: Frequency) => frequencyLabels[freq],
    },
    {
      title: 'Следующий',
      key: 'nextDate',
      width: 130,
      render: (_, record) => (
        <Space>
          <ClockCircleOutlined />
          {dayjs(record.nextDate).format('DD.MM.YYYY')}
        </Space>
      ),
    },
    {
      title: 'Счёт',
      key: 'account',
      width: 140,
      render: (_, record) => record.account?.name,
    },
    {
      title: 'Активен',
      key: 'isActive',
      width: 90,
      render: (_, record) => (
        <Switch
          checked={record.isActive}
          onChange={() => toggleMutation.mutate(record.id)}
          loading={toggleMutation.isPending}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Tooltip title="Выполнить сейчас">
            <Button
              type="text"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => processMutation.mutate(record.id)}
              disabled={!record.isActive}
            />
          </Tooltip>
          <Tooltip title="Пропустить">
            <Button
              type="text"
              size="small"
              icon={<StepForwardOutlined />}
              onClick={() => skipMutation.mutate(record.id)}
              disabled={!record.isActive}
            />
          </Tooltip>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          />
          <Popconfirm
            title="Удалить платёж?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  const activePayments = payments.filter((p) => p.isActive);
  const inactivePayments = payments.filter((p) => !p.isActive);

  return (
    <>
      <SEO
        title="Регулярные платежи"
        description="Автоматизация регулярных платежей и подписок"
        noIndex
      />
      <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Регулярные платежи</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Добавить
        </Button>
      </div>

      {payments.length === 0 ? (
        <Card>
          <Empty description="Нет регулярных платежей" />
        </Card>
      ) : (
        <>
          {activePayments.length > 0 && (
            <Card title="Активные" style={{ marginBottom: 16 }}>
              <Table
                columns={columns}
                dataSource={activePayments}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          )}

          {inactivePayments.length > 0 && (
            <Card title="Приостановленные">
              <Table
                columns={columns}
                dataSource={inactivePayments}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          )}
        </>
      )}

      <Modal
        title={editingPayment ? 'Редактировать платёж' : 'Новый регулярный платёж'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Например: Аренда квартиры" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Тип"
            rules={[{ required: true }]}
          >
            <Select>
              {Object.entries(typeLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Сумма"
            rules={[{ required: true, message: 'Введите сумму' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              placeholder="0"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
            />
          </Form.Item>

          <Form.Item
            name="accountId"
            label="Счёт"
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

          <Form.Item
            name="categoryId"
            label="Категория"
            rules={[{ required: true, message: 'Выберите категорию' }]}
          >
            <Select placeholder="Выберите категорию">
              {(selectedType === 'INCOME' ? incomeCategories : expenseCategories).map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="frequency"
            label="Периодичность"
            rules={[{ required: true }]}
          >
            <Select>
              {Object.entries(frequencyLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="startDate"
            label="Дата начала"
            rules={[{ required: true, message: 'Выберите дату' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>

          <Form.Item name="endDate" label="Дата окончания (опционально)">
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingPayment ? 'Сохранить' : 'Создать'}
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
