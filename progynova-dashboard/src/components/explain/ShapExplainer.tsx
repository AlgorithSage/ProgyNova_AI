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

interface FeatureMeta {
  label: string;
  icon: string;
  desc: string;
}

const getFeatureMetadata = (feature: string): FeatureMeta => {
  // Lags
  if (feature.startsWith('demand_lag_')) {
    const weeks = feature.replace('demand_lag_', '');
    if (weeks === '1') {
      return {
        label: 'Sales Last Week',
        icon: '📅',
        desc: 'Direct sales volume from the immediate past week, reflecting immediate baseline demand.'
      };
    }
    if (weeks === '2') {
      return {
        label: 'Sales 2 Weeks Ago',
        icon: '📅',
        desc: 'Historical sales volume from two weeks ago, showing short-term demand.'
      };
    }
    if (weeks === '52') {
      return {
        label: 'Year-Over-Year Seasonality',
        icon: '🔁',
        desc: 'Sales performance from this exact week last year, accounting for annual seasonal waves.'
      };
    }
    return {
      label: `Sales ${weeks} Weeks Ago`,
      icon: '📊',
      desc: `Historical sales volume observed ${weeks} weeks ago.`
    };
  }

  // Rolling means & std
  if (feature.startsWith('demand_roll_mean_')) {
    const weeks = feature.replace('demand_roll_mean_', '');
    return {
      label: `${weeks}-Week Average Sales Trend`,
      icon: '📈',
      desc: `The average demand baseline computed over the past ${weeks} weeks.`
    };
  }
  if (feature.startsWith('demand_roll_std_')) {
    const weeks = feature.replace('demand_roll_std_', '');
    return {
      label: `${weeks}-Week Sales Volatility`,
      icon: '📉',
      desc: `Degree of fluctuation or unpredictability in sales over the last ${weeks} weeks.`
    };
  }

  // Momentum
  if (feature.includes('momentum')) {
    return {
      label: 'Recent Sales Momentum',
      icon: '🚀',
      desc: 'Speed at which sales are moving up or down compared to recent averages.'
    };
  }
  if (feature === 'demand_wow_change') {
    return {
      label: 'Weekly Sales Velocity (Trend)',
      icon: '⚡',
      desc: 'Week-over-week growth or decline in sales speed, flagging rapid market shifts.'
    };
  }

  // Outbreaks
  if (feature.startsWith('outbreak_')) {
    const disease = feature.replace('outbreak_', '').split('_')[0];
    const capitalized = disease.charAt(0).toUpperCase() + disease.slice(1);
    return {
      label: `${capitalized} Outbreak Activity`,
      icon: '🦠',
      desc: `Local diagnostic cases indicating a rise in active cases of ${capitalized}.`
    };
  }

  // Store/catchment level
  if (feature === 'catchment_population') {
    return {
      label: 'Local Store Population Size',
      icon: '👥',
      desc: 'Size of the catchment population surrounding this store location.'
    };
  }
  if (feature === 'supplier_lead_time_weeks') {
    return {
      label: 'Supplier Delivery Delay',
      icon: '🚚',
      desc: 'Expected duration (in weeks) for order fulfillment from suppliers.'
    };
  }
  if (feature === 'festival_intensity') {
    return {
      label: 'Holiday/Festival Surge',
      icon: '🎉',
      desc: 'Proximity and regional scale of upcoming major cultural festivals and holidays.'
    };
  }
  if (feature === 'rainfall_anomaly') {
    return {
      label: 'Rainfall/Monsoon Deviation',
      icon: '🌧️',
      desc: 'Unusual rainfall levels compared to normal years, triggering specific seasonal sicknesses.'
    };
  }

  // Default fallback
  return {
    label: feature.replace(/_/g, ' '),
    icon: '💡',
    desc: 'An engineered data feature analyzed by ProgyNova\'s engine.'
  };
};

