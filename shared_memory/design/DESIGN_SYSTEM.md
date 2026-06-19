# Design System

> **Status**: COMPLETED
> **Owner**: @DESIGN
> **Version**: 2.0

## Theme Strategy
Dual-mode theme system (Light + Dark) inspired by professional enterprise office apps (Google Workspace, Microsoft 365, AWS Console). Default follows system preference via `prefers-color-scheme`. User can manually toggle. Preference persisted to `localStorage`.

---

## Design Tokens

### Colors — Light Mode (Default)
Clean, neutral palette with accent colors for data visualization and status indicators:
- **Background**: `#FFFFFF` (Pure white canvas)
- **Surface**: `#F8F9FA` (Google-style light grey surface)
- **Surface Elevated**: `#FFFFFF` (Cards, modals — white with subtle shadow)
- **Border**: `#DADCE0` (Google-style neutral border)
- **Text Primary**: `#202124` (Near-black — Google standard)
- **Text Secondary**: `#5F6368` (Muted grey — Google standard)
- **Primary / Accent**: `#1A73E8` (Google Blue)
- **Primary Hover**: `#1557B0`
- **Secondary**: `#5F6368`
- **Success**: `#1E8E3E` (Google green — healthy stock)
- **Warning**: `#F9AB00` (Google amber — low stock alert)
- **Error / Critical**: `#D93025` (Google red — stockout risk)
- **Info**: `#1A73E8`
- **Chart Gradient Start**: `#1A73E8` (Blue)
- **Chart Gradient End**: `#E8F0FE` (Light blue fade)

### Colors — Dark Mode
Professional dark palette (AWS Console / Microsoft 365 Dark):
- **Background**: `#1B1B1F` (Rich dark — Microsoft-style)
- **Surface**: `#2B2B30` (Elevated dark surface)
- **Surface Elevated**: `#35353B` (Cards, modals)
- **Border**: `#3F3F46` (Subtle dark border)
- **Text Primary**: `#E4E4E7` (Soft white text)
- **Text Secondary**: `#A1A1AA` (Muted grey)
- **Primary / Accent**: `#4D90FE` (Bright blue — high contrast on dark)
- **Primary Hover**: `#6BA1FF`
- **Secondary**: `#A1A1AA`
- **Success**: `#34D399` (Bright emerald)
- **Warning**: `#FBBF24` (Warm amber)
- **Error / Critical**: `#F87171` (Soft red — reduced eye strain)
- **Info**: `#60A5FA`
- **Chart Gradient Start**: `#4D90FE`
- **Chart Gradient End**: `#1B1B1F` (Fades to bg)

### Typography
- **Primary Font Family**: `"Google Sans", "Segoe UI", Inter, system-ui, -apple-system, sans-serif`
- **Monospace Font Family**: `"Google Sans Mono", "Cascadia Code", "Fira Code", Consolas, monospace`
- **Font Sizes**:
  - Page Title: `1.5rem (24px)`, SemiBold 600, line-height `1.3`
  - Section Heading: `1.125rem (18px)`, Medium 500, line-height `1.4`
  - Card Title: `0.9375rem (15px)`, Medium 500, line-height `1.4`
  - Body Base: `0.875rem (14px)`, Regular 400, line-height `1.5`
  - Small / Caption: `0.75rem (12px)`, Medium 500, line-height `1.4`
  - Mono Data: `0.8125rem (13px)`, Regular 400, line-height `1.5`

### Spacing
8px baseline grid (enterprise standard):
- `xxs`: 4px
- `xs`: 8px
- `sm`: 12px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px
- `xxl`: 48px
- `section`: 64px

### Border Radius
Subtle, professional — avoid excessive rounding:
- `sm`: 4px (badges, tags, status pills)
- `md`: 8px (buttons, inputs, dropdowns)
- `lg`: 12px (cards, panels)
- `full`: 9999px (avatars, toggle indicators)

### Shadows
Light mode uses subtle shadows for elevation hierarchy:
- `shadow-sm`: `0 1px 2px rgba(0, 0, 0, 0.06)`
- `shadow-md`: `0 1px 3px rgba(0, 0, 0, 0.10), 0 1px 2px rgba(0, 0, 0, 0.06)`
- `shadow-lg`: `0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)`

