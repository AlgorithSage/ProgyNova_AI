export interface ThemeVariables {
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderHover: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryGradient: string;
  secondary: string;
  accent: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;
  glassBg: string;
  glassBorder: string;
  glassBlur: string;
  chartPrimary: string;
  chartSecondary: string;
  chartGradientStart: string;
  chartGradientEnd: string;
  chartPositive: string;
  chartNegative: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowXl: string;
  shadowGlow: string;
  fontSans: string;
  fontNumber: string;
  fontMono: string;
  cardBg: string;
  cardSurface: string;
  cardElevated: string;
  cardBorder: string;
  cardText: string;
  cardTextSecondary: string;
  cardTextTertiary: string;
}

export const lightTheme: ThemeVariables = {
  bg: '#FAFAF7', // Warm White
  surface: '#FFFFFF', // Pure White
  surfaceElevated: '#F5F5F5', // Soft Grey
  border: '#E0E0E0', // Light Grey
  borderHover: '#CCCCCC',
  textPrimary: '#1A1A1A', // Near Black
  textSecondary: '#616161', // Grey
  textTertiary: '#9E9E9E',
  primary: '#FFEB3B', // Vibrant Canary Yellow (Much Yellower)
  primaryHover: '#FFF176', // Lighter Canary Yellow
  primaryLight: 'rgba(255, 235, 59, 0.08)',
  primaryGradient: 'linear-gradient(135deg, #FFEB3B, #FFF59D)', // Light Gradient Yellow
  secondary: '#3949AB', // Indigo Blue
  accent: '#29B6F6', // Sky Blue
  success: '#2E7D32',
  successLight: 'rgba(46, 125, 50, 0.08)',
  warning: '#F57F17',
  warningLight: 'rgba(245, 127, 23, 0.08)',
  error: '#C62828',
  errorLight: 'rgba(198, 40, 40, 0.08)',
  info: '#3949AB',
  infoLight: 'rgba(57, 73, 171, 0.08)',
  glassBg: 'rgba(255, 255, 255, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.4)',
  glassBlur: '16px',
  chartPrimary: '#FFEB3B',
  chartSecondary: '#29B6F6', // Sky Blue
  chartGradientStart: 'rgba(255, 235, 59, 0.15)',
  chartGradientEnd: 'rgba(255, 235, 59, 0.0)',
  chartPositive: '#29B6F6',
  chartNegative: '#E0E0E0',
  shadowSm: '0 2px 8px rgba(97, 97, 97, 0.03)',
  shadowMd: '0 10px 30px rgba(97, 97, 97, 0.05)',
  shadowLg: '0 20px 40px rgba(97, 97, 97, 0.08)',
  shadowXl: '0 24px 48px rgba(97, 97, 97, 0.1)',
  shadowGlow: '0 0 15px rgba(255, 235, 59, 0.2)',
  fontSans: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  fontNumber: "'Inter', system-ui, -apple-system, sans-serif",
  fontMono: "'Google Sans', 'Product Sans', system-ui, -apple-system, sans-serif",
  // Premium black-and-yellow surface — used by spotlight cards (uploader, SHAP panel)
  // that intentionally stay dark regardless of light/dark mode. Fixed hierarchy,
  // not theme-dependent: cardBg = prominent cards, cardSurface = buttons/secondary
  // widgets, cardElevated = content nested inside a card.
  cardBg: '#181818',
  cardSurface: '#303030',
  cardElevated: '#494949',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  cardText: '#F5F7FA',
  cardTextSecondary: '#B0BEC5',
  cardTextTertiary: '#78909C',
};

