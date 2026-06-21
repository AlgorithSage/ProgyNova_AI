import { useState, useCallback } from 'react';
import type { StockoutAlert } from '../../types';
import './ReorderApprovalCard.css';

interface ReorderApprovalCardProps {
  alerts: StockoutAlert[];
  isLoading?: boolean;
}

export function ReorderApprovalCard({ alerts, isLoading }: ReorderApprovalCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDownload = useCallback(() => {
    const headers = ['entity_id', 'location_id', 'time_index', 'stock_on_hand', 'forecast', 'deficit', 'severity', 'recommended_reorder'];
    const rows = alerts.map((a) =>
      [a.entity_id, a.location_id, a.time_index, a.stock_on_hand, a.forecast.toFixed(1), a.deficit.toFixed(1), a.severity, a.recommended_reorder.toFixed(0)].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reorder_recommendations_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowConfirm(false);
  }, [alerts]);

  if (isLoading) {
    return (
      <div className="reorder-card">
        <div className="reorder-card__skeleton-title" />
        <div className="reorder-card__stats">
          <div className="reorder-card__stat">
            <div className="reorder-card__skeleton-stat-value" />
            <div className="reorder-card__skeleton-stat-label" />
          </div>
          <div className="reorder-card__stat">
            <div className="reorder-card__skeleton-stat-value" />
            <div className="reorder-card__skeleton-stat-label" />
          </div>
          <div className="reorder-card__stat">
            <div className="reorder-card__skeleton-stat-value" />
            <div className="reorder-card__skeleton-stat-label" />
          </div>
        </div>
        <div className="reorder-card__skeleton-button" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="reorder-card">
        <div className="reorder-card__header">
          <h2 className="reorder-card__title">Reorder Summary</h2>
        </div>
        <div className="reorder-card__empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
            <rect x="1" y="3" width="15" height="13" rx="2" />
            <path d="M16 8h4l3 3v5a2 2 0 0 1-2 2h-1" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <p>No reorder recommendations</p>
        </div>
      </div>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const totalDeficit = alerts.reduce((sum, a) => sum + a.deficit, 0);
  const totalReorder = alerts.reduce((sum, a) => sum + a.recommended_reorder, 0);

  return (
    <div className="reorder-card">
      <div className="reorder-card__header">
        <h2 className="reorder-card__title">Reorder Summary</h2>
      </div>

      <div className="reorder-card__stats">
        <div className="reorder-card__stat">
          <span className="reorder-card__stat-value reorder-card__stat-value--error">{criticalCount}</span>
          <span className="reorder-card__stat-label">Critical Items</span>
        </div>
        <div className="reorder-card__stat">
          <span className="reorder-card__stat-value">{totalDeficit.toFixed(0)}</span>
          <span className="reorder-card__stat-label">Total Deficit</span>
        </div>
        <div className="reorder-card__stat">
          <span className="reorder-card__stat-value reorder-card__stat-value--primary">{totalReorder.toFixed(0)}</span>
          <span className="reorder-card__stat-label">Reorder Units</span>
        </div>
      </div>

      <button
        className="reorder-card__button"
        onClick={() => setShowConfirm(true)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export Suggested Order Sheet
      </button>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="reorder-card__overlay" role="dialog" aria-modal="true" aria-label="Confirm download">
          <div className="reorder-card__modal">
            <h3 className="reorder-card__modal-title">Export Restock Order Sheet</h3>
            <p className="reorder-card__modal-text">
              Would you like to save the recommended restock order sheet for <strong>{alerts.length} items</strong> (replenishing a total of <strong>{totalReorder.toFixed(0)} units</strong>)? This will export a spreadsheet to send to your suppliers.
            </p>
            <div className="reorder-card__modal-actions">
              <button
                className="reorder-card__modal-cancel"
                onClick={() => setShowConfirm(false)}
              >
                Go Back
              </button>
              <button
                className="reorder-card__modal-confirm"
                onClick={handleDownload}
                autoFocus
              >
                Save Order Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
