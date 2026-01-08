import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Money Control',
  tagline: 'Документация приложения для контроля личных финансов',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://money-control.app',
  baseUrl: '/docs/',

  organizationName: 'money-control',
  projectName: 'money-control',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'ru',
    locales: ['ru'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Money Control',
      logo: {
        alt: 'Money Control Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Документация',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API',
        },
        {
          href: 'http://localhost:4000/api/docs',
          label: 'Swagger',
          position: 'right',
        },
        {
          href: 'http://localhost:3000',
          label: 'Приложение',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Документация',
          items: [
            {
              label: 'Начало работы',
              to: '/',
            },
            {
              label: 'Архитектура',
              to: '/architecture/overview',
            },
            {
              label: 'API',
              to: '/api/overview',
            },
          ],
        },
        {
          title: 'Разработка',
          items: [
            {
              label: 'Frontend',
              to: '/development/frontend',
            },
            {
              label: 'Backend',
              to: '/development/backend',
            },
            {
              label: 'База данных',
              to: '/development/database',
            },
          ],
        },
        {
          title: 'Ссылки',
          items: [
            {
              label: 'Swagger API',
              href: 'http://localhost:4000/api/docs',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/money-control/money-control',
            },
          ],
        },
      ],
      copyright: `Money Control ${new Date().getFullYear()}. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'json', 'sql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
