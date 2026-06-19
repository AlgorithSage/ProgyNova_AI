import type { StockoutAlert } from '../../types';
import './AlertsTable.css';

interface AlertsTableProps {
  alerts: StockoutAlert[];
  onSelectItem: (index: number) => void;
  selectedIndex: number | null;
}

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function AlertsTable({ alerts, onSelectItem, selectedIndex }: AlertsTableProps) {
  if (alerts.length === 0) {
    return (
      <div className="alerts-table">
        <div className="alerts-table__header">
          <h2 className="alerts-table__title">Stockout Alerts</h2>
        </div>
        <div className="alerts-table__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p>No stockout risks detected</p>
          <span className="alerts-table__empty-hint">Upload a dataset to analyze inventory levels</span>
        </div>
      </div>
    );
  }

  const sortedAlerts = [...alerts].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
  );

  return (
    <div className="alerts-table">
      <div className="alerts-table__header">
        <h2 className="alerts-table__title">
          Stockout Alerts
          <span className="alerts-table__count">{alerts.length}</span>
        </h2>
      </div>

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
            </tr>
          </thead>
          <tbody>
            {sortedAlerts.map((alert, idx) => (
              <tr
                key={`${alert.entity_id}-${alert.location_id}-${alert.time_index}`}
                className={`alerts-table__row ${selectedIndex === idx ? 'alerts-table__row--selected' : ''}`}
                onClick={() => onSelectItem(idx)}
                tabIndex={0}
                role="row"
                aria-selected={selectedIndex === idx}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectItem(idx);
                  }
                }}
              >
                <td className="mono">{alert.entity_id}</td>
                <td className="mono">{alert.location_id}</td>
                <td className="alerts-table__num mono">{alert.stock_on_hand.toFixed(0)}</td>
                <td className="alerts-table__num mono">{alert.forecast.toFixed(1)}</td>
                <td className="alerts-table__num mono alerts-table__deficit">{alert.deficit.toFixed(1)}</td>
                <td>
                  <span className={`alerts-table__badge alerts-table__badge--${alert.severity.toLowerCase()}`}>
                    {alert.severity}
                  </span>
                </td>
                <td className="alerts-table__num mono">
                  <strong>{alert.recommended_reorder.toFixed(0)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
