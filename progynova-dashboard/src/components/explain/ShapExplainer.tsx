import { useMemo, useEffect, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { ShapExplanation } from '../../types';
import './ShapExplainer.css';

interface ShapExplainerProps {
  explanation: ShapExplanation | null;
  selectedEntity: string;
  isLoading?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ShapExplainer({ explanation, selectedEntity, isLoading, isOpen, onClose }: ShapExplainerProps) {
  const [showInfo, setShowInfo] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll into view when panel opens
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isOpen]);

  const MAX_FEATURES = 15;

  const chartData = useMemo(() => {
    if (!explanation) return [];

    return Object.entries(explanation.shap_values)
      .map(([feature, value]) => ({ feature, value }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, MAX_FEATURES);
  }, [explanation]);

  // Not visible state
  if (!isOpen) return null;

  return (
    <div className={`shap-explainer shap-explainer--panel ${isOpen ? 'shap-explainer--visible' : ''}`} ref={panelRef}>
      {/* Header with close */}
      <div className="shap-explainer__header">
        <div className="shap-explainer__header-left">
          <div className="shap-explainer__header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <h2 className="shap-explainer__title">What's driving this forecast?</h2>
            {selectedEntity && (
              <span className="shap-explainer__entity mono">{selectedEntity}</span>
            )}
          </div>
        </div>
        {onClose && (
          <button className="shap-explainer__close-btn" onClick={onClose} aria-label="Close explainer panel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="shap-explainer__loading">
          <div className="shap-explainer__spinner" />
          <p>Analyzing sales drivers...</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && explanation && (() => {
        const diff = explanation.prediction - explanation.base_value;
        const diffDirection = diff >= 0 ? 'positive' : 'negative';
        return (
        <div className="shap-explainer__content">
          {/* Meta stats row */}
          <div className="shap-explainer__meta">
            <div className="shap-explainer__meta-card">
              <div className="shap-explainer__meta-card-header">
                <span className="shap-explainer__meta-label">Typical Sales</span>
                <div className="shap-explainer__meta-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 15.5 14" />
                  </svg>
                </div>
              </div>
              <span className="shap-explainer__meta-value">{explanation.base_value.toFixed(2)}</span>
            </div>
            <div className="shap-explainer__meta-card shap-explainer__meta-card--primary">
              <div className="shap-explainer__meta-card-header">
                <span className="shap-explainer__meta-label">Forecasted Need</span>
                <div className="shap-explainer__meta-icon shap-explainer__meta-icon--primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="4.5" />
                    <circle cx="12" cy="12" r="1" fill="currentColor" />
                  </svg>
                </div>
              </div>
              <span className="shap-explainer__meta-value shap-explainer__meta-value--primary">
                {explanation.prediction.toFixed(2)}
              </span>
            </div>
            <div className={`shap-explainer__meta-card shap-explainer__meta-card--${diffDirection}`}>
              <div className="shap-explainer__meta-card-header">
                <span className="shap-explainer__meta-label">Difference</span>
                <div className={`shap-explainer__meta-icon shap-explainer__meta-icon--${diffDirection}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {diff >= 0 ? (
                      <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>
                    ) : (
                      <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="5 12 12 19 19 12" /></>
                    )}
                  </svg>
                </div>
              </div>
              <span className={`shap-explainer__meta-value shap-explainer__meta-value--${diffDirection}`}>
                {diff >= 0 ? '+' : ''}
                {diff.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="shap-explainer__chart-wrapper">
            <h3 className="shap-explainer__chart-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
              Feature Impact Analysis
            </h3>
            <div className="shap-explainer__chart">
              <ResponsiveContainer width="100%" height={Math.min(600, Math.max(220, chartData.length * 38))}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 110, right: 24, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-number)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={{ stroke: 'var(--border)' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                    axisLine={false}
                    tickLine={false}
                    width={105}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      boxShadow: 'var(--shadow-xl)',
                      backdropFilter: 'blur(8px)',
                      width: 'auto',
                      minWidth: 'max-content',
                    }}
                    formatter={(value) => [Number(value).toFixed(4), 'Impact on Forecast']}
                    cursor={{ fill: 'var(--primary-light)', opacity: 0.3 }}
                  />
                  <ReferenceLine x={0} stroke="var(--border)" strokeWidth={2} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26} animationDuration={800} animationEasing="ease-out">
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.feature}
                        fill={entry.value >= 0 ? 'var(--chart-primary)' : 'var(--chart-negative)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Legend */}
          <div className="shap-explainer__legend">
            <div className="shap-explainer__legend-item">
              <span className="shap-explainer__legend-dot shap-explainer__legend-dot--positive" />
              <span>Increases forecast</span>
            </div>
            <div className="shap-explainer__legend-item">
              <span className="shap-explainer__legend-dot shap-explainer__legend-dot--negative" />
              <span>Decreases forecast</span>
            </div>
          </div>

          {/* Info Guide Section */}
          <div className="shap-explainer__info-section">
            <button 
              className={`shap-explainer__info-btn ${showInfo ? 'shap-explainer__info-btn--active' : ''}`}
              onClick={() => setShowInfo(!showInfo)}
              aria-expanded={showInfo}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              {showInfo ? 'Hide Explanation Guide' : 'How to read this chart?'}
            </button>
            
            {showInfo && (
              <div className="shap-explainer__info-content">
                <h4 className="shap-explainer__info-title">Understanding Feature Impact (SHAP Values)</h4>
                <p className="shap-explainer__info-desc">
                  This chart shows the exact mathematical contribution of each feature to the final forecast. 
                  It answers the question: <strong>"Why is this week's forecast higher/lower than typical sales?"</strong>
                </p>
                
                <div className="shap-explainer__guide-grid">
                  <div className="shap-explainer__guide-col">
                    <h5 className="shap-explainer__guide-header">Direction of Impact</h5>
                    <ul className="shap-explainer__guide-list">
                      <li><strong>Right-pointing bars (+):</strong> Increased the forecast compared to baseline (e.g., sudden sales spike).</li>
                      <li><strong>Left-pointing bars (-):</strong> Decreased the forecast compared to baseline (e.g., high remaining inventory).</li>
                    </ul>
                  </div>
                  <div className="shap-explainer__guide-col">
                    <h5 className="shap-explainer__guide-header">Bar Length & Magnitude</h5>
                    <p className="shap-explainer__guide-text">
                      The length of each bar represents the strength of its influence. Longer bars had the highest leverage on the final prediction, while shorter bars had a minor tuning effect.
                    </p>
                  </div>
                </div>

                <h5 className="shap-explainer__guide-header">Variable Definitions</h5>
                <dl className="shap-explainer__terms">
                  <dt>demand_wow_change</dt>
                  <dd>Week-over-Week sales velocity change. High positive values show recent accelerating sales.</dd>
                  
                  <dt>demand_lag_X</dt>
                  <dd>Actual sales volume X weeks ago (e.g., demand_lag_1 is immediate past week sales).</dd>
                  
                  <dt>demand_roll_mean_X</dt>
                  <dd>Moving average of sales over the last X weeks. Represents baseline mid-term demand trends.</dd>
                  
                  <dt>outbreak_diarrhoeal_lag2</dt>
                  <dd>Preventative clinics data of local symptoms 2 weeks ago. Flags higher prospective stocking needs.</dd>
                </dl>
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* No explanation selected yet */}
      {!isLoading && !explanation && (
        <div className="shap-explainer__empty">
          <div className="shap-explainer__empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <p>Select an item from the alerts table</p>
          <span className="shap-explainer__empty-hint">to see what factors are driving its forecast</span>
        </div>
      )}
    </div>
  );
}
