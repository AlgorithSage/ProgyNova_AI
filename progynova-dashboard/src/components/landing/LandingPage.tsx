import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import './LandingPage.css';

interface LandingPageProps {
  onViewChange: (view: 'dashboard' | 'metrics' | 'docs') => void;
}

/* Window-viewer showcase cards — each frames a real screenshot of a live
   ProgyNova AI component with a plain-language explanation of what it does. */
const SHOWCASE = [
  {
    img: '/screenshots/csv-uploader.png',
    file: 'Upload Dataset',
    title: 'Bring your own data — or try ours',
    body:
      'Drop a pharmacy transaction CSV straight into the dashboard, or click "Use Preloaded Owner Dataset" to explore instantly with a synthetic sample. The AutoSchemaEngine reads your column layout automatically — there is no manual mapping step.',
  },
  {
    img: '/screenshots/forecast-chart.png',
    file: 'Demand Forecast',
    title: 'See predicted demand against reality',
    body:
      'The forecast chart overlays the model’s predicted demand (lime) on your real historical sales (dark). Filter by any SKU and location to inspect a single product’s trend across weeks.',
  },
  {
    img: '/screenshots/alerts-table.png',
    file: 'Stockout Alerts',
    title: 'A ranked list of what will run out',
    body:
      'Every at-risk product and location is sorted by severity, with the exact projected deficit and a recommended reorder quantity. Export the whole list to a spreadsheet in one click to place orders.',
  },
  {
    img: '/screenshots/shap-explainer.png',
    file: "What's driving this forecast?",
    title: 'Understand every prediction',
    body:
      'For any item, the explainer shows the top factors pushing demand up or down in clear language — recent sales velocity, seasonality, store size — alongside a concrete action plan. It is never a black box.',
  },
];

/* Three-step getting-started flow, written for a first-time researcher. */
const STEPS = [
  {
    n: '01',
    title: 'Load your data',
    body:
      'Upload a transaction CSV, or start with our preloaded sample. ProgyNova accepts wide-form or long-form tables and can join several related files (sales, drugs, stores) for you.',
  },
  {
    n: '02',
    title: 'Choose how cautious to be',
    body:
      'Pick a sensitivity mode — Strict, Balanced, or Clinical Safe — based on how costly a missed stockout is for that medicine. Switch anytime and results recalculate instantly.',
  },
  {
    n: '03',
    title: 'Read forecasts, alerts & the "why"',
    body:
      'Review predicted demand per SKU and location, a ranked list of stockout risks, and a plain-language explanation behind each forecast. Export an order sheet when you are ready.',
  },
];

