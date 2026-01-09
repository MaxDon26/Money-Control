import { useState } from 'react';
import {
  Typography,
  Form,
  Input,
  Button,
  Select,
  Card,
  message,
  Divider,
  Modal,
  Space,
  Alert,
  Tag,
  Grid,
} from 'antd';
import { UserOutlined, MailOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { authApi } from '@/shared/api';
import { SEO } from '@/shared/ui';

const { Title } = Typography;
const { useBreakpoint } = Grid;

interface ProfileFormData {
  name: string;
  defaultCurrency: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isVerificationLoading, setIsVerificationLoading] = useState(false);

  const handleProfileSubmit = async (values: ProfileFormData) => {
    setIsProfileLoading(true);
    try {
      await updateProfile(values);
      message.success('Профиль обновлён');
    } catch {
      message.error('Ошибка при обновлении профиля');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (values: PasswordFormData) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Пароли не совпадают');
      return;
    }

    setIsPasswordLoading(true);
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword);
      message.success('Пароль изменён');
      setIsPasswordModalOpen(false);
      passwordForm.resetFields();
    } catch {
      message.error('Неверный текущий пароль');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleteLoading(true);
    try {
      await authApi.deleteAccount();
      message.success('Аккаунт удалён');
      await logout();
      navigate('/login');
    } catch {
      message.error('Ошибка при удалении аккаунта');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleSendVerification = async () => {
    setIsVerificationLoading(true);
    try {
      await authApi.sendVerification();
      message.success('Письмо для подтверждения отправлено');
    } catch {
      message.error('Ошибка при отправке письма');
    } finally {
      setIsVerificationLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <SEO
        title="Настройки"
        description="Настройки профиля и безопасности"
        noIndex
      />
      <div style={{ maxWidth: 600 }}>
      <Title level={isMobile ? 3 : 2}>Настройки</Title>

      <Card title="Профиль" style={{ marginBottom: 16 }}>
        <Form
          form={profileForm}
          layout="vertical"
          onFinish={handleProfileSubmit}
          initialValues={{
            name: user.name || '',
            defaultCurrency: user.defaultCurrency,
          }}
        >
          <Form.Item label="Email">
            <Space>
              <Input
                prefix={<MailOutlined />}
                value={user.email}
                disabled
                style={{ width: 300 }}
              />
              {user.emailVerified ? (
                <Tag icon={<CheckCircleOutlined />} color="success">
                  Подтверждён
                </Tag>
              ) : (
                <Space>
                  <Tag icon={<ExclamationCircleOutlined />} color="warning">
                    Не подтверждён
                  </Tag>
                  <Button
                    type="link"
                    size="small"
                    onClick={handleSendVerification}
                    loading={isVerificationLoading}
                  >
                    Отправить письмо
                  </Button>
                </Space>
              )}
            </Space>
          </Form.Item>

          <Form.Item
            name="name"
            label="Имя"
            rules={[{ required: true, message: 'Введите имя' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Ваше имя" />
          </Form.Item>

          <Form.Item name="defaultCurrency" label="Валюта по умолчанию">
            <Select>
              <Select.Option value="RUB">₽ Рубль (RUB)</Select.Option>
              <Select.Option value="USD">$ Доллар (USD)</Select.Option>
              <Select.Option value="EUR">€ Евро (EUR)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isProfileLoading}>
              Сохранить
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Безопасность">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button onClick={() => setIsPasswordModalOpen(true)}>
            Сменить пароль
          </Button>
          <Divider />
          <Alert
            message="Удаление аккаунта"
            description="При удалении аккаунта все ваши данные будут безвозвратно удалены."
            type="warning"
            showIcon
          />
          <Button danger onClick={() => setIsDeleteModalOpen(true)}>
            Удалить аккаунт
          </Button>
        </Space>
      </Card>

      <Modal
        title="Смена пароля"
        open={isPasswordModalOpen}
        onCancel={() => {
          setIsPasswordModalOpen(false);
          passwordForm.resetFields();
        }}
        footer={null}
        width={isMobile ? '95%' : 400}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handlePasswordSubmit}>
          <Form.Item
            name="currentPassword"
            label="Текущий пароль"
            rules={[{ required: true, message: 'Введите текущий пароль' }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Новый пароль"
            rules={[
              { required: true, message: 'Введите новый пароль' },
              { min: 6, message: 'Минимум 6 символов' },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Подтвердите пароль"
            rules={[
              { required: true, message: 'Подтвердите пароль' },
              { min: 6, message: 'Минимум 6 символов' },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={isPasswordLoading}>
                Сменить пароль
              </Button>
              <Button onClick={() => setIsPasswordModalOpen(false)}>Отмена</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Удаление аккаунта"
        open={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        width={isMobile ? '95%' : 400}
        footer={[
          <Button key="cancel" onClick={() => setIsDeleteModalOpen(false)}>
            Отмена
          </Button>,
          <Button
            key="delete"
            danger
            type="primary"
            loading={isDeleteLoading}
            onClick={handleDeleteAccount}
          >
            Удалить навсегда
          </Button>,
        ]}
      >
        <Alert
          message="Вы уверены?"
          description="Это действие нельзя отменить. Все ваши счета, транзакции, бюджеты и другие данные будут удалены безвозвратно."
          type="error"
          showIcon
        />
      </Modal>
    </div>
    </>
  );
}
