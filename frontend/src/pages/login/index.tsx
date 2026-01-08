import { Form, Input, Button, Checkbox, message, Alert } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { SEO, jsonLdSchemas } from '@/shared/ui';

interface LoginFormData {
  email: string;
  password: string;
  remember: boolean;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { login, isLoading, error, clearError } = useAuthStore();

  const onFinish = async (values: LoginFormData) => {
    try {
      await login({ email: values.email, password: values.password });
      message.success('Вход выполнен успешно');
      navigate('/dashboard');
    } catch {
      // Ошибка уже обработана в store
    }
  };

  return (
    <>
      <SEO
        title="Вход"
        description="Войдите в Money Control для управления личными финансами"
        canonicalUrl="https://money-control.app/login"
        jsonLd={jsonLdSchemas.webApplication}
      />
      <Form
        form={form}
        name="login"
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
        requiredMark={false}
        onChange={clearError}
        aria-label="Форма входа"
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
        rules={[{ required: true, message: 'Введите пароль' }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
      </Form.Item>

      <Form.Item>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox>Запомнить меня</Checkbox>
          </Form.Item>
          <Link to="/forgot-password">Забыли пароль?</Link>
        </div>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={isLoading}>
          Войти
        </Button>
      </Form.Item>

      <div style={{ textAlign: 'center' }}>
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </div>
    </Form>
    </>
  );
}
