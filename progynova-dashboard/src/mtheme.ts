// Theme manager — re-exports the canonical 5-color theme definitions
// from theme.tsx so existing imports (e.g. `import { applyTheme } from './mtheme'`)
// keep working unchanged.
export type { ThemeVariables } from './theme';
export { lightTheme, darkTheme, themes, applyTheme } from './theme';
