import { ThemeToggle } from './ThemeToggle';
import type { Theme } from '../../types';
import './Header.css';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  isConnected: boolean;
}

export function Header({ theme, onToggleTheme, isConnected }: HeaderProps) {
  return (
    <header className="header" role="banner">
      <div className="header__inner">
        <div className="header__brand">
          <svg className="header__logo" width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="var(--primary)" />
            <path d="M8 20V8h3.5c1.4 0 2.5.4 3.3 1.1.8.8 1.2 1.8 1.2 3.1s-.4 2.3-1.2 3.1c-.8.7-1.9 1.1-3.3 1.1H10.5V20H8z" fill="#fff" />
            <path d="M17 20V8h2.5v12H17z" fill="#fff" opacity="0.7" />
          </svg>
          <div className="header__title-group">
            <h1 className="header__title">ProgyNovaAI</h1>
            <span className="header__subtitle">Demand Intelligence</span>
          </div>
        </div>

        <nav className="header__nav" role="navigation" aria-label="Main navigation">
          <a href="#dashboard" className="header__nav-link header__nav-link--active">Dashboard</a>
          <a href="#forecast" className="header__nav-link">Forecast</a>
          <a href="#alerts" className="header__nav-link">Alerts</a>
          <a href="#explain" className="header__nav-link">Explain</a>
        </nav>

        <div className="header__actions">
          <span className={`header__status ${isConnected ? 'header__status--connected' : 'header__status--offline'}`}>
            <span className="header__status-dot" />
            {isConnected ? 'Connected' : 'No Backend'}
          </span>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}