export const darkTheme: ThemeVariables = {
  bg: '#181818', // Obsidian Black
  surface: '#303030', // Dark Slate
  surfaceElevated: '#494949', // Carbon Grey
  border: '#263238', // Slate Blue Grey
  borderHover: '#37474F',
  textPrimary: '#F5F7FA', // Soft White
  textSecondary: '#B0BEC5', // Cool Grey
  textTertiary: '#78909C',
  primary: '#FFEB3B', // Vibrant Canary Yellow (Much Yellower)
  primaryHover: '#FFF59D', // Lighter Canary Yellow
  primaryLight: 'rgba(255, 235, 59, 0.12)',
  primaryGradient: 'linear-gradient(135deg, #FFEB3B, #FFF9C4)', // Light Gradient Yellow
  secondary: '#4FC3F7', // Electric Blue
  accent: '#00BCD4', // Cyan
  success: '#00E676',
  successLight: 'rgba(0, 230, 118, 0.12)',
  warning: '#FFD600',
  warningLight: 'rgba(255, 214, 0, 0.12)',
  error: '#FF1744',
  errorLight: 'rgba(255, 23, 68, 0.12)',
  info: '#4FC3F7',
  infoLight: 'rgba(79, 195, 247, 0.12)',
  glassBg: 'rgba(19, 26, 38, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBlur: '20px',
  chartPrimary: '#FFEB3B',
  chartSecondary: '#00BCD4', // Cyan
  chartGradientStart: 'rgba(255, 235, 59, 0.25)',
  chartGradientEnd: 'rgba(255, 235, 59, 0.0)',
  chartPositive: '#00BCD4',
  chartNegative: '#263238',
  shadowSm: '0 2px 8px rgba(0, 0, 0, 0.3)',
  shadowMd: '0 10px 30px rgba(0, 0, 0, 0.4)',
  shadowLg: '0 20px 40px rgba(0, 0, 0, 0.5)',
  shadowXl: '0 24px 48px rgba(0, 0, 0, 0.6)',
  shadowGlow: '0 0 20px rgba(255, 235, 59, 0.25)',
  fontSans: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  fontNumber: "'Inter', system-ui, -apple-system, sans-serif",
  fontMono: "'Google Sans', 'Product Sans', system-ui, -apple-system, sans-serif",
  cardBg: '#181818',
  cardSurface: '#303030',
  cardElevated: '#494949',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  cardText: '#F5F7FA',
  cardTextSecondary: '#B0BEC5',
  cardTextTertiary: '#78909C',
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};

export function applyTheme(themeName: 'light' | 'dark') {
  const t = themes[themeName] || lightTheme;
  const root = document.documentElement;

  root.style.setProperty('--bg', t.bg);
  root.style.setProperty('--surface', t.surface);
  root.style.setProperty('--surface-elevated', t.surfaceElevated);
  root.style.setProperty('--border', t.border);
  root.style.setProperty('--border-hover', t.borderHover);
  root.style.setProperty('--text-primary', t.textPrimary);
  root.style.setProperty('--text-secondary', t.textSecondary);
  root.style.setProperty('--text-tertiary', t.textTertiary);
  root.style.setProperty('--primary', t.primary);
  root.style.setProperty('--primary-hover', t.primaryHover);
  root.style.setProperty('--primary-light', t.primaryLight);
  root.style.setProperty('--primary-gradient', t.primaryGradient);
  root.style.setProperty('--secondary', t.secondary);
  root.style.setProperty('--accent', t.accent);
  root.style.setProperty('--success', t.success);
  root.style.setProperty('--success-light', t.successLight);
  root.style.setProperty('--warning', t.warning);
  root.style.setProperty('--warning-light', t.warningLight);
  root.style.setProperty('--error', t.error);
  root.style.setProperty('--error-light', t.errorLight);
  root.style.setProperty('--info', t.info);
  root.style.setProperty('--info-light', t.infoLight);
  root.style.setProperty('--glass-bg', t.glassBg);
  root.style.setProperty('--glass-border', t.glassBorder);
  root.style.setProperty('--glass-blur', t.glassBlur);
  root.style.setProperty('--chart-primary', t.chartPrimary);
  root.style.setProperty('--chart-secondary', t.chartSecondary);
  root.style.setProperty('--chart-gradient-start', t.chartGradientStart);
  root.style.setProperty('--chart-gradient-end', t.chartGradientEnd);
  root.style.setProperty('--chart-positive', t.chartPositive);
  root.style.setProperty('--chart-negative', t.chartNegative);
  root.style.setProperty('--shadow-sm', t.shadowSm);
  root.style.setProperty('--shadow-md', t.shadowMd);
  root.style.setProperty('--shadow-lg', t.shadowLg);
  root.style.setProperty('--shadow-xl', t.shadowXl);
  root.style.setProperty('--shadow-glow', t.shadowGlow);
  root.style.setProperty('--font-sans', t.fontSans);
  root.style.setProperty('--font-number', t.fontNumber);
  root.style.setProperty('--font-mono', t.fontMono);
  root.style.setProperty('--card-bg', t.cardBg);
  root.style.setProperty('--card-surface', t.cardSurface);
  root.style.setProperty('--card-elevated', t.cardElevated);
  root.style.setProperty('--card-border', t.cardBorder);
  root.style.setProperty('--card-text', t.cardText);
  root.style.setProperty('--card-text-secondary', t.cardTextSecondary);
  root.style.setProperty('--card-text-tertiary', t.cardTextTertiary);
}