interface ShapExplainerProps {
  explanation: ShapExplanation | null;
  selectedEntity: string;
  isLoading?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ShapExplainer({ explanation, selectedEntity, isLoading, isOpen, onClose }: ShapExplainerProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
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

  const insights = useMemo(() => {
    if (!explanation) return { positive: [], negative: [], recommendation: '', hasOutbreak: false };

    const sortedFeatures = Object.entries(explanation.shap_values)
      .map(([feature, value]) => ({ feature, value }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    const positive = sortedFeatures.filter(f => f.value > 0.0001).slice(0, 3);
    const negative = sortedFeatures.filter(f => f.value < -0.0001).slice(0, 2);

    let recommendation = "Maintain baseline inventory levels. Current forecast aligns closely with typical demand patterns.";
    const diff = explanation.prediction - explanation.base_value;

    const hasOutbreak = positive.some(f => f.feature.startsWith('outbreak_'));
    const hasTrend = positive.some(f => f.feature === 'demand_wow_change' || f.feature.includes('momentum'));
    const hasLastWeek = positive.some(f => f.feature === 'demand_lag_1');

    if (diff > 0.5) {
      if (hasOutbreak) {
        recommendation = "CRITICAL OUTBREAK RESPONSE: Local disease outbreak activity is actively driving demand up. Immediately expedite high-priority orders and secure extra safety stock to ensure uninterrupted patient dispensing.";
      } else if (hasTrend) {
        recommendation = "VELOCITY ALERT: Sales velocity is accelerating rapidly compared to prior weeks. Increase upcoming replenishment order sizes to capture this upward momentum and prevent stockouts.";
      } else if (hasLastWeek) {
        recommendation = "ACCELERATING BASELINE: Immediate sales from last week are significantly higher than the long-term typical average. Adjust short-term stocking level upwards.";
      } else {
        recommendation = "STOCK UP ADVISORY: Upcoming forecast is higher than typical baseline sales. Recommended to increase order volumes for local stock to prevent out-of-stock events.";
      }
    } else if (diff < -0.5) {
      const hasSeasonalDrop = negative.some(f => f.feature === 'demand_lag_52');
      if (hasSeasonalDrop) {
        recommendation = "SEASONAL OPTIMIZATION: Historical annual seasonality indicates a natural drop in demand for this period. Decrease order volumes to avoid overstocking and optimize cash flow.";
      } else {
        recommendation = "OPTIMIZE STOCK LEVELS: Forecasted need is lower than typical baseline sales. Recommended to reduce replenishment order sizes to optimize shelf space and reduce holding costs.";
      }
    }

    return { positive, negative, recommendation, hasOutbreak };
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

          {/* ProgyNova Insights Section */}
          <div className="progynova-insights">
            <div className="progynova-insights__header">
              <div className="progynova-insights__header-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="4" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="progynova-insights__title">ProgyNova Insights</h3>
                <p className="progynova-insights__subtitle">AI-synthesized explanation of the key forces driving this forecast</p>
              </div>
            </div>

            <div className="progynova-insights__grid">
              {/* Positive Drivers */}
              <div className="progynova-insights__column">
                <h4 className="progynova-insights__column-title positive">
                  <span className="progynova-insights__indicator positive">↑</span>
                  Top Upward Drivers
                </h4>
                {insights.positive.length === 0 ? (
                  <p className="progynova-insights__empty-text">No significant upward drivers detected.</p>
                ) : (
                  <div className="progynova-insights__list">
                    {insights.positive.map(({ feature, value }) => {
                      const meta = getFeatureMetadata(feature);
                      return (
                        <div key={feature} className="progynova-insights__card positive">
                          <div className="progynova-insights__card-top">
                            <span className="progynova-insights__card-icon">{meta.icon}</span>
                            <span className="progynova-insights__card-label">{meta.label}</span>
                            <span className="progynova-insights__card-value positive">+{value.toFixed(2)}</span>
                          </div>
                          <p className="progynova-insights__card-desc">{meta.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Negative Drivers */}
              <div className="progynova-insights__column">
                <h4 className="progynova-insights__column-title negative">
                  <span className="progynova-insights__indicator negative">↓</span>
                  Top Downward Drivers
                </h4>
                {insights.negative.length === 0 ? (
                  <p className="progynova-insights__empty-text">No significant downward drivers detected.</p>
                ) : (
                  <div className="progynova-insights__list">
                    {insights.negative.map(({ feature, value }) => {
                      const meta = getFeatureMetadata(feature);
                      return (
                        <div key={feature} className="progynova-insights__card negative">
                          <div className="progynova-insights__card-top">
                            <span className="progynova-insights__card-icon">{meta.icon}</span>
                            <span className="progynova-insights__card-label">{meta.label}</span>
                            <span className="progynova-insights__card-value negative">{value.toFixed(2)}</span>
                          </div>
                          <p className="progynova-insights__card-desc">{meta.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Smart Action Recommendation */}
            <div className={`progynova-insights__recommendation progynova-insights__recommendation--${insights.hasOutbreak ? 'outbreak' : diffDirection}`}>
              <div className="progynova-insights__recommendation-header">
                <span className="progynova-insights__recommendation-icon">💡</span>
                <span className="progynova-insights__recommendation-title">ProgyNova Action Plan</span>
              </div>
              <p className="progynova-insights__recommendation-text">{insights.recommendation}</p>
            </div>
          </div>

          {/* Technical Section Toggle */}
          <div className="shap-explainer__tech-toggle-wrapper">
            <button 
              className={`shap-explainer__tech-toggle-btn ${showTechnical ? 'shap-explainer__tech-toggle-btn--active' : ''}`}
              onClick={() => setShowTechnical(!showTechnical)}
              aria-expanded={showTechnical}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {showTechnical ? (
                  <polyline points="18 15 12 9 6 15" />
                ) : (
                  <polyline points="6 9 12 15 18 9" />
                )}
              </svg>
              {showTechnical ? 'Hide Technical Details' : 'Show Technical Details (SHAP Chart)'}
            </button>
          </div>

          {/* Technical Section (Chart, Legend, Info Guide) */}
          {showTechnical && (
            <div className="shap-explainer__technical-section">
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
          )}
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
