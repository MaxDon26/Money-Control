import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Начало работы',
      items: [
        'getting-started/installation',
        'getting-started/configuration',
        'getting-started/running',
      ],
    },
    {
      type: 'category',
      label: 'Архитектура',
      items: [
        'architecture/overview',
        'architecture/frontend',
        'architecture/backend',
        'architecture/database',
      ],
    },
    {
      type: 'category',
      label: 'Разработка',
      items: [
        'development/frontend',
        'development/backend',
        'development/database',
        'development/testing',
      ],
    },
    {
      type: 'category',
      label: 'Функциональность',
      items: [
        'features/accounts',
        'features/transactions',
        'features/categories',
        'features/budgets',
        'features/recurring',
        'features/analytics',
      ],
    },
  ],
  apiSidebar: [
    'api/overview',
    {
      type: 'category',
      label: 'Аутентификация',
      items: [
        'api/auth/register',
        'api/auth/login',
        'api/auth/refresh',
      ],
    },
    {
      type: 'category',
      label: 'Счета',
      items: [
        'api/accounts/list',
        'api/accounts/create',
        'api/accounts/update',
      ],
    },
    {
      type: 'category',
      label: 'Транзакции',
      items: [
        'api/transactions/list',
        'api/transactions/create',
        'api/transactions/filters',
      ],
    },
    {
      type: 'category',
      label: 'Аналитика',
      items: [
        'api/analytics/summary',
        'api/analytics/by-category',
        'api/analytics/trend',
      ],
    },
  ],
};

export default sidebars;
