import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Space,
  Segmented,
  Table,
  Tag,
  Spin,
  Empty,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { analyticsApi, AnalyticsQuery } from '@/shared/api';
import { SEO } from '@/shared/ui';

dayjs.extend(quarterOfYear);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
];

type ChartType = 'bar' | 'line';
type ViewPeriod = 'month' | 'quarter' | 'year' | 'custom';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<ViewPeriod>('month');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [customDates, setCustomDates] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const getDateRange = (): AnalyticsQuery => {
    const now = dayjs();
    switch (period) {
      case 'month':
        return {
          dateFrom: now.startOf('month').toISOString(),
          dateTo: now.endOf('month').toISOString(),
        };
      case 'quarter':
        return {
          dateFrom: now.startOf('quarter').toISOString(),
          dateTo: now.endOf('quarter').toISOString(),
        };
      case 'year':
        return {
          dateFrom: now.startOf('year').toISOString(),
          dateTo: now.endOf('year').toISOString(),
        };
      case 'custom':
        if (customDates && customDates[0] && customDates[1]) {
          return {
            dateFrom: customDates[0].startOf('day').toISOString(),
            dateTo: customDates[1].endOf('day').toISOString(),
          };
        }
        return {};
      default:
        return {};
    }
  };

  const dateRange = getDateRange();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics', 'summary', dateRange],
    queryFn: () => analyticsApi.getSummary(dateRange),
  });

  const { data: byCategory, isLoading: categoryLoading } = useQuery({
    queryKey: ['analytics', 'by-category', dateRange],
    queryFn: () => analyticsApi.getByCategory(dateRange),
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['analytics', 'trend'],
    queryFn: () => analyticsApi.getTrend(12),
  });

  const { data: topCategories } = useQuery({
    queryKey: ['analytics', 'top-categories', dateRange],
    queryFn: () => analyticsApi.getTopCategories(10, dateRange),
  });

  const formatCurrency = (value: number) =>
    `${value.toLocaleString('ru-RU')} ₽`;

  const expensePieData = byCategory?.expenses.map((item, index) => ({
    name: item.category?.name || 'Без категории',
    value: item.amount,
    color: COLORS[index % COLORS.length],
  })) || [];

  const incomePieData = byCategory?.incomes.map((item, index) => ({
    name: item.category?.name || 'Без категории',
    value: item.amount,
    color: COLORS[index % COLORS.length],
  })) || [];

  const totalExpense = expensePieData.reduce((sum, item) => sum + item.value, 0);

  const topCategoriesColumns = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: 'Категория',
      key: 'category',
      render: (_: unknown, record: { category?: { icon?: string; name?: string } }) => (
        <Space>
          <span>{record.category?.icon}</span>
          <span>{record.category?.name}</span>
        </Space>
      ),
    },
    {
      title: 'Сумма',
      key: 'amount',
      align: 'right' as const,
      render: (_: unknown, record: { amount: number }) => (
        <Text strong>{formatCurrency(record.amount)}</Text>
      ),
    },
    {
      title: '%',
      key: 'percent',
      width: 80,
      align: 'right' as const,
      render: (_: unknown, record: { amount: number }) => {
        const percent = totalExpense > 0 ? (record.amount / totalExpense * 100).toFixed(1) : 0;
        return <Tag color="red">{percent}%</Tag>;
      },
    },
  ];

  if (summaryLoading || categoryLoading || trendLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Аналитика"
        description="Детальная аналитика доходов и расходов"
        noIndex
      />
      <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Аналитика</Title>
        <Space wrap>
          <Segmented
            value={period}
            onChange={(val) => setPeriod(val as ViewPeriod)}
            options={[
              { value: 'month', label: 'Месяц' },
              { value: 'quarter', label: 'Квартал' },
              { value: 'year', label: 'Год' },
              { value: 'custom', label: 'Период' },
            ]}
          />
          {period === 'custom' && (
            <RangePicker
              value={customDates}
              onChange={setCustomDates}
              format="DD.MM.YYYY"
            />
          )}
        </Space>
      </div>

      {/* Сводка */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
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
              title="Доходы"
              value={summary?.income || 0}
              precision={0}
              prefix={<ArrowUpOutlined />}
              suffix="₽"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Расходы"
              value={summary?.expense || 0}
              precision={0}
              prefix={<ArrowDownOutlined />}
              suffix="₽"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Накоплено"
              value={summary?.savings || 0}
              precision={0}
              prefix={<TrophyOutlined />}
              suffix="₽"
              valueStyle={{ color: (summary?.savings || 0) >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Тренд */}
      <Card
        title="Динамика доходов и расходов"
        style={{ marginBottom: 24 }}
        extra={
          <Segmented
            size="small"
            value={chartType}
            onChange={(val) => setChartType(val as ChartType)}
            options={[
              { value: 'bar', label: 'Столбцы' },
              { value: 'line', label: 'Линии' },
            ]}
          />
        }
      >
        {trend && trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'bar' ? (
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(val) => formatCurrency(val as number)} />
                <Legend />
                <Bar dataKey="income" name="Доходы" fill="#52c41a" />
                <Bar dataKey="expense" name="Расходы" fill="#f5222d" />
              </BarChart>
            ) : (
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(val) => formatCurrency(val as number)} />
                <Legend />
                <Line type="monotone" dataKey="income" name="Доходы" stroke="#52c41a" strokeWidth={2} />
                <Line type="monotone" dataKey="expense" name="Расходы" stroke="#f5222d" strokeWidth={2} />
                <Line type="monotone" dataKey="balance" name="Баланс" stroke="#1890ff" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <Empty description="Нет данных за период" />
        )}
      </Card>

      {/* Расходы и доходы по категориям */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Расходы по категориям">
            {expensePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {expensePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatCurrency(val as number)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="Нет расходов за период" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Доходы по категориям">
            {incomePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incomePieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {incomePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatCurrency(val as number)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="Нет доходов за период" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Топ категорий расходов */}
      <Card title={<><TrophyOutlined /> Топ категорий расходов</>}>
        <Table
          columns={topCategoriesColumns}
          dataSource={topCategories || []}
          rowKey={(record) => record.category?.id || Math.random().toString()}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
    </>
  );
}
