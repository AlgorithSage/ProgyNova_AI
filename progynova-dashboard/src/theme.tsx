// ============================================================
// ProgyNovaAI — 5-Color Theme System
// Palette: Peach #FFE6D8 · Dark Grey #545454 · White #FFFFFF ·
//          Black #000000 · Lime Green #c1ff72
// Every color below is one of these five hex values or an
// opacity/alpha variant of one of them (semantic status colors
// for success/warning/error/info are kept distinct on purpose).
// ============================================================

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
  bg: '#FFE6D8', // Peach canvas (40% dominant)
  surface: '#FFFFFF', // White card surfaces (15%)
  surfaceElevated: 'rgba(84, 84, 84, 0.05)', // Dark Grey wash for inputs/chips on white
  border: 'rgba(84, 84, 84, 0.25)',
  borderHover: 'rgba(84, 84, 84, 0.4)',
  textPrimary: '#000000', // Black typography (15%)
  textSecondary: '#545454',
  textTertiary: 'rgba(0, 0, 0, 0.45)',
  primary: '#c1ff72', // Lime Green accent (5%)
  primaryHover: 'rgba(193, 255, 114, 0.8)',
  primaryLight: 'rgba(193, 255, 114, 0.15)',
  primaryGradient: 'linear-gradient(135deg, #c1ff72, rgba(193, 255, 114, 0.55))',
  secondary: '#545454', // Dark Grey (25%) — panels/secondary structures
  accent: '#000000',
  success: '#2E7D32',
  successLight: 'rgba(46, 125, 50, 0.08)',
  warning: '#F57F17',
  warningLight: 'rgba(245, 127, 23, 0.08)',
  error: '#C62828',
  errorLight: 'rgba(198, 40, 40, 0.08)',
  info: '#545454',
  infoLight: 'rgba(84, 84, 84, 0.08)',
  glassBg: 'rgba(255, 255, 255, 0.75)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  glassBlur: '16px',
  chartPrimary: '#c1ff72', // Forecast line — high-energy accent
  chartSecondary: '#000000', // Actual demand — black on white chart surface
  chartGradientStart: 'rgba(193, 255, 114, 0.2)',
  chartGradientEnd: 'rgba(193, 255, 114, 0)',
  chartPositive: '#c1ff72',
  chartNegative: '#545454',
  shadowSm: '0 2px 8px rgba(0, 0, 0, 0.04)',
  shadowMd: '0 10px 30px rgba(0, 0, 0, 0.06)',
  shadowLg: '0 20px 40px rgba(0, 0, 0, 0.09)',
  shadowXl: '0 24px 48px rgba(0, 0, 0, 0.12)',
  shadowGlow: '0 0 15px rgba(193, 255, 114, 0.3)',
  fontSans: "'Vollkorn', Georgia, 'Times New Roman', serif",
  fontNumber: "'Roundo', system-ui, -apple-system, sans-serif",
  fontMono: "'Zodiak', Georgia, 'Times New Roman', serif",
  // Premium spotlight card surface — theme-independent (CSVUploader, SHAP panel,
  // recall card, headers/sidebar). Dark Grey is the panel base; nested pills and
  // wells sit on Black; text on top is White/Peach.
  cardBg: '#000000',
  cardSurface: '#000000',
  cardElevated: '#545454',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  cardText: '#FFFFFF',
  cardTextSecondary: '#FFE6D8',
  cardTextTertiary: 'rgba(255, 255, 255, 0.55)',
};

export const darkTheme: ThemeVariables = {
  bg: '#000000', // Black canvas
  surface: '#545454', // Dark Grey card surfaces
  surfaceElevated: 'rgba(255, 255, 255, 0.06)',
  border: 'rgba(255, 255, 255, 0.14)',
  borderHover: 'rgba(255, 255, 255, 0.24)',
  textPrimary: '#FFFFFF',
  textSecondary: '#FFE6D8',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  primary: '#c1ff72',
  primaryHover: 'rgba(193, 255, 114, 0.85)',
  primaryLight: 'rgba(193, 255, 114, 0.18)',
  primaryGradient: 'linear-gradient(135deg, #c1ff72, rgba(193, 255, 114, 0.5))',
  secondary: '#FFE6D8',
  accent: '#FFFFFF',
  success: '#00E676',
  successLight: 'rgba(0, 230, 118, 0.12)',
  warning: '#FFD600',
  warningLight: 'rgba(255, 214, 0, 0.12)',
  error: '#FF1744',
  errorLight: 'rgba(255, 23, 68, 0.12)',
  info: '#FFE6D8',
  infoLight: 'rgba(255, 230, 216, 0.1)',
  glassBg: 'rgba(0, 0, 0, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBlur: '20px',
  chartPrimary: '#c1ff72', // Forecast line — same high-energy accent in both modes
  chartSecondary: '#FFE6D8', // Actual demand — peach reads on the dark-grey chart surface
  chartGradientStart: 'rgba(193, 255, 114, 0.28)',
  chartGradientEnd: 'rgba(193, 255, 114, 0)',
  chartPositive: '#c1ff72',
  chartNegative: '#FFE6D8',
  shadowSm: '0 2px 8px rgba(0, 0, 0, 0.3)',
  shadowMd: '0 10px 30px rgba(0, 0, 0, 0.4)',
  shadowLg: '0 20px 40px rgba(0, 0, 0, 0.5)',
  shadowXl: '0 24px 48px rgba(0, 0, 0, 0.6)',
  shadowGlow: '0 0 20px rgba(193, 255, 114, 0.28)',
  fontSans: "'Vollkorn', Georgia, 'Times New Roman', serif",
  fontNumber: "'Roundo', system-ui, -apple-system, sans-serif",
  fontMono: "'Zodiak', Georgia, 'Times New Roman', serif",
  cardBg: '#000000',
  cardSurface: '#000000',
  cardElevated: '#545454',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  cardText: '#FFFFFF',
  cardTextSecondary: '#FFE6D8',
  cardTextTertiary: 'rgba(255, 255, 255, 0.55)',
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
