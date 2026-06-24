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
          <img 
            className="header__logo" 
            src="/logos/i2.png" 
            alt="ProgyNovaAI Logo" 
            width="28" 
            height="28"
            style={{ borderRadius: '6px', objectFit: 'contain' }}
          />
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
