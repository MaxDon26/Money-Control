import { Form, Input, Button, message, Alert } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { SEO, jsonLdSchemas } from '@/shared/ui';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { register, isLoading, error, clearError } = useAuthStore();

  const onFinish = async (values: RegisterFormData) => {
    try {
      await register({
        email: values.email,
        password: values.password,
        name: values.name,
      });
      message.success('Регистрация успешна!');
      navigate('/dashboard');
    } catch {
      // Ошибка уже обработана в store
    }
  };

  return (
    <>
      <SEO
        title="Регистрация"
        description="Создайте аккаунт Money Control для учёта личных финансов"
        canonicalUrl="https://money-control.app/register"
        jsonLd={jsonLdSchemas.webApplication}
      />
      <Form
        form={form}
        name="register"
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
        requiredMark={false}
        onChange={clearError}
        aria-label="Форма регистрации"
      >
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={clearError}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form.Item
        name="name"
        rules={[{ required: true, message: 'Введите имя' }]}
      >
        <Input prefix={<UserOutlined />} placeholder="Имя" size="large" />
      </Form.Item>

      <Form.Item
        name="email"
        rules={[
          { required: true, message: 'Введите email' },
          { type: 'email', message: 'Некорректный email' },
        ]}
      >
        <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[
          { required: true, message: 'Введите пароль' },
          { min: 8, message: 'Минимум 8 символов' },
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        dependencies={['password']}
        rules={[
          { required: true, message: 'Подтвердите пароль' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('Пароли не совпадают'));
            },
          }),
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Подтвердите пароль" size="large" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={isLoading}>
          Зарегистрироваться
        </Button>
      </Form.Item>

      <div style={{ textAlign: 'center' }}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </div>
    </Form>
    </>
  );
}
