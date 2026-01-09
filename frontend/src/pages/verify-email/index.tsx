import { useEffect, useState } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { Result, Button, Spin } from 'antd';
import { authApi } from '@/shared/api';

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token');
  const finalToken = token || tokenFromQuery;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      if (!finalToken) {
        setStatus('error');
        setMessage('Токен не найден');
        return;
      }

      try {
        await authApi.verifyEmail(finalToken);
        setStatus('success');
        setMessage('Ваш email успешно подтверждён!');
      } catch {
        setStatus('error');
        setMessage('Ссылка недействительна или устарела');
      }
    };

    verify();
  }, [finalToken]);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" tip="Подтверждаем email..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 20 }}>
      <Result
        status={status === 'success' ? 'success' : 'error'}
        title={status === 'success' ? 'Email подтверждён!' : 'Ошибка'}
        subTitle={message}
        extra={
          <Link to="/dashboard">
            <Button type="primary">
              {status === 'success' ? 'Перейти в приложение' : 'На главную'}
            </Button>
          </Link>
        }
      />
    </div>
  );
}
