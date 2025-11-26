// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'TestWeaver Dokümantasyonu',
  tagline: 'Context tabanlı otomatik test üretim sistemi',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://meftunca.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/Specula-test-engine/',

  // GitHub pages deployment config.
  organizationName: 'meftunca', // Usually your GitHub org/user name.
  projectName: 'Specula-test-engine', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Markdown configuration
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // Turkish language configuration
  i18n: {
    defaultLocale: 'tr',
    locales: ['tr'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          // Edit this page links to the repo
          editUrl:
            'https://github.com/meftunca/Specula-test-engine/tree/main/docs/',
        },
        blog: false, // Disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  // Search plugin
  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        hashed: true,
        language: ["tr", "en"],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        indexDocs: true,
        indexBlog: false,
        indexPages: false,
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Social card
      image: 'img/testweaver-social-card.jpg',
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'TestWeaver',
        logo: {
          alt: 'TestWeaver Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Dokümantasyon',
          },
          {
            href: 'https://github.com/meftunca/Specula-test-engine',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Dokümantasyon',
            items: [
              {
                label: 'Genel Bakış',
                to: '/docs/intro',
              },
              {
                label: 'DSL Spesifikasyonu',
                to: '/docs/dsl-spec',
              },
              {
                label: 'CLI Aracı',
                to: '/docs/cli-spec',
              },
            ],
          },
          {
            title: 'Spesifikasyonlar',
            items: [
              {
                label: 'IR Spesifikasyonu',
                to: '/docs/ir-spec',
              },
              {
                label: 'Generator Spesifikasyonu',
                to: '/docs/generators-spec',
              },
              {
                label: 'Uygulama Planı',
                to: '/docs/implementation-plan',
              },
            ],
          },
          {
            title: 'Daha Fazla',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/meftunca/Specula-test-engine',
              },
              {
                label: 'NPM Paketi',
                href: 'https://www.npmjs.com/package/@testweaver/cli',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} TestWeaver. Docusaurus ile oluşturulmuştur.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'json', 'typescript', 'tsx', 'jsx'],
      },
    }),
};

export default config;
