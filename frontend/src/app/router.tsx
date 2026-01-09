/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/widgets/layouts/MainLayout';
import { AuthLayout } from '@/widgets/layouts/AuthLayout';
import { ProtectedRoute, GuestRoute } from '@/features/auth';

// Lazy load pages
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';

const LoginPage = lazy(() => import('@/pages/login'));
const RegisterPage = lazy(() => import('@/pages/register'));
const ForgotPasswordPage = lazy(() => import('@/pages/forgot-password'));
const ResetPasswordPage = lazy(() => import('@/pages/reset-password'));
const VerifyEmailPage = lazy(() => import('@/pages/verify-email'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const TransactionsPage = lazy(() => import('@/pages/transactions'));
const AccountsPage = lazy(() => import('@/pages/accounts'));
const CategoriesPage = lazy(() => import('@/pages/categories'));
const BudgetsPage = lazy(() => import('@/pages/budgets'));
const RecurringPage = lazy(() => import('@/pages/recurring'));
const AnalyticsPage = lazy(() => import('@/pages/analytics'));
const SettingsPage = lazy(() => import('@/pages/settings'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
);

const withSuspense = (Component: React.LazyExoticComponent<() => React.JSX.Element | null>) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: (
      <GuestRoute>
        <AuthLayout />
      </GuestRoute>
    ),
    children: [
      { path: '/login', element: withSuspense(LoginPage) },
      { path: '/register', element: withSuspense(RegisterPage) },
      { path: '/forgot-password', element: withSuspense(ForgotPasswordPage) },
      { path: '/reset-password', element: withSuspense(ResetPasswordPage) },
      { path: '/verify-email/:token', element: withSuspense(VerifyEmailPage) },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: withSuspense(DashboardPage) },
      { path: '/transactions', element: withSuspense(TransactionsPage) },
      { path: '/accounts', element: withSuspense(AccountsPage) },
      { path: '/categories', element: withSuspense(CategoriesPage) },
      { path: '/budgets', element: withSuspense(BudgetsPage) },
      { path: '/recurring', element: withSuspense(RecurringPage) },
      { path: '/analytics', element: withSuspense(AnalyticsPage) },
      { path: '/settings', element: withSuspense(SettingsPage) },
    ],
  },
]);