Dark mode uses border emphasis instead of shadows (AWS Console pattern).

---

## Components

### 1. AppLayout
- **States**: `default`
- **Props**: `children: ReactNode`, `theme: 'light' | 'dark'`, `onToggleTheme: () => void`
- **Accessibility**: Skip navigation link, ARIA landmark regions (`header`, `main`, `nav`).
- **ag_ui_role**: `static`
- **Description**: Top-bar navigation layout (Google Workspace pattern). Contains horizontal nav links, ProgyNovaAI logo, theme toggle, and activity status indicator. Sidebar optional for secondary navigation on wider screens.
- **Responsive**: Top-bar collapses to hamburger menu on mobile.

### 2. CSVUploader
- **States**: `default` (ready), `dragging` (drag-over with blue border highlight), `uploading` (linear progress bar), `completed` (schema summary card), `error` (red border + error message).
- **Props**: `onUploadSuccess: (metadata: UploadResponse) => void`, `onUploadError: (err: string) => void`
- **Accessibility**: Keyboard accessible file input, screen reader announcements for state transitions.
- **ag_ui_role**: `tool_handler`
- **Interaction Triggers**:
  - `event`: drop / change → `action`: `uploadDataset`

### 3. ForecastChart
- **States**: `empty` (placeholder illustration), `loading` (skeleton shimmer), `render` (area chart), `error` (error card).
- **Props**: `data: ForecastPoint[]`, `selectedEntity: string`, `selectedLocation: string`
- **Accessibility**: Chart data accessible via data table fallback, keyboard-focusable tooltips.
- **ag_ui_role**: `generative_renderer`
- **Interaction Triggers**:
  - `event`: clickPoint → `action`: `selectItem` (triggers SHAP view)

### 4. AlertsTable
- **States**: `empty` (no stockout deficits), `loading` (skeleton rows), `render` (populated table), `exporting` (generating CSV).
- **Props**: `alerts: StockoutAlert[]`, `onSelectItem: (idx: number) => void`
- **Accessibility**: Semantic `<table>` with `scope` attributes, keyboard navigable rows, high-contrast status badges.
- **ag_ui_role**: `event_consumer`
- **Interaction Triggers**:
  - `event`: clickRow → `action`: `requestExplanation`

### 5. ShapExplainer
- **States**: `empty` (awaiting selection), `loading` (skeleton), `render` (horizontal bar chart), `error`.
- **Props**: `explanation: ShapExplanation | null`, `selectedEntity: string`
- **Accessibility**: SVG bars annotated with ARIA labels, color-blind-safe dual colors.
- **ag_ui_role**: `generative_renderer`

### 6. ReorderApprovalCard
- **States**: `idle`, `review_pending`, `submitting`, `completed`.
- **Props**: `alerts: StockoutAlert[]`
- **Accessibility**: Focus-trapped confirmation modal, escape key dismissal.
- **ag_ui_role**: `hitl_control`
- **Interaction Triggers**:
  - `event`: clickApprove → `action`: `downloadReorderCSV` (client-side generation)

### 7. ThemeToggle
- **States**: `light`, `dark`
- **Props**: `theme: 'light' | 'dark'`, `onToggle: () => void`
- **Accessibility**: `role="switch"`, `aria-checked`, keyboard toggle via Enter/Space.
- **ag_ui_role**: `static`
- **Description**: Sun/moon icon toggle in the header bar. Animates icon transition smoothly.

---

## User Flows

### Flow 1: Data Ingestion and Inference
1. User opens dashboard → clean empty state with CSVUploader card prominent.
2. User drags CSV file into the upload zone.
3. Upload zone highlights with blue dashed border (drag-over state).
4. File processes → progress bar animates → schema summary card appears.
5. Dashboard auto-populates ForecastChart and AlertsTable with results.

### Flow 2: Forecast Audit and Reorder Download
1. User reviews AlertsTable → CRITICAL items shown at top with red badges.
2. User clicks a row → ShapExplainer panel loads feature contributions.
3. User reviews ReorderApprovalCard → sees total items at risk.
4. User clicks "Download Recommendations" → confirmation modal appears.
5. User confirms → CSV file downloads.
