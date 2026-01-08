import { useState } from 'react';
import { Form, Input, Button, message, Alert, Result } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '@/shared/api';
import { SEO } from '@/shared/ui';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!token) {
    return (
      <>
        <SEO
          title="Недействительная ссылка"
          description="Ссылка для сброса пароля недействительна"
          noIndex
        />
        <Result
        status="error"
        title="Недействительная ссылка"
        subTitle="Ссылка для сброса пароля недействительна или устарела."
        extra={[
          <Link key="forgot" to="/forgot-password">
            <Button type="primary">Запросить новую ссылку</Button>
          </Link>,
        ]}
      />
      </>
    );
  }

  const onFinish = async (values: { password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(token, values.password);
      setIsSuccess(true);
      message.success('Пароль успешно изменён');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Ссылка недействительна или устарела';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <>
        <SEO
          title="Пароль изменён"
          description="Пароль успешно изменён"
          noIndex
        />
        <Result
        status="success"
        title="Пароль изменён"
        subTitle="Теперь вы можете войти с новым паролем."
        extra={[
          <Link key="login" to="/login">
            <Button type="primary">Войти</Button>
          </Link>,
        ]}
      />
      </>
    );
  }

  return (
    <>
      <SEO
        title="Новый пароль"
        description="Установите новый пароль для аккаунта Money Control"
        noIndex
      />
      <Form
      form={form}
      name="resetPassword"
      onFinish={onFinish}
      autoComplete="off"
      layout="vertical"
      requiredMark={false}
      onChange={() => setError(null)}
    >
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 8 }}>Новый пароль</h2>
        <p style={{ color: '#666' }}>
          Придумайте новый пароль для вашего аккаунта
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
        name="password"
        rules={[
          { required: true, message: 'Введите пароль' },
          { min: 6, message: 'Минимум 6 символов' },
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Новый пароль" size="large" />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        rules={[
          { required: true, message: 'Подтвердите пароль' },
          { min: 6, message: 'Минимум 6 символов' },
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Подтвердите пароль" size="large" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={isLoading}>
          Сохранить пароль
        </Button>
      </Form.Item>

      <div style={{ textAlign: 'center' }}>
        <Link to="/login">Вернуться к входу</Link>
      </div>
    </Form>
    </>
  );
}
