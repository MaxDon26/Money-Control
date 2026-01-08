import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Typography,
  Button,
  Card,
  Row,
  Col,
  Progress,
  Space,
  Modal,
  Form,
  Select,
  InputNumber,
  message,
  Popconfirm,
  Spin,
  Empty,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  LeftOutlined,
  RightOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  budgetsApi,
  Budget,
  CreateBudgetData,
  categoriesApi,
} from '@/shared/api';
import { SEO } from '@/shared/ui';

const { Title, Text } = Typography;

const getProgressStatus = (percentage: number) => {
  if (percentage >= 100) return 'exception' as const;
  if (percentage >= 80) return 'active' as const;
  return 'normal' as const;
};

const getProgressColor = (percentage: number) => {
  if (percentage >= 100) return '#ff4d4f';
  if (percentage >= 80) return '#faad14';
  return '#52c41a';
};

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(() => dayjs());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [isTotalBudgetMode, setIsTotalBudgetMode] = useState(false);
  const [form] = Form.useForm();

  const month = currentDate.month() + 1;
  const year = currentDate.year();

  const { data: progress, isLoading } = useQuery({
    queryKey: ['budgets', 'progress', month, year],
    queryFn: () => budgetsApi.getProgress(month, year),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll('EXPENSE'),
  });

  const createMutation = useMutation({
    mutationFn: budgetsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      message.success('Бюджет создан');
      handleCloseModal();
    },
    onError: (err: Error) => message.error(err.message || 'Ошибка при создании'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { amount?: number } }) =>
      budgetsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      message.success('Бюджет обновлён');
      handleCloseModal();
    },
    onError: () => message.error('Ошибка при обновлении'),
  });

  const deleteMutation = useMutation({
    mutationFn: budgetsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      message.success('Бюджет удалён');
    },
    onError: () => message.error('Ошибка при удалении'),
  });

  const copyMutation = useMutation({
    mutationFn: () => budgetsApi.copyFromPrevious(month, year),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      message.success(`Скопировано бюджетов: ${result.created}`);
    },
    onError: () => message.error('Не удалось скопировать бюджеты'),
  });

  // Фильтруем категории, для которых уже есть бюджет
  const existingCategoryIds = new Set(progress?.budgets.map((b) => b.categoryId) || []);
  const availableCategories = editingBudget
    ? categories
    : categories.filter((c) => !existingCategoryIds.has(c.id));

  const handleOpenModal = (budget?: Budget, isTotalMode = false) => {
    setIsTotalBudgetMode(isTotalMode);
    if (budget) {
      setEditingBudget(budget);
      form.setFieldsValue({
        categoryId: budget.categoryId,
        amount: budget.amount,
      });
    } else {
      setEditingBudget(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleOpenTotalBudgetModal = () => {
    const totalBudget = progress?.totalBudget;
    if (totalBudget) {
      // Редактирование существующего общего бюджета
      setEditingBudget({
        id: totalBudget.id,
        amount: totalBudget.amount,
        isTotal: true,
      } as Budget);
      form.setFieldsValue({ amount: totalBudget.amount });
    } else {
      setEditingBudget(null);
      form.resetFields();
    }
    setIsTotalBudgetMode(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
    setIsTotalBudgetMode(false);
    form.resetFields();
  };

  const handleSubmit = async (values: { categoryId?: string; amount: number }) => {
    if (editingBudget) {
      await updateMutation.mutateAsync({
        id: editingBudget.id,
        data: { amount: values.amount },
      });
    } else {
      const data: CreateBudgetData = {
        amount: values.amount,
        month,
        year,
        ...(isTotalBudgetMode ? { isTotal: true } : { categoryId: values.categoryId }),
      };
      await createMutation.mutateAsync(data);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handlePrevMonth = () => {
    setCurrentDate((d) => d.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentDate((d) => d.add(1, 'month'));
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  const budgets = progress?.budgets || [];
  const summary = progress?.summary;

  return (
    <>
      <SEO
        title="Бюджеты"
        description="Планирование и контроль месячных бюджетов"
        noIndex
      />
      <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Бюджеты</Title>
        <Space>
          <Button
            icon={<CopyOutlined />}
            onClick={() => copyMutation.mutate()}
            loading={copyMutation.isPending}
          >
            Из прошлого месяца
          </Button>
          <Button
            onClick={handleOpenTotalBudgetModal}
          >
            {progress?.totalBudget ? 'Изменить общий бюджет' : 'Общий бюджет'}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
            disabled={availableCategories.length === 0}
          >
            Добавить
          </Button>
        </Space>
      </div>

      {/* Навигация по месяцам */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Button icon={<LeftOutlined />} onClick={handlePrevMonth} />
          </Col>
          <Col>
            <Space>
              <DatePicker
                picker="month"
                value={currentDate}
                onChange={(date) => date && setCurrentDate(date)}
                format="MMMM YYYY"
                allowClear={false}
              />
            </Space>
          </Col>
          <Col>
            <Button icon={<RightOutlined />} onClick={handleNextMonth} />
          </Col>
        </Row>
      </Card>

      {/* Общий бюджет на месяц */}
      {progress?.totalBudget && (
        <Card
          style={{ marginBottom: 16, borderLeft: `4px solid ${getProgressColor(progress.totalBudget.percentage)}` }}
          actions={[
            <EditOutlined key="edit" onClick={handleOpenTotalBudgetModal} />,
            <Popconfirm
              key="delete"
              title="Удалить общий бюджет?"
              onConfirm={() => handleDelete(progress.totalBudget!.id)}
              okText="Да"
              cancelText="Нет"
            >
              <DeleteOutlined />
            </Popconfirm>,
          ]}
        >
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Text type="secondary">Общий бюджет на {monthNames[month - 1].toLowerCase()}</Text>
              <div style={{ marginTop: 8 }}>
                <Text strong style={{ fontSize: 20 }}>
                  {progress.totalBudget.spent.toLocaleString()} ₽
                </Text>
                <Text type="secondary"> / {progress.totalBudget.amount.toLocaleString()} ₽</Text>
              </div>
              <Text type={progress.totalBudget.percentage >= 100 ? 'danger' : 'secondary'}>
                {progress.totalBudget.percentage >= 100
                  ? `Превышение: ${Math.abs(progress.totalBudget.remaining).toLocaleString()} ₽`
                  : `Осталось: ${progress.totalBudget.remaining.toLocaleString()} ₽`}
              </Text>
            </Col>
            <Col flex="200px">
              <Progress
                percent={Math.min(progress.totalBudget.percentage, 100)}
                status={getProgressStatus(progress.totalBudget.percentage)}
                strokeColor={getProgressColor(progress.totalBudget.percentage)}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Прогресс по категориям */}
      {summary && summary.totalBudget > 0 && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Text type="secondary">Итого по категориям</Text>
              <div style={{ marginTop: 4 }}>
                <Text strong>
                  {summary.totalSpent.toLocaleString()} ₽
                </Text>
                <Text type="secondary"> / {summary.totalBudget.toLocaleString()} ₽</Text>
              </div>
            </Col>
            <Col flex="150px">
              <Progress
                percent={Math.min(summary.overallPercentage, 100)}
                status={getProgressStatus(summary.overallPercentage)}
                strokeColor={getProgressColor(summary.overallPercentage)}
                size="small"
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Список бюджетов */}
      {budgets.length === 0 ? (
        <Card>
          <Empty description="Нет бюджетов на этот месяц. Создайте первый!" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {budgets.map((budget) => {
            const isOverBudget = budget.percentage >= 100;
            const isWarning = budget.percentage >= 80 && budget.percentage < 100;

            return (
              <Col xs={24} sm={12} lg={6} key={budget.id}>
                <Card
                  hoverable
                  title={
                    <Space>
                      <span>{budget.category.icon}</span>
                      <span>{budget.category.name}</span>
                    </Space>
                  }
                  extra={
                    isOverBudget ? (
                      <Text type="danger">Превышен!</Text>
                    ) : isWarning ? (
                      <Text type="warning">Внимание</Text>
                    ) : null
                  }
                  actions={[
                    <EditOutlined key="edit" onClick={() => handleOpenModal(budget)} />,
                    <Popconfirm
                      key="delete"
                      title="Удалить бюджет?"
                      onConfirm={() => handleDelete(budget.id)}
                      okText="Да"
                      cancelText="Нет"
                    >
                      <DeleteOutlined />
                    </Popconfirm>,
                  ]}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>{budget.spent.toLocaleString()} ₽</Text>
                      <Text type="secondary"> / {budget.amount.toLocaleString()} ₽</Text>
                    </div>
                    <Progress
                      percent={Math.min(budget.percentage, 100)}
                      status={getProgressStatus(budget.percentage)}
                      strokeColor={getProgressColor(budget.percentage)}
                      showInfo={false}
                    />
                    <Text type={isOverBudget ? 'danger' : 'secondary'}>
                      {isOverBudget
                        ? `Превышение: ${Math.abs(budget.remaining).toLocaleString()} ₽`
                        : `Осталось: ${budget.remaining.toLocaleString()} ₽`}
                    </Text>
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Модальное окно */}
      <Modal
        title={
          isTotalBudgetMode
            ? (editingBudget ? 'Редактировать общий бюджет' : 'Новый общий бюджет')
            : (editingBudget ? 'Редактировать бюджет' : 'Новый бюджет')
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!isTotalBudgetMode && (
            <Form.Item
              name="categoryId"
              label="Категория"
              rules={[{ required: true, message: 'Выберите категорию' }]}
            >
              <Select
                placeholder="Выберите категорию"
                disabled={!!editingBudget}
                showSearch
                optionFilterProp="children"
              >
                {(editingBudget ? categories : availableCategories).map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
          {isTotalBudgetMode && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Общий бюджет учитывает все расходы за месяц, независимо от категории.
            </Text>
          )}

          <Form.Item
            name="amount"
            label="Лимит на месяц"
            rules={[{ required: true, message: 'Введите сумму' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              placeholder="0"
              suffix="₽"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingBudget ? 'Сохранить' : 'Создать'}
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
