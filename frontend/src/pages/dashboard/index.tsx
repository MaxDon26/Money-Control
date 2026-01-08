import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Statistic, Typography, List, Tag, Spin, Empty } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
  SaveOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import { analyticsApi, Transaction, recurringApi, RecurringPayment } from '@/shared/api';
import { SEO } from '@/shared/ui';

const { Title, Text } = Typography;

const COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
];

// Вычисление месячной суммы платежа в зависимости от периодичности
const calculateMonthlyAmount = (payment: RecurringPayment): number => {
  const amount = Number(payment.amount);
  switch (payment.frequency) {
    case 'DAILY':
      return amount * 30;
    case 'WEEKLY':
      return amount * 4.33;
    case 'MONTHLY':
      return amount;
    case 'YEARLY':
      return amount / 12;
    default:
      return amount;
  }
};

const frequencyLabels: Record<string, string> = {
  DAILY: 'Ежедневно',
  WEEKLY: 'Еженедельно',
  MONTHLY: 'Ежемесячно',
  YEARLY: 'Ежегодно',
};

export default function DashboardPage() {
  // Даты текущего месяца
  const dateFrom = dayjs().startOf('month').toISOString();
  const dateTo = dayjs().endOf('month').toISOString();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics', 'summary', dateFrom, dateTo],
    queryFn: () => analyticsApi.getSummary({ dateFrom, dateTo }),
  });

  const { data: byCategory, isLoading: categoryLoading } = useQuery({
    queryKey: ['analytics', 'by-category', dateFrom, dateTo],
    queryFn: () => analyticsApi.getByCategory({ dateFrom, dateTo }),
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['analytics', 'trend'],
    queryFn: () => analyticsApi.getTrend(6),
  });

  const { data: recentTransactions, isLoading: recentLoading } = useQuery({
    queryKey: ['analytics', 'recent'],
    queryFn: () => analyticsApi.getRecent(5),
  });

  const { data: recurringPayments = [], isLoading: recurringLoading } = useQuery({
    queryKey: ['recurring'],
    queryFn: recurringApi.getAll,
  });

  // Активные регулярные платежи и их месячная сумма
  const activeRecurring = recurringPayments.filter((p) => p.isActive);
  const monthlyRecurringExpenses = activeRecurring
    .filter((p) => p.type === 'EXPENSE')
    .reduce((sum, p) => sum + calculateMonthlyAmount(p), 0);
  const monthlyRecurringIncome = activeRecurring
    .filter((p) => p.type === 'INCOME')
    .reduce((sum, p) => sum + calculateMonthlyAmount(p), 0);

  // Подготовка данных для круговой диаграммы
  const pieData = byCategory?.expenses.map((item) => ({
    name: item.category.name,
    value: item.amount,
    icon: item.category.icon,
  })) || [];

  const totalExpense = pieData.reduce((sum, item) => sum + item.value, 0);

  if (summaryLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <SEO
        title="Дашборд"
        description="Обзор ваших финансов: баланс, доходы, расходы и аналитика"
        noIndex
      />
      <Title level={2}>Дашборд</Title>

      {/* Статистика */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Общий баланс"
              value={summary?.totalBalance || 0}
              precision={0}
              prefix={<WalletOutlined />}
              suffix="₽"
              valueStyle={{ color: (summary?.totalBalance || 0) >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Доходы за месяц"
              value={summary?.income || 0}
              precision={0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<ArrowUpOutlined />}
              suffix="₽"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Расходы за месяц"
              value={summary?.expense || 0}
              precision={0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ArrowDownOutlined />}
              suffix="₽"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Экономия"
              value={summary?.savings || 0}
              precision={0}
              valueStyle={{ color: (summary?.savings || 0) >= 0 ? '#3f8600' : '#cf1322' }}
              prefix={<SaveOutlined />}
              suffix="₽"
            />
          </Card>
        </Col>
      </Row>

      {/* Графики */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Расходы по категориям */}
        <Col xs={24} lg={12}>
          <Card title="Расходы по категориям" loading={categoryLoading}>
            {pieData.length === 0 ? (
              <Empty description="Нет данных за этот период" style={{ height: 300 }} />
            ) : (
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${Number(value || 0).toLocaleString()} ₽`, 'Сумма']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {pieData.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Text type="secondary">
                  Всего: {totalExpense.toLocaleString()} ₽
                </Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Тренд по месяцам */}
        <Col xs={24} lg={12}>
          <Card title="Динамика за 6 месяцев" loading={trendLoading}>
            {!trend || trend.length === 0 ? (
              <Empty description="Нет данных" style={{ height: 300 }} />
            ) : (
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value) => `${Number(value || 0).toLocaleString()} ₽`}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Доходы" fill="#52c41a" />
                    <Bar dataKey="expense" name="Расходы" fill="#f5222d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Последние транзакции и топ категорий */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Последние транзакции" loading={recentLoading}>
            {!recentTransactions || recentTransactions.length === 0 ? (
              <Empty description="Нет транзакций" />
            ) : (
              <List
                dataSource={recentTransactions}
                renderItem={(item: Transaction) => (
                  <List.Item
                    extra={
                      <Tag color={item.type === 'INCOME' ? 'green' : 'red'} style={{ fontSize: 14 }}>
                        {item.type === 'INCOME' ? '+' : '-'}
                        {Number(item.amount).toLocaleString()} ₽
                      </Tag>
                    }
                  >
                    <List.Item.Meta
                      avatar={<span style={{ fontSize: 20 }}>{item.category.icon}</span>}
                      title={item.category.name}
                      description={
                        <>
                          {item.description && <span>{item.description} · </span>}
                          <Text type="secondary">{dayjs(item.date).format('DD.MM.YYYY')}</Text>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Топ расходов за месяц" loading={categoryLoading}>
            {pieData.length === 0 ? (
              <Empty description="Нет данных" />
            ) : (
              <List
                dataSource={pieData.slice(0, 5)}
                renderItem={(item, index) => (
                  <List.Item
                    extra={
                      <Text strong style={{ fontSize: 16 }}>
                        {item.value.toLocaleString()} ₽
                      </Text>
                    }
                  >
                    <List.Item.Meta
                      avatar={
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: COLORS[index % COLORS.length],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 16,
                          }}
                        >
                          {item.icon || (index + 1)}
                        </div>
                      }
                      title={item.name}
                      description={
                        <Text type="secondary">
                          {((item.value / totalExpense) * 100).toFixed(1)}% от всех расходов
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Регулярные платежи */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SyncOutlined />
                <span>Регулярные платежи</span>
              </div>
            }
            extra={
              <div style={{ display: 'flex', gap: 16 }}>
                {monthlyRecurringIncome > 0 && (
                  <Statistic
                    value={Math.round(monthlyRecurringIncome)}
                    suffix="₽/мес"
                    valueStyle={{ color: '#3f8600', fontSize: 16 }}
                    prefix="+"
                  />
                )}
                <Statistic
                  value={Math.round(monthlyRecurringExpenses)}
                  suffix="₽/мес"
                  valueStyle={{ color: '#cf1322', fontSize: 16 }}
                  prefix="-"
                />
              </div>
            }
            loading={recurringLoading}
          >
            {activeRecurring.length === 0 ? (
              <Empty description="Нет активных регулярных платежей" />
            ) : (
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
                dataSource={activeRecurring}
                renderItem={(item) => (
                  <List.Item>
                    <Card size="small" hoverable>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 18 }}>{item.category?.icon}</span>
                            <Text strong>{item.name}</Text>
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {frequencyLabels[item.frequency]}
                          </Text>
                        </div>
                        <Tag color={item.type === 'INCOME' ? 'green' : 'red'}>
                          {item.type === 'INCOME' ? '+' : '-'}{Number(item.amount).toLocaleString()} ₽
                        </Tag>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Следующий: {dayjs(item.nextDate).format('DD.MM.YYYY')}
                        </Text>
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
