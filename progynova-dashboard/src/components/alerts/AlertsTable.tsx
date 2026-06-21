import { useState, useRef, useEffect, useCallback } from 'react';
import type { StockoutAlert } from '../../types';
import './AlertsTable.css';

interface AlertsTableProps {
  alerts: StockoutAlert[];
  onSelectItem: (originalIndex: number) => void;
  selectedOriginalIndex: number | null;
  isLoading?: boolean;
  isExplainerOpen?: boolean;
  onCloseExplainer?: () => void;
}

const PAGE_SIZE = 100;

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const SEVERITY_ICONS: Record<string, string> = {
  CRITICAL: 'M12 9v4m0 4h.01M12 2L2 20h20L12 2z',
  HIGH: 'M12 9v4m0 4h.01M12 2L2 20h20L12 2z',
  MEDIUM: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  LOW: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

function SeverityIcon({ severity }: { severity: string }) {
  const path = SEVERITY_ICONS[severity] || SEVERITY_ICONS.LOW;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

/* ── Export to CSV (opens natively in Excel) ─────────────── */
function exportToCSV(alerts: StockoutAlert[]) {
  const headers = ['SKU', 'Location', 'Week', 'Stock On Hand', 'Forecast', 'Deficit', 'Severity', 'Recommended Reorder'];
  const rows = alerts.map((a) => [
    `"${a.entity_id}"`,
    `"${a.location_id}"`,
    a.time_index,
    a.stock_on_hand.toFixed(0),
    a.forecast.toFixed(1),
    a.deficit.toFixed(1),
    a.severity,
    a.recommended_reorder.toFixed(0),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `stockout_alerts_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/* ── Open full-view window with all data ─────────────────── */
function openFullViewWindow(alerts: StockoutAlert[]) {
  const sorted = [...alerts].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
  );

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  const severityColors: Record<string, { color: string; bg: string }> = isDark
    ? {
        CRITICAL: { color: '#F87171', bg: '#450A0A' },
        HIGH: { color: '#FBBF24', bg: '#451A03' },
        MEDIUM: { color: '#A1A1AA', bg: '#2B2B30' },
        LOW: { color: '#34D399', bg: '#064E3B' },
      }
    : {
        CRITICAL: { color: '#D93025', bg: '#FCE8E6' },
        HIGH: { color: '#F9AB00', bg: '#FEF7E0' },
        MEDIUM: { color: '#5F6368', bg: '#F8F9FA' },
        LOW: { color: '#1E8E3E', bg: '#E6F4EA' },
      };

  const bg = isDark ? '#090D16' : '#F8FAFC';
  const surface = isDark ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF';
  const surfaceElevated = isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#CBD5E1' : '#475569';
  const border = isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';
  const primary = isDark ? '#818CF8' : '#4F46E5';
  const primaryGradient = isDark ? 'linear-gradient(135deg, #818CF8, #6366F1)' : 'linear-gradient(135deg, #6366F1, #4F46E5)';
  const errorColor = isDark ? '#F87171' : '#EF4444';

  const critCount = sorted.filter((a) => a.severity === 'CRITICAL').length;
  const highCount = sorted.filter((a) => a.severity === 'HIGH').length;
  const medCount = sorted.filter((a) => a.severity === 'MEDIUM').length;
  const lowCount = sorted.filter((a) => a.severity === 'LOW').length;

  const tableRows = sorted
    .map(
      (a, i) => `
    <tr style="animation: fadeIn 0.2s ease ${Math.min(i * 10, 500)}ms both;">
      <td style="font-weight:600;">${a.entity_id}</td>
      <td>${a.location_id}</td>
      <td class="num" style="text-align:right;">${a.stock_on_hand.toFixed(0)}</td>
      <td class="num" style="text-align:right;">${a.forecast.toFixed(1)}</td>
      <td class="num" style="text-align:right;color:${errorColor};font-weight:700;">${a.deficit.toFixed(1)}</td>
      <td><span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;color:${severityColors[a.severity]?.color};background:${severityColors[a.severity]?.bg};border: 1px solid rgba(255,255,255,0.05);">${a.severity}</span></td>
      <td class="num" style="text-align:right;font-weight:700;">${a.recommended_reorder.toFixed(0)}</td>
    </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Stockout Alerts - Full View | ProgyNovaAI</title>
  <style>
    @font-face {
      font-family: 'Vollkorn';
      src: url('/fonts/VollkornSemibold-3zRaM.otf') format('opentype');
      font-weight: 600;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Zodiak';
      src: url('/fonts/Zodiak-Bold.otf') format('opentype');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Roundo';
      src: url('/fonts/Roundo-SemiBold.otf') format('opentype');
      font-weight: 600;
      font-style: normal;
      font-display: swap;
    }

    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Vollkorn', Georgia, 'Times New Roman', serif;
      background: ${bg};
      color: ${textPrimary};
      padding: 40px;
      line-height: 1.5;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .header-left { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .header h1 {
      font-size: 1.75rem;
      font-weight: 850;
      letter-spacing: -0.02em;
      background: ${primaryGradient};
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .count-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 28px; height: 28px; padding: 0 8px;
      font-size: 13px; font-weight: 700; color: #fff;
      background: linear-gradient(135deg, ${errorColor}, #b91c1c);
      border-radius: 999px;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    }

    .summary-pills { display: flex; gap: 8px; flex-wrap: wrap; }
    .pill {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 12px; font-size: 12px; font-weight: 700;
      border-radius: 999px; border: 1px solid rgba(255,255,255,0.05);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .actions { display: flex; gap: 8px; }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 20px; font-size: 13px; font-weight: 600;
      border-radius: 999px; cursor: pointer; border: 1px solid ${border};
      background: ${surfaceElevated}; color: ${textPrimary};
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .btn:hover {
      background: ${primary};
      color: #fff;
      border-color: ${primary};
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
    }
    .btn svg {
      transition: transform 0.2s;
    }
    .btn:hover svg {
      transform: translateY(-1px);
    }

    .search-bar {
      margin-bottom: 24px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .search-input {
      padding: 10px 18px; border-radius: 999px;
      border: 1px solid ${border}; background: ${surfaceElevated};
      color: ${textPrimary}; font-size: 14px; font-family: inherit;
      min-width: 320px; outline: none; transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .search-input:focus {
      border-color: ${primary};
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }
    .search-input::placeholder { color: ${textSecondary}; opacity: 0.7; }

    .stats-bar {
      margin-bottom: 20px;
      font-size: 13px; color: ${textSecondary}; font-weight: 500;
    }
    .stats-bar span { font-weight: 700; color: ${textPrimary}; }

    table {
      width: 100%; border-collapse: collapse; font-size: 14px;
      background: ${surfaceElevated}; border-radius: 16px; overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.03);
      border: 1px solid ${border};
    }
    th {
      padding: 14px 20px; text-align: left; font-size: 11px; font-weight: 700;
      color: ${textSecondary}; text-transform: uppercase; letter-spacing: 0.08em;
      border-bottom: 2px solid ${border}; background: ${surface};
      position: sticky; top: 0; z-index: 10;
    }
    td {
      padding: 12px 20px; border-bottom: 1px solid ${border};
      font-family: 'Zodiak', Georgia, serif; font-size: 13px;
    }
    .num {
      font-family: 'Roundo', system-ui, sans-serif !important;
    }
    tr:hover { background: rgba(79, 70, 229, 0.02); }
    tr:last-child td { border-bottom: none; }

    .footer {
      margin-top: 32px; text-align: center;
      font-size: 12px; color: ${textSecondary};
      opacity: 0.7;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Stockout Alerts <span class="count-badge">${sorted.length}</span></h1>
      <div class="summary-pills">
        ${critCount > 0 ? `<span class="pill" style="color:${severityColors.CRITICAL.color};border-color:${severityColors.CRITICAL.color};background:${severityColors.CRITICAL.bg};">${critCount} Critical</span>` : ''}
        ${highCount > 0 ? `<span class="pill" style="color:${severityColors.HIGH.color};border-color:${severityColors.HIGH.color};background:${severityColors.HIGH.bg};">${highCount} High</span>` : ''}
        ${medCount > 0 ? `<span class="pill" style="color:${severityColors.MEDIUM.color};border-color:${severityColors.MEDIUM.color};background:${severityColors.MEDIUM.bg};">${medCount} Medium</span>` : ''}
        ${lowCount > 0 ? `<span class="pill" style="color:${severityColors.LOW.color};border-color:${severityColors.LOW.color};background:${severityColors.LOW.bg};">${lowCount} Low</span>` : ''}
      </div>
    </div>
    <div class="actions">
      <button class="btn" onclick="exportCSV()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        Export Excel
      </button>
      <button class="btn" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print
      </button>
    </div>
  </div>

  <div class="search-bar">
    <input type="text" class="search-input" placeholder="Search by SKU, location, or severity..." id="searchInput" oninput="filterTable()" />
  </div>

  <div class="stats-bar">
    Showing <span id="visibleCount" class="num">${sorted.length}</span> of <span class="num">${sorted.length}</span> alerts
  </div>

  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Location</th>
        <th style="text-align:right;">Stock</th>
        <th style="text-align:right;">Forecast</th>
        <th style="text-align:right;">Deficit</th>
        <th>Severity</th>
        <th style="text-align:right;">Reorder Qty</th>
      </tr>
    </thead>
    <tbody id="tableBody">
      ${tableRows}
    </tbody>
  </table>

  <div class="footer">
    ProgyNovaAI - Stockout Alert Report - Generated ${new Date().toLocaleString()}
  </div>

  <script>
    const allData = ${JSON.stringify(sorted.map((a) => ({
      entity_id: a.entity_id,
      location_id: a.location_id,
      time_index: a.time_index,
      stock_on_hand: a.stock_on_hand,
      forecast: a.forecast,
      deficit: a.deficit,
      severity: a.severity,
      recommended_reorder: a.recommended_reorder,
    })))};

    function filterTable() {
      const query = document.getElementById('searchInput').value.toLowerCase();
      const rows = document.querySelectorAll('#tableBody tr');
      let count = 0;
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const visible = !query || text.includes(query);
        row.style.display = visible ? '' : 'none';
        if (visible) count++;
      });
      document.getElementById('visibleCount').textContent = count;
    }

    function exportCSV() {
      const headers = ['SKU','Location','Week','Stock On Hand','Forecast','Deficit','Severity','Recommended Reorder'];
      const rows = allData.map(a => [
        '"' + a.entity_id + '"',
        '"' + a.location_id + '"',
        a.time_index,
        a.stock_on_hand.toFixed(0),
        a.forecast.toFixed(1),
        a.deficit.toFixed(1),
        a.severity,
        a.recommended_reorder.toFixed(0)
      ]);
      const csv = [headers.join(',')].concat(rows.map(r => r.join(','))).join('\\n');
      const blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'stockout_alerts_' + new Date().toISOString().slice(0,10) + '.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

/* ── Component ───────────────────────────────────────────── */

export function AlertsTable({
  alerts,
  onSelectItem,
  selectedOriginalIndex,
  isLoading,
  isExplainerOpen,
  onCloseExplainer,
}: AlertsTableProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isOverAction, setIsOverAction] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const tableRef = useRef<HTMLDivElement>(null);

  // Reset pagination when alerts data changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [alerts]);

  const handleRowMouseEnter = (e: React.MouseEvent, originalIndex: number) => {
    setHoveredIndex(originalIndex);
    updateTooltipPos(e);
  };

  const handleRowMouseMove = (e: React.MouseEvent) => {
    updateTooltipPos(e);
  };

  const updateTooltipPos = (e: React.MouseEvent) => {
    if (tableRef.current) {
      const rect = tableRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleRowMouseLeave = () => {
    setHoveredIndex(null);
    setIsOverAction(false);
  };

  useEffect(() => {
    if (selectedOriginalIndex !== null && tableRef.current) {
      const selectedRow = tableRef.current.querySelector('.alerts-table__row--selected');
      if (selectedRow) {
        selectedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedOriginalIndex]);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, alerts.length));
  }, [alerts.length]);

  const handleExport = useCallback(() => {
    const sorted = [...alerts].sort(
      (a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
    );
    exportToCSV(sorted);
  }, [alerts]);

  const handleOpenFullView = useCallback(() => {
    openFullViewWindow(alerts);
  }, [alerts]);

  const hoveredAlert = alerts.find((a) => a.original_index === hoveredIndex);

  /* ── Loading skeleton ──────────────────────── */
  if (isLoading) {
    return (
      <div className="alerts-table alerts-table--full" ref={tableRef}>
        <div className="alerts-table__header">
          <div className="alerts-table__skeleton-title" />
        </div>
        <div className="alerts-table__wrapper">
          <table className="alerts-table__table">
            <thead>
              <tr>
                <th scope="col">SKU</th>
                <th scope="col">Location</th>
                <th scope="col" className="alerts-table__num">Stock</th>
                <th scope="col" className="alerts-table__num">Forecast</th>
                <th scope="col" className="alerts-table__num">Deficit</th>
                <th scope="col">Severity</th>
                <th scope="col" className="alerts-table__num">Reorder Qty</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(6)].map((_, i) => (
                <tr key={i} className="alerts-table__skeleton-row">
                  <td><span className="alerts-table__skeleton-cell" style={{ width: '120px' }} /></td>
                  <td><span className="alerts-table__skeleton-cell" style={{ width: '60px' }} /></td>
                  <td><span className="alerts-table__skeleton-cell" style={{ width: '50px', marginLeft: 'auto' }} /></td>
                  <td><span className="alerts-table__skeleton-cell" style={{ width: '60px', marginLeft: 'auto' }} /></td>
                  <td><span className="alerts-table__skeleton-cell" style={{ width: '60px', marginLeft: 'auto' }} /></td>
                  <td><span className="alerts-table__skeleton-cell" style={{ width: '70px' }} /></td>
                  <td><span className="alerts-table__skeleton-cell" style={{ width: '50px', marginLeft: 'auto' }} /></td>
                  <td><span className="alerts-table__skeleton-cell" style={{ width: '90px' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ── Empty state ───────────────────────────── */
  if (alerts.length === 0) {
    return (
      <div className="alerts-table alerts-table--full" ref={tableRef}>
        <div className="alerts-table__header">
          <h2 className="alerts-table__title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="alerts-table__title-icon">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Stockout Alerts
          </h2>
        </div>
        <div className="alerts-table__empty">
          <div className="alerts-table__empty-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="alerts-table__empty-text">No stockout risks detected</p>
          <span className="alerts-table__empty-hint">Upload a dataset to analyze inventory levels</span>
        </div>
      </div>
    );
  }

  /* ── Main render ───────────────────────────── */
  const sortedAlerts = [...alerts].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
  );

  const visibleAlerts = sortedAlerts.slice(0, visibleCount);
  const hasMore = visibleCount < sortedAlerts.length;
  const remaining = sortedAlerts.length - visibleCount;

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter((a) => a.severity === 'HIGH').length;

  return (
    <div
      className={`alerts-table alerts-table--full ${isExplainerOpen ? 'alerts-table--retracted' : ''}`}
      ref={tableRef}
    >
      {/* ── Header ────────────────────────────── */}
      <div className="alerts-table__header">
        <div className="alerts-table__header-left">
          <h2 className="alerts-table__title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="alerts-table__title-icon">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Stockout Alerts
            <span className="alerts-table__count">{alerts.length}</span>
          </h2>
          <div className="alerts-table__summary-pills">
            {criticalCount > 0 && (
              <span className="alerts-table__pill alerts-table__pill--critical">
                <strong className="alerts-table__pill-count">{criticalCount}</strong> Critical
              </span>
            )}
            {highCount > 0 && (
              <span className="alerts-table__pill alerts-table__pill--high">
                <strong className="alerts-table__pill-count">{highCount}</strong> High
              </span>
            )}
          </div>
        </div>

        <div className="alerts-table__header-actions">
          {isExplainerOpen && onCloseExplainer && (
            <button className="alerts-table__back-btn" onClick={onCloseExplainer}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to full view
            </button>
          )}
          <button className="alerts-table__toolbar-btn" onClick={handleExport} title="Export to Excel (.csv)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
          <button className="alerts-table__toolbar-btn alerts-table__toolbar-btn--accent" onClick={handleOpenFullView} title="Open all alerts in a new window">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Full View
          </button>
        </div>
      </div>

      {/* ── Pagination info ───────────────────── */}
      <div className="alerts-table__pagination-info">
        Showing <strong>{visibleAlerts.length}</strong> of <strong>{sortedAlerts.length}</strong> alerts
        {sortedAlerts.length > PAGE_SIZE && (
          <span className="alerts-table__pagination-hint"> (sorted by severity)</span>
        )}
      </div>

      {/* ── Table ─────────────────────────────── */}
      <div className="alerts-table__wrapper">
        <table className="alerts-table__table" role="grid">
          <thead>
            <tr>
              <th scope="col">SKU</th>
              <th scope="col">Location</th>
              <th scope="col" className="alerts-table__num">Stock</th>
              <th scope="col" className="alerts-table__num">Forecast</th>
              <th scope="col" className="alerts-table__num">Deficit</th>
              <th scope="col">Severity</th>
              <th scope="col" className="alerts-table__num">Reorder Qty</th>
              <th scope="col" className="alerts-table__action-col">Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleAlerts.map((alert, idx) => (
              <tr
                key={`${alert.entity_id}-${alert.location_id}-${alert.time_index}`}
                className={`alerts-table__row ${selectedOriginalIndex === alert.original_index ? 'alerts-table__row--selected' : ''}`}
                style={{ animationDelay: `${Math.min(idx * 15, 500)}ms` }}
                tabIndex={0}
                role="row"
                aria-selected={selectedOriginalIndex === alert.original_index}
                onMouseEnter={(e) => handleRowMouseEnter(e, alert.original_index)}
                onMouseMove={handleRowMouseMove}
                onMouseLeave={handleRowMouseLeave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectItem(alert.original_index);
                  }
                }}
              >
                <td className="mono">
                  <div className="alerts-table__sku-content">
                    <span className={`alerts-table__severity-dot alerts-table__severity-dot--${alert.severity.toLowerCase()}`} />
                    {alert.entity_id}
                  </div>
                </td>
                <td className="mono">{alert.location_id}</td>
                <td className="alerts-table__num">{alert.stock_on_hand.toFixed(0)}</td>
                <td className="alerts-table__num">{alert.forecast.toFixed(1)}</td>
                <td className="alerts-table__num alerts-table__deficit">{alert.deficit.toFixed(1)}</td>
                <td>
                  <span className={`alerts-table__badge alerts-table__badge--${alert.severity.toLowerCase()}`}>
                    <SeverityIcon severity={alert.severity} />
                    {alert.severity}
                  </span>
                </td>
                <td className="alerts-table__num">
                  <strong>{alert.recommended_reorder.toFixed(0)}</strong>
                </td>
                <td 
                  className="alerts-table__action-cell"
                  onMouseEnter={() => setIsOverAction(true)}
                  onMouseLeave={() => setIsOverAction(false)}
                >
                  <button
                    className="alerts-table__analyze-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem(alert.original_index);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                    Analyze
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Load More ─────────────────────────── */}
      {hasMore && (
        <div className="alerts-table__load-more">
          <button className="alerts-table__load-more-btn" onClick={handleLoadMore}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            Load next {Math.min(PAGE_SIZE, remaining)} alerts
            <span className="alerts-table__load-more-remaining">({remaining} remaining)</span>
          </button>
        </div>
      )}

      {/* ── Hover Tooltip ─────────────────────── */}
      {hoveredAlert && hoveredIndex !== selectedOriginalIndex && !isOverAction && (
        <div
          className="alerts-table__tooltip"
          style={{
            left: `${Math.min(tooltipPos.x + 16, (tableRef.current?.clientWidth || 600) - 280)}px`,
            top: `${tooltipPos.y - 10}px`,
          }}
        >
          <div className="alerts-table__tooltip-header">
            <span className={`alerts-table__badge alerts-table__badge--${hoveredAlert.severity.toLowerCase()}`}>
              <SeverityIcon severity={hoveredAlert.severity} />
              {hoveredAlert.severity}
            </span>
            <span className="alerts-table__tooltip-sku mono">{hoveredAlert.entity_id}</span>
          </div>
          <div className="alerts-table__tooltip-grid">
            <div className="alerts-table__tooltip-stat">
              <span className="alerts-table__tooltip-label">Current Stock</span>
              <span className="alerts-table__tooltip-value">{hoveredAlert.stock_on_hand.toFixed(0)}</span>
            </div>
            <div className="alerts-table__tooltip-stat">
              <span className="alerts-table__tooltip-label">Forecasted</span>
              <span className="alerts-table__tooltip-value">{hoveredAlert.forecast.toFixed(1)}</span>
            </div>
            <div className="alerts-table__tooltip-stat alerts-table__tooltip-stat--danger">
              <span className="alerts-table__tooltip-label">Deficit</span>
              <span className="alerts-table__tooltip-value alerts-table__tooltip-value--danger">{hoveredAlert.deficit.toFixed(1)}</span>
            </div>
            <div className="alerts-table__tooltip-stat alerts-table__tooltip-stat--accent">
              <span className="alerts-table__tooltip-label">Reorder</span>
              <span className="alerts-table__tooltip-value alerts-table__tooltip-value--accent">{hoveredAlert.recommended_reorder.toFixed(0)}</span>
            </div>
          </div>
          <div className="alerts-table__tooltip-cta">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 9V4.5a2.5 2.5 0 0 1 5 0v9" />
              <path d="M14 13.5V8a2 2 0 1 1 4 0v6" />
              <path d="M18 12a2 2 0 1 1 4 0v3a6 6 0 0 1-6 6h-2.5a5.5 5.5 0 0 1-4.5-2.5L5 12.5A1.8 1.8 0 0 1 7.8 10L9 11.5" />
            </svg>
            Click <strong>Analyze</strong> to see what&apos;s causing this
          </div>
        </div>
      )}
    </div>
  );
}
