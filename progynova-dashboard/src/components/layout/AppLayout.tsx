import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';
import type { Theme } from '../../types';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
  theme: Theme;
  onToggleTheme: () => void;
  isConnected: boolean;
  alertsCount?: number;
  criticalCount?: number;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function AppLayout({
  children,
  theme,
  onToggleTheme,
  isConnected,
  alertsCount = 0,
  criticalCount = 0,
  searchQuery = '',
  onSearchChange,
}: AppLayoutProps) {
  return (
    <div className="app-layout">
      {/* ── Skip Link ──────────────────────────── */}
      <a href="#main-content" className="sr-only">
        Skip to main content
      </a>

      {/* ── Left Sidebar ────────────────────────── */}
      <aside className="app-layout__sidebar" role="complementary">
        <div className="app-layout__brand">
          <svg className="app-layout__logo" width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" className="app-layout__logo-rect" />
            <path d="M8 20V8h3.5c1.4 0 2.5.4 3.3 1.1.8.8 1.2 1.8 1.2 3.1s-.4 2.3-1.2 3.1c-.8.7-1.9 1.1-3.3 1.1H10.5V20H8z" className="app-layout__logo-path" />
            <path d="M17 20V8h2.5v12H17z" className="app-layout__logo-path" opacity="0.7" />
          </svg>
          <span className="app-layout__brand-title">ProgyNovaAI</span>
        </div>

        <nav className="app-layout__menu-group" aria-label="Main menu">
          <span className="app-layout__menu-title">Menu</span>
          <ul className="app-layout__menu-list">
            <li>
              <a href="#dashboard" className="app-layout__menu-link app-layout__menu-link--active">
                <span className="app-layout__menu-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="9" />
                    <rect x="14" y="3" width="7" height="5" />
                    <rect x="14" y="12" width="7" height="9" />
                    <rect x="3" y="16" width="7" height="5" />
                  </svg>
                  Dashboard
                </span>
              </a>
            </li>
            <li>
              <a href="#alerts" className="app-layout__menu-link">
                <span className="app-layout__menu-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Alerts
                </span>
                {alertsCount > 0 && (
                  <span className={`app-layout__menu-badge ${criticalCount > 0 ? 'app-layout__menu-badge--critical' : ''}`}>
                    {alertsCount}
                  </span>
                )}
              </a>
            </li>
            <li>
              <a href="#forecast" className="app-layout__menu-link">
                <span className="app-layout__menu-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3v18h18" />
                    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                  </svg>
                  Forecast
                </span>
              </a>
            </li>
            <li>
              <a href="#explain" className="app-layout__menu-link">
                <span className="app-layout__menu-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Drivers
                </span>
              </a>
            </li>
          </ul>
        </nav>

        <nav className="app-layout__menu-group" aria-label="General options">
          <span className="app-layout__menu-title">General</span>
          <ul className="app-layout__menu-list">
            <li>
              <a href="#settings" className="app-layout__menu-link">
                <span className="app-layout__menu-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Settings
                </span>
              </a>
            </li>
            <li>
              <a href="#main-content" className="app-layout__menu-link">
                <span className="app-layout__menu-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  Help & Docs
                </span>
              </a>
            </li>
          </ul>
        </nav>

        {/* Promo card bottom block */}
        <div className="app-layout__promo-card">
          <span className="app-layout__promo-title">Powering Demand Intel</span>
          <p className="app-layout__promo-text">Use ProgyNovaAI's driver explainers to prevent future stockouts.</p>
          <a href="#explain" className="app-layout__promo-btn">Analyze Drivers</a>
        </div>
      </aside>

      {/* ── Content Area ────────────────────────── */}
      <div className="app-layout__content">
        {/* Topbar Header */}
        <header className="app-layout__topbar" role="banner">
          <div className="app-layout__search-wrapper">
            <svg className="app-layout__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="app-layout__search-input"
              placeholder="Search SKU or location..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              aria-label="Search items"
            />
            <span className="app-layout__search-shortcut">⌘F</span>
          </div>

          <div className="app-layout__actions">
            {/* Status indicators */}
            <div className="app-layout__icon-btn" title={isConnected ? 'Backend Status: FastAPI Online' : 'Backend Status: Offline'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span className={`app-layout__status-dot ${isConnected ? 'app-layout__status-dot--connected' : 'app-layout__status-dot--offline'}`} />
            </div>

            <div className="app-layout__icon-btn" title="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>

            {/* Dynamic theme toggle */}
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />

            {/* Profile Info block */}
            <div className="app-layout__profile">
              <div className="app-layout__avatar-container">
                <img
                  className="app-layout__avatar"
                  src="/user_avatar.png"
                  alt="Chief Pharmacist Profile"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent && !parent.querySelector('.app-layout__avatar-fallback')) {
                      const span = document.createElement('span');
                      span.className = 'app-layout__avatar-fallback';
                      span.innerText = 'CP';
                      parent.appendChild(span);
                    }
                  }}
                />
              </div>
              <div className="app-layout__profile-info">
                <span className="app-layout__profile-name">Chief Pharmacist</span>
                <span className="app-layout__profile-email">pharmacist@progynova.ai</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main id="main-content" className="app-layout__main" role="main">
          <div className="app-layout__container">{children}</div>
        </main>
      </div>
    </div>
  );
}
