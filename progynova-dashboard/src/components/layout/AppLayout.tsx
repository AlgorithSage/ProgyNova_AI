import type { ReactNode } from 'react';
import { Header } from './Header';
import type { Theme } from '../../types';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
  theme: Theme;
  onToggleTheme: () => void;
  isConnected: boolean;
}

export function AppLayout({ children, theme, onToggleTheme, isConnected }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <a href="#main-content" className="sr-only">
        Skip to main content
      </a>
      <Header
        theme={theme}
        onToggleTheme={onToggleTheme}
        isConnected={isConnected}
      />
      <main id="main-content" className="app-layout__main" role="main">
        <div className="app-layout__container">
          {children}
        </div>
      </main>
    </div>
  );
}