export function LandingPage({ onViewChange }: LandingPageProps) {
  // Lenis smooth scrolling — active only while the landing page is mounted.
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="landing-page">
      {/* ── Navigation Header ──────────────────── */}
      <header className="landing-page__nav">
        <div className="landing-page__brand">
          <div className="landing-page__brand-logo-container">
            <img 
              className="landing-page__brand-logo" 
              src="/logos/i3.png" 
              alt="ProgyNovaAI Logo" 
              style={{ height: '24px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </div>
        </div>
        <nav className="landing-page__links">
          <button onClick={() => onViewChange('metrics')} className="landing-nav-link">ML Metrics</button>
          <button onClick={() => onViewChange('docs')} className="landing-nav-link">Help & Docs</button>
          <button onClick={() => onViewChange('dashboard')} className="btn btn--primary btn-nav-cta">
            Launch Dashboard
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '4px' }}>
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </nav>
      </header>

      {/* ── Main Landing Layout ────────────────── */}
      <main className="landing-page__main">
        {/* Hero fold - occupies exactly 100vh height */}
        <section className="landing-hero" aria-label="Welcome section">
          <div className="landing-hero__card">
            {/* Dark inner card containing logo image */}
            <div className="landing-hero__inner-card">
              <img 
                className="landing-hero__logo-img" 
                src="/logos/i3.png" 
                alt="ProgyNova AI Logo" 
              />
            </div>
            
            {/* SaaS value proposition text */}
            <p className="landing-hero__description">
              A B2B SaaS platform utilizing cost-sensitive machine learning to forecast demand and prevent stockouts in pharmacy retail networks.
            </p>
            
            {/* Launch App Call to Action inside the card */}
            <button
              className="btn-hero-cta"
              onClick={() => onViewChange('dashboard')}
            >
              <svg
                className="svgIcon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                <path d="m8.5 8.5 7 7" />
              </svg>
              Launch Forecasting Dashboard
            </button>
          </div>
        </section>

        {/* Core Product Capabilities Grid */}
        <section className="landing-features" aria-label="Core Capabilities">
          <div className="landing-features__intro">
            <span className="landing-section__eyebrow">Why ProgyNova</span>
            <h2 className="landing-section__heading">Powerful where it matters, simple where it counts</h2>
            <p className="landing-section__lead">
              Four ideas do the heavy lifting — so you get reliable forecasts without the complexity.
            </p>
          </div>

          <div className="landing-features__grid">
            {/* Card 1: Safety-first forecasting */}
            <div className="landing-feature-card">
              <div className="landing-feature-card__icon-container">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <h3>Safety-first forecasting</h3>
              <p>The model treats a missed stockout as far more serious than over-ordering, so it reliably catches the rare shortages that put patients at risk.</p>
            </div>

            {/* Card 2: Adjustable caution */}
            <div className="landing-feature-card">
              <div className="landing-feature-card__icon-container">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                </svg>
              </div>
              <h3>Adjustable caution</h3>
              <p>Switch between Strict, Balanced, and Clinical&nbsp;Safe modes to match how critical each medicine is. Results update instantly.</p>
            </div>

            {/* Card 3: Clear explanations */}
            <div className="landing-feature-card">
              <div className="landing-feature-card__icon-container">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18h6" /><path d="M10 22h4" />
                  <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
                </svg>
              </div>
              <h3>Clear explanations</h3>
              <p>Every forecast comes with the top reasons behind it, written in plain language — so you can trust the number, not just take it on faith.</p>
            </div>

            {/* Card 4: Flexible data upload */}
            <div className="landing-feature-card">
              <div className="landing-feature-card__icon-container">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3>Flexible data upload</h3>
              <p>Upload almost any CSV layout. ProgyNova detects the dates, products, and quantities for you — there is no manual setup or cleaning.</p>
            </div>
          </div>
        </section>

        {/* ── How It Works — 3-step getting-started tutorial ───────────── */}
        <section className="landing-howto" aria-label="How to use ProgyNova AI">
          <div className="landing-howto__intro">
            <span className="landing-section__eyebrow">Getting started</span>
            <h2 className="landing-section__heading">From raw CSV to actionable forecast in three steps</h2>
            <p className="landing-section__lead">
              ProgyNova AI is built for analysts and researchers — no data-science setup required.
              Here is the entire workflow.
            </p>
          </div>
          <ol className="landing-steps">
            {STEPS.map((s) => (
              <li className="landing-step" key={s.n}>
                <span className="landing-step__num">{s.n}</span>
                <h3 className="landing-step__title">{s.title}</h3>
                <p className="landing-step__body">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Visual Showcase — glassmorphic window-viewer cards ───────── */}
        <section className="landing-showcase" aria-label="See ProgyNova AI in action">
          <div className="landing-showcase__intro">
            <span className="landing-section__eyebrow">A look inside</span>
            <h2 className="landing-section__heading">See exactly how the dashboard works</h2>
            <p className="landing-section__lead">
              Real screens from the live application — each panel explained in plain language.
            </p>
          </div>

          <div className="landing-showcase__list">
            {SHOWCASE.map((item, i) => (
              <article
                className={`showcase-row ${i % 2 === 1 ? 'showcase-row--reverse' : ''}`}
                key={item.file}
              >
                {/* Glass window-viewer framing a real screenshot */}
                <div className="window-card">
                  <div className="window-card__bar">
                    <span className="window-card__dot window-card__dot--red" />
                    <span className="window-card__dot window-card__dot--amber" />
                    <span className="window-card__dot window-card__dot--green" />
                    <span className="window-card__file">{item.file}</span>
                  </div>
                  <div className="window-card__viewport">
                    <img src={item.img} alt={`${item.title} — ProgyNova AI screenshot`} loading="lazy" />
                  </div>
                </div>

                {/* Explanation */}
                <div className="showcase-row__copy">
                  <span className="showcase-row__step">Step {String(i + 1).padStart(2, '0')}</span>
                  <h3 className="showcase-row__title">{item.title}</h3>
                  <p className="showcase-row__body">{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Dataset Guide — what the data should look like ───────────── */}
        <section className="landing-dataset" aria-label="Preparing your dataset">
          <div className="landing-dataset__card">
            <div className="landing-dataset__text">
              <span className="landing-section__eyebrow">Your data</span>
              <h2 className="landing-section__heading">What a dataset should look like</h2>
              <p className="landing-section__lead">
                If your export contains roughly these fields, ProgyNova can work with it.
                Column names do not need to match exactly — the AutoSchemaEngine detects each role by meaning.
              </p>
              <ul className="landing-dataset__notes">
                <li>Upload <strong>wide-form or long-form</strong> CSVs — both are supported.</li>
                <li>Split across multiple files? Upload <strong>sales, drugs and stores</strong> together and they are joined automatically.</li>
                <li>Up to <strong>10&nbsp;MB</strong> per file. No pre-cleaning or column renaming needed.</li>
              </ul>
            </div>
            <ul className="landing-dataset__fields">
              {[
                ['Date / week', 'When each transaction happened'],
                ['Product / SKU', 'Identifier for the medicine'],
                ['Store / location', 'Where it was sold or dispensed'],
                ['Units sold', 'Quantity dispensed that period'],
                ['Stock on hand', 'Current inventory level'],
                ['Lead time', 'Supplier delivery delay (optional)'],
              ].map(([k, v]) => (
                <li className="landing-dataset__field" key={k}>
                  <span className="landing-dataset__field-key">{k}</span>
                  <span className="landing-dataset__field-desc">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── ML Metrics pointer — no metrics on the landing page ──────── */}
        <section className="landing-metrics-cta" aria-label="Model performance metrics">
          <div className="landing-metrics-cta__inner">
            <div>
              <h2 className="landing-metrics-cta__title">Looking for the model’s accuracy?</h2>
              <p className="landing-metrics-cta__body">
                Validation metrics — MAPE, ROC-AUC, precision &amp; recall, confusion matrices and
                model comparisons — live on the dedicated <strong>ML Metrics</strong> page inside the
                dashboard, and update against the data you upload.
              </p>
            </div>
            <button className="btn-hero-cta landing-metrics-cta__btn" onClick={() => onViewChange('metrics')}>
              <svg
                className="svgIcon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              View ML Metrics
            </button>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────── */}
      <footer className="landing-page__footer">
        <p>&copy; {new Date().getFullYear()} ProgyNova AI. All rights reserved. Clinical Stockout Prediction Dashboard.</p>
      </footer>
    </div>
  );
}
