import { Outlet } from 'react-router-dom';
import { Layout, theme } from 'antd';

const { Content } = Layout;

export function AuthLayout() {
  const { token } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content
        role="main"
        aria-label="Авторизация"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            padding: 32,
            background: token.colorBgContainer,
            borderRadius: token.borderRadius,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <header
            style={{
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            <h1 style={{ fontSize: 28, fontWeight: 'bold', color: token.colorPrimary, margin: 0 }}>
              Money Control
            </h1>
            <p style={{ color: token.colorTextSecondary, marginTop: 8 }} aria-label="Слоган">
              Контроль доходов и расходов
            </p>
          </header>
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
}
