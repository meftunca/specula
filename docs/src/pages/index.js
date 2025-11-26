import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Dokümantasyona Başla 🚀
          </Link>
        </div>
      </div>
    </header>
  );
}

function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className="col col--4">
            <div className="text--center padding-horiz--md">
              <h3>🎯 Context Tabanlı Tasarım</h3>
              <p>
                Form etiketine bağımlı olmayan, herhangi bir UI parçasını context ve scenario altında tanımlayabilen esnek mimari.
              </p>
            </div>
          </div>
          <div className="col col--4">
            <div className="text--center padding-horiz--md">
              <h3>⚡ Otomatik Test Üretimi</h3>
              <p>
                UI kodunuza küçük DSL parçaları ekleyerek Jest, Vitest, Cypress ve Playwright testlerini otomatik oluşturun.
              </p>
            </div>
          </div>
          <div className="col col--4">
            <div className="text--center padding-horiz--md">
              <h3>🔧 Multi-Framework Desteği</h3>
              <p>
                React, Vue, Svelte ve plain HTML projelerinde çalışan, framework bağımsız test üretim sistemi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Ana Sayfa"
      description="TestWeaver - Context tabanlı otomatik test üretim sistemi dokümantasyonu">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
