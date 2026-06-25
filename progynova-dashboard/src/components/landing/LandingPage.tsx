import './LandingPage.css';

interface LandingPageProps {
  onViewChange: (view: 'dashboard' | 'metrics' | 'docs') => void;
}

export function LandingPage({ onViewChange }: LandingPageProps) {
  return (
    <div className="landing-page">
      {/* ── Navigation Header ──────────────────── */}
      <header className="landing-page__nav">
        <div className="landing-page__brand">
          <img 
            className="landing-page__brand-logo" 
            src="/logos/i3.png" 
            alt="ProgyNovaAI Logo" 
            style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
          />
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
              className="btn btn--primary btn-hero-cta" 
              onClick={() => onViewChange('dashboard')}
            >
              Open Forecasting Dashboard
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '8px' }}>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </section>

        {/* Core Product Capabilities Grid - Scrolls up via parallax fixed background */}
        <section className="landing-features" aria-label="Core Capabilities">
          <div className="landing-features__grid">
            {/* Card 1: Cost-Sensitive ML Core */}
            <div className="landing-feature-card">
              <div className="landing-feature-card__icon-container">
                <span style={{ fontSize: '1.4rem', fontWeight: '800', lineHeight: 1 }}>$</span>
              </div>
              <h3>Cost-Sensitive ML Core</h3>
              <p>Forces forecasting models to prioritize clinical safety by weighting actual stockout observations 115.2x higher during splitting cycles.</p>
            </div>

            {/* Card 2: Asymmetric Adjustments */}
            <div className="landing-feature-card">
              <div className="landing-feature-card__icon-container">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <h3>Asymmetric Adjustments</h3>
              <p>Dynamically transition boundaries across Strict, Balanced, and Clinical Safe sensitivity levels to optimize capital efficiency.</p>
            </div>

            {/* Card 3: TreeSHAP Explainability */}
            <div className="landing-feature-card">
              <div className="landing-feature-card__icon-container">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3>TreeSHAP Explainability</h3>
              <p>Get full explainability into predicted demand surges in under 15ms. Discover local positive and negative demand drivers instantly.</p>
            </div>

            {/* Card 4: Agnostic Ingestion Engine */}
            <div className="landing-feature-card">
              <div className="landing-feature-card__icon-container">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3>Agnostic Ingestion Engine</h3>
              <p>Upload varied CSV structures dynamically. AutoSchemaEngine binds temporal, relational, and sales parameters automatically.</p>
            </div>
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
