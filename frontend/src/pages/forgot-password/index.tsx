import { useState } from 'react';
import { Form, Input, Button, message, Alert, Result } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { authApi } from '@/shared/api';
import { SEO, jsonLdSchemas } from '@/shared/ui';

export default function ForgotPasswordPage() {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const onFinish = async (values: { email: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(values.email);
      setIsSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <>
        <SEO
          title="Письмо отправлено"
          description="Проверьте почту для восстановления пароля Money Control"
          noIndex
        />
        <Result
        status="success"
        title="Письмо отправлено"
        subTitle="Если аккаунт с таким email существует, на него отправлена ссылка для сброса пароля. Проверьте почту."
        extra={[
          <Link key="login" to="/login">
            <Button type="primary">Вернуться к входу</Button>
          </Link>,
        ]}
      />
      </>
    );
  }

  return (
    <>
      <SEO
        title="Восстановление пароля"
        description="Восстановите доступ к аккаунту Money Control"
        canonicalUrl="https://money-control.app/forgot-password"
        jsonLd={jsonLdSchemas.webApplication}
      />
      <Form
      form={form}
      name="forgotPassword"
      onFinish={onFinish}
      autoComplete="off"
      layout="vertical"
      requiredMark={false}
      onChange={() => setError(null)}
    >
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 8 }}>Восстановление пароля</h2>
        <p style={{ color: '#666' }}>
          Введите email, указанный при регистрации
        </p>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
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

      <Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={isLoading}>
          Отправить ссылку
        </Button>
      </Form.Item>

      <div style={{ textAlign: 'center' }}>
        <Link to="/login">Вернуться к входу</Link>
      </div>
    </Form>
    </>
  );
}
