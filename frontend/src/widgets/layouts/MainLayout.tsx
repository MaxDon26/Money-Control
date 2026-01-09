import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Space, Typography, Drawer, Grid } from 'antd';
import {
  DashboardOutlined,
  TransactionOutlined,
  WalletOutlined,
  TagsOutlined,
  PieChartOutlined,
  BarChartOutlined,
  SyncOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  BookOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore } from '@/entities/user';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const menuItems: MenuProps['items'] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Дашборд' },
  { key: '/transactions', icon: <TransactionOutlined />, label: 'Транзакции' },
  { key: '/accounts', icon: <WalletOutlined />, label: 'Счета' },
  { key: '/categories', icon: <TagsOutlined />, label: 'Категории' },
  { key: '/budgets', icon: <PieChartOutlined />, label: 'Бюджеты' },
  { key: '/recurring', icon: <SyncOutlined />, label: 'Регулярные' },
  { key: '/analytics', icon: <BarChartOutlined />, label: 'Аналитика' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Настройки' },
  { type: 'divider' },
  { key: '/docs/', icon: <BookOutlined />, label: 'Документация' },
];

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const { user, logout } = useAuthStore();
  const screens = useBreakpoint();

  // Мобильный режим: xs или sm (< 768px)
  const isMobile = !screens.md;

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: 'Профиль' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Выйти', danger: true },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = async ({ key }) => {
    if (key === 'logout') {
      await logout();
      navigate('/login');
    } else if (key === 'profile') {
      navigate('/settings');
    }
  };

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === '/docs/') {
      window.open('/docs/', '_blank');
    } else {
      navigate(key);
    }
    // Закрыть drawer на мобильном после навигации
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  // Содержимое меню (используется и в Sider, и в Drawer)
  const menuContent = (
    <>
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isMobile ? token.colorText : 'white',
          fontSize: collapsed && !isMobile ? 16 : 20,
          fontWeight: 'bold',
        }}
        aria-hidden="true"
      >
        {collapsed && !isMobile ? 'MC' : 'Money Control'}
      </div>
      <Menu
        theme={isMobile ? 'light' : 'dark'}
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        aria-label="Навигация по разделам"
      />
    </>
  );

  // Отступ контента: на мобильных 0, на десктопе зависит от collapsed
  const contentMarginLeft = isMobile ? 0 : (collapsed ? 80 : 200);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Skip to content link for keyboard users */}
      <a
        href="#main-content"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        onFocus={(e) => {
          e.currentTarget.style.left = '10px';
          e.currentTarget.style.top = '10px';
          e.currentTarget.style.width = 'auto';
          e.currentTarget.style.height = 'auto';
          e.currentTarget.style.padding = '8px 16px';
          e.currentTarget.style.background = '#1890ff';
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.zIndex = '9999';
          e.currentTarget.style.borderRadius = '4px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.left = '-9999px';
          e.currentTarget.style.width = '1px';
          e.currentTarget.style.height = '1px';
        }}
      >
        Перейти к содержимому
      </a>

      {/* Drawer для мобильных */}
      {isMobile && (
        <Drawer
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          width={250}
          styles={{ body: { padding: 0 } }}
          closeIcon={<CloseOutlined />}
        >
          {menuContent}
        </Drawer>
      )}

      {/* Sider для десктопа */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}
          role="navigation"
          aria-label="Главное меню"
        >
          {menuContent}
        </Sider>
      )}

      <Layout style={{ marginLeft: contentMarginLeft, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: isMobile ? '0 12px' : '0 24px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}
        >
          {isMobile ? (
            // Мобильная кнопка меню
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
              style={{ fontSize: 18, width: 48, height: 48 }}
              aria-label="Открыть меню"
            />
          ) : (
            // Десктопная кнопка свернуть/развернуть
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 64, height: 64 }}
              aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
              aria-expanded={!collapsed}
            />
          )}
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: token.colorPrimary }} size={isMobile ? 'small' : 'default'}>
                {user?.name?.[0]?.toUpperCase() || <UserOutlined />}
              </Avatar>
              {!isMobile && <Text>{user?.name || user?.email}</Text>}
            </Space>
          </Dropdown>
        </Header>
        <Content
          id="main-content"
          role="main"
          aria-label="Основное содержимое"
          tabIndex={-1}
          style={{
            margin: isMobile ? 12 : 24,
            padding: isMobile ? 12 : 24,
            background: token.colorBgContainer,
            borderRadius: token.borderRadius,
            minHeight: 'calc(100vh - 64px - 48px)',
            outline: 'none',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
