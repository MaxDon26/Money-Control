import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Typography,
  Button,
  Card,
  Row,
  Col,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Statistic,
  Tag,
  Space,
  Popconfirm,
  Spin,
  Empty,
  ColorPicker,
  Grid,
  Upload,
  DatePicker,
  Alert,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import {
  PlusOutlined,
  WalletOutlined,
  CreditCardOutlined,
  BankOutlined,
  DollarOutlined,
  LineChartOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { accountsApi, Account, AccountType, CreateAccountData, ParseRequisitesResult } from '@/shared/api';
import { SEO } from '@/shared/ui';

const { Title } = Typography;
const { useBreakpoint } = Grid;

const ACCOUNT_ICONS = [
  '💳', '💵', '🏦', '💰', '📈', '🪙', '💎', '🏠', '🚗', '✈️',
  '🎓', '🏥', '👶', '🐕', '🎮', '📱', '💻', '🛒', '☕', '🎁',
];

const accountTypeLabels: Record<AccountType, string> = {
  CASH: 'Наличные',
  CARD: 'Карта',
  DEPOSIT: 'Депозит',
  CREDIT: 'Кредит',
  INVESTMENT: 'Инвестиции',
};

const accountTypeIcons: Record<AccountType, React.ReactNode> = {
  CASH: <WalletOutlined />,
  CARD: <CreditCardOutlined />,
  DEPOSIT: <BankOutlined />,
  CREDIT: <DollarOutlined />,
  INVESTMENT: <LineChartOutlined />,
};

const accountTypeColors: Record<AccountType, string> = {
  CASH: 'green',
  CARD: 'blue',
  DEPOSIT: 'purple',
  CREDIT: 'red',
  INVESTMENT: 'gold',
};

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form] = Form.useForm();
  const [parsedRequisites, setParsedRequisites] = useState<ParseRequisitesResult | null>(null);
  const [requisitesFileList, setRequisitesFileList] = useState<UploadFile[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [iconSelectOpen, setIconSelectOpen] = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAll,
  });

  const { data: totalBalance } = useQuery({
    queryKey: ['accounts', 'total'],
    queryFn: accountsApi.getTotalBalance,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      invalidateAll();
      message.success('Счёт создан');
      handleCloseModal();
    },
    onError: () => message.error('Ошибка при создании счёта'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAccountData> }) =>
      accountsApi.update(id, data),
    onSuccess: () => {
      invalidateAll();
      message.success('Счёт обновлён');
      handleCloseModal();
    },
    onError: () => message.error('Ошибка при обновлении счёта'),
  });

  const archiveMutation = useMutation({
    mutationFn: accountsApi.archive,
    onSuccess: () => {
      invalidateAll();
      message.success('Счёт архивирован');
    },
    onError: () => message.error('Ошибка при архивировании счёта'),
  });

  const parseRequisitesMutation = useMutation({
    mutationFn: accountsApi.parseRequisites,
    onSuccess: (data) => {
      setParsedRequisites(data);
      setParseError(null);
      form.setFieldsValue({
        name: data.suggestedName,
        type: 'CARD',
        currency: data.currency,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
      });
      message.success(`Реквизиты ${data.bankName} распознаны`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      setParseError(
        error?.response?.data?.message ||
          error?.message ||
          'Не удалось распознать реквизиты'
      );
      setParsedRequisites(null);
    },
  });

  const handleOpenModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      form.setFieldsValue({
        ...account,
        balance: Number(account.balance),
        expiryDate: account.expiryDate ? dayjs(account.expiryDate) : undefined,
      });
    } else {
      setEditingAccount(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    form.resetFields();
    setParsedRequisites(null);
    setRequisitesFileList([]);
    setParseError(null);
  };

  const handleRequisitesUpload = (file: File) => {
    parseRequisitesMutation.mutate(file);
    return false;
  };

  const handleSubmit = async (values: CreateAccountData & { expiryDate?: dayjs.Dayjs }) => {
    const submitData: CreateAccountData = {
      ...values,
      expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : undefined,
    };
    if (editingAccount) {
      await updateMutation.mutateAsync({ id: editingAccount.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Счета"
        description="Управление банковскими счетами и кошельками"
        noIndex
      />
      <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 16 : 24, flexWrap: 'wrap', gap: 8 }}>
        <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>Счета</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          {isMobile ? '' : 'Добавить счёт'}
        </Button>
      </div>

      {totalBalance && (
        <Card style={{ marginBottom: 24 }}>
          <Statistic
            title="Общий баланс"
            value={totalBalance.total}
            precision={0}
            prefix="₽"
            valueStyle={{ color: totalBalance.total >= 0 ? '#3f8600' : '#cf1322' }}
          />
        </Card>
      )}

      {accounts.length === 0 ? (
        <Card>
          <Empty description="Нет счетов. Создайте первый счёт!" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {accounts.map((account) => (
            <Col xs={24} sm={12} lg={8} key={account.id}>
              <Card
                hoverable
                actions={[
                  <EditOutlined key="edit" onClick={() => handleOpenModal(account)} />,
                  <Popconfirm
                    key="delete"
                    title="Архивировать счёт?"
                    description="Счёт будет скрыт, но транзакции сохранятся"
                    onConfirm={() => archiveMutation.mutate(account.id)}
                    okText="Да"
                    cancelText="Нет"
                  >
                    <DeleteOutlined />
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  avatar={
                    <div
                      style={{
                        fontSize: 28,
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: account.color || accountTypeColors[account.type],
                        color: 'white',
                      }}
                    >
                      {account.icon || accountTypeIcons[account.type]}
                    </div>
                  }
                  title={
                    <Space>
                      {account.name}
                      <Tag color={account.color || accountTypeColors[account.type]}>
                        {accountTypeLabels[account.type]}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Statistic
                      value={Number(account.balance)}
                      precision={2}
                      prefix={account.currency === 'RUB' ? '₽' : account.currency === 'USD' ? '$' : '€'}
                      valueStyle={{
                        fontSize: 20,
                        color: Number(account.balance) >= 0 ? '#3f8600' : '#cf1322',
                      }}
                    />
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={editingAccount ? 'Редактировать счёт' : 'Новый счёт'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={isMobile ? '95%' : 500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ type: 'CARD', currency: 'RUB', balance: 0 }}
        >
          <Form.Item
            name="type"
            label="Тип счёта"
            rules={[{ required: true, message: 'Выберите тип' }]}
          >
            <Select>
              {Object.entries(accountTypeLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  <Space>
                    {accountTypeIcons[value as AccountType]}
                    {label}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) => {
              const accountType = getFieldValue('type') as AccountType;
              if (accountType !== 'CARD' || editingAccount) return null;

              return (
                <>
                  <Upload.Dragger
                    accept=".pdf"
                    fileList={requisitesFileList}
                    onChange={({ fileList }) => setRequisitesFileList(fileList.slice(-1))}
                    beforeUpload={handleRequisitesUpload}
                    maxCount={1}
                    disabled={parseRequisitesMutation.isPending}
                    style={{ marginBottom: 16 }}
                  >
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined />
                    </p>
                    <p className="ant-upload-text">
                      Загрузите PDF с реквизитами карты
                    </p>
                    <p className="ant-upload-hint">
                      Поддерживаются: Сбербанк, Тинькофф
                    </p>
                  </Upload.Dragger>

                  {parseError && (
                    <Alert
                      type="error"
                      message={parseError}
                      style={{ marginBottom: 16 }}
                      showIcon
                      closable
                      onClose={() => setParseError(null)}
                    />
                  )}

                  {parsedRequisites && (
                    <Alert
                      type="success"
                      message={`Банк: ${parsedRequisites.bankName}`}
                      description={
                        <Space direction="vertical" size={0}>
                          <span>Владелец: {parsedRequisites.ownerName || '—'}</span>
                          <span>Карта: ••{parsedRequisites.cardLastFour}</span>
                          {parsedRequisites.accountNumber && (
                            <span>Счёт: {parsedRequisites.accountNumber}</span>
                          )}
                        </Space>
                      }
                      style={{ marginBottom: 16 }}
                      showIcon
                    />
                  )}
                </>
              );
            }}
          </Form.Item>

          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Например: Основная карта" />
          </Form.Item>

          <Form.Item
            name="balance"
            label="Начальный баланс"
            rules={[{ required: true, message: 'Введите баланс' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
            />
          </Form.Item>

          <Form.Item name="currency" label="Валюта">
            <Select>
              <Select.Option value="RUB">₽ Рубль (RUB)</Select.Option>
              <Select.Option value="USD">$ Доллар (USD)</Select.Option>
              <Select.Option value="EUR">€ Евро (EUR)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) => {
              const accountType = getFieldValue('type') as AccountType;
              if (accountType !== 'CARD') return null;

              return (
                <>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="cardNumber"
                        label="Номер карты"
                        rules={[
                          { required: true, message: 'Введите номер карты' },
                          { pattern: /^\d{16}$/, message: '16 цифр' },
                        ]}
                      >
                        <Input placeholder="0000 0000 0000 0000" maxLength={16} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="expiryDate"
                        label="Срок действия"
                        rules={[{ required: true, message: 'Укажите срок действия' }]}
                      >
                        <DatePicker
                          picker="month"
                          format="MM/YYYY"
                          placeholder="MM/YYYY"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="accountNumber"
                        label="Лицевой счёт"
                        tooltip="20-значный номер для сопоставления с выписками"
                        rules={[
                          { pattern: /^\d{20}$/, message: '20 цифр' },
                        ]}
                      >
                        <Input placeholder="40817810100096040360" maxLength={20} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="bankName"
                        label="Банк"
                      >
                        <Input placeholder="Тинькофф" />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              );
            }}
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="icon" label="Иконка">
                <Select
                  placeholder="Выберите иконку"
                  allowClear
                  open={iconSelectOpen}
                  onDropdownVisibleChange={setIconSelectOpen}
                  dropdownStyle={{ padding: 8 }}
                  dropdownRender={() => (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(6, 1fr)',
                      gap: 4,
                      padding: 4,
                    }}>
                      {ACCOUNT_ICONS.map((icon) => (
                        <div
                          key={icon}
                          onClick={() => {
                            form.setFieldValue('icon', icon);
                            setIconSelectOpen(false);
                          }}
                          style={{
                            fontSize: 24,
                            padding: 8,
                            textAlign: 'center',
                            cursor: 'pointer',
                            borderRadius: 6,
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          {icon}
                        </div>
                      ))}
                    </div>
                  )}
                >
                  {ACCOUNT_ICONS.map((icon) => (
                    <Select.Option key={icon} value={icon}>
                      <span style={{ fontSize: 18 }}>{icon}</span>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="color" label="Цвет" getValueFromEvent={(color) => color?.toHexString()}>
                <ColorPicker format="hex" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingAccount ? 'Сохранить' : 'Создать'}
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
