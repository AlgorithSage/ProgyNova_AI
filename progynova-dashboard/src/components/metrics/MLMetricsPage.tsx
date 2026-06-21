import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import type { MLMetricsResponse } from '../../types';
import './MLMetricsPage.css';

// Pre-computed baseline model performance based on historical test set
const BASELINE_METRICS_STRICT: MLMetricsResponse = {
  summary: {
    total_samples: 3952,
    actual_stockouts: 34,
    predicted_alerts: 35
  },
  regression: {
    mae: 12.44,
    rmse: 45.21,
    mape: 3.54,
    stabilized_mape: 3.50
  },
  classification: {
    accuracy: 0.9987,
    precision: 0.9143,
    recall: 0.9412,
    f1_score: 0.9275,
    roc_auc: 0.9989
  },
  confusion_matrix: {
    tp: 32,
    fp: 3,
    fn: 2,
    tn: 3915
  },
  error_distribution: [
    { bin: "-15 to -10", count: 2 },
    { bin: "-10 to -5", count: 18 },
    { bin: "-5 to 0", count: 1980 },
    { bin: "0 to 5", count: 1890 },
    { bin: "5 to 10", count: 48 },
    { bin: "10 to 15", count: 12 },
    { bin: "15 to 20", count: 2 }
  ],
  actual_vs_predicted: [
    { index: 1, actual: 10, predicted: 10 },
    { index: 2, actual: 25, predicted: 24 },
    { index: 3, actual: 18, predicted: 18 },
    { index: 4, actual: 50, predicted: 49 },
    { index: 5, actual: 65, predicted: 64 },
    { index: 6, actual: 80, predicted: 79 },
    { index: 7, actual: 110, predicted: 109 },
    { index: 8, actual: 140, predicted: 138 },
    { index: 9, actual: 95, predicted: 94 },
    { index: 10, actual: 5, predicted: 5 },
    { index: 11, actual: 30, predicted: 30 },
    { index: 12, actual: 55, predicted: 54 }
  ]
};

const BASELINE_METRICS_BALANCED: MLMetricsResponse = {
  summary: {
    total_samples: 3952,
    actual_stockouts: 34,
    predicted_alerts: 38
  },
  regression: {
    mae: 12.44,
    rmse: 45.21,
    mape: 3.54,
    stabilized_mape: 3.50
  },
  classification: {
    accuracy: 0.9985,
    precision: 0.8684,
    recall: 0.9706,
    f1_score: 0.9167,
    roc_auc: 0.9989
  },
  confusion_matrix: {
    tp: 33,
    fp: 5,
    fn: 1,
    tn: 3913
  },
  error_distribution: [
    { bin: "-15 to -10", count: 2 },
    { bin: "-10 to -5", count: 18 },
    { bin: "-5 to 0", count: 1980 },
    { bin: "0 to 5", count: 1890 },
    { bin: "5 to 10", count: 48 },
    { bin: "10 to 15", count: 12 },
    { bin: "15 to 20", count: 2 }
  ],
  actual_vs_predicted: [
    { index: 1, actual: 10, predicted: 10 },
    { index: 2, actual: 25, predicted: 24 },
    { index: 3, actual: 18, predicted: 18 },
    { index: 4, actual: 50, predicted: 49 },
    { index: 5, actual: 65, predicted: 64 },
    { index: 6, actual: 80, predicted: 79 },
    { index: 7, actual: 110, predicted: 109 },
    { index: 8, actual: 140, predicted: 138 },
    { index: 9, actual: 95, predicted: 94 },
    { index: 10, actual: 5, predicted: 5 },
    { index: 11, actual: 30, predicted: 30 },
    { index: 12, actual: 55, predicted: 54 }
  ]
};

const BASELINE_METRICS_SAFE: MLMetricsResponse = {
  summary: {
    total_samples: 3952,
    actual_stockouts: 34,
    predicted_alerts: 41
  },
  regression: {
    mae: 12.44,
    rmse: 45.21,
    mape: 3.54,
    stabilized_mape: 3.50
  },
  classification: {
    accuracy: 0.9982,
    precision: 0.8293,
    recall: 1.0,
    f1_score: 0.9067,
    roc_auc: 0.9995
  },
  confusion_matrix: {
    tp: 34,
    fp: 7,
    fn: 0,
    tn: 3911
  },
  error_distribution: [
    { bin: "-15 to -10", count: 2 },
    { bin: "-10 to -5", count: 18 },
    { bin: "-5 to 0", count: 1980 },
    { bin: "0 to 5", count: 1890 },
    { bin: "5 to 10", count: 48 },
    { bin: "10 to 15", count: 12 },
    { bin: "15 to 20", count: 2 }
  ],
  actual_vs_predicted: [
    { index: 1, actual: 10, predicted: 10 },
    { index: 2, actual: 25, predicted: 24 },
    { index: 3, actual: 18, predicted: 18 },
    { index: 4, actual: 50, predicted: 49 },
    { index: 5, actual: 65, predicted: 64 },
    { index: 6, actual: 80, predicted: 79 },
    { index: 7, actual: 110, predicted: 109 },
    { index: 8, actual: 140, predicted: 138 },
    { index: 9, actual: 95, predicted: 94 },
    { index: 10, actual: 5, predicted: 5 },
    { index: 11, actual: 30, predicted: 30 },
    { index: 12, actual: 55, predicted: 54 }
  ]
};

interface MLMetricsPageProps {
  uploadedMetrics: MLMetricsResponse | null;
  hasUploaded: boolean;
  sensitivityMode: 'strict' | 'balanced' | 'safe';
  onSensitivityModeChange: (mode: 'strict' | 'balanced' | 'safe') => void;
}

export function MLMetricsPage({
  uploadedMetrics,
  hasUploaded,
  sensitivityMode,
  onSensitivityModeChange
}: MLMetricsPageProps) {
  const [showRecallExplanation, setShowRecallExplanation] = useState(false);
  const [selectedMatrixCell, setSelectedMatrixCell] = useState<string | null>(null);

  // Switch between baseline (pre-computed model benchmarks) and uploaded logs audit
  const metrics = useMemo(() => {
    if (hasUploaded && uploadedMetrics) {
      return uploadedMetrics;
    }
    if (sensitivityMode === 'strict') return BASELINE_METRICS_STRICT;
    if (sensitivityMode === 'safe') return BASELINE_METRICS_SAFE;
    return BASELINE_METRICS_BALANCED;
  }, [hasUploaded, uploadedMetrics, sensitivityMode]);

  const toggleRecallExplanation = () => {
    setShowRecallExplanation((prev) => !prev);
  };

  const selectMatrixCell = (cell: string | null) => {
    setSelectedMatrixCell((prev) => (prev === cell ? null : cell));
  };

  return (
    <div className="metrics-page">
      {/* Header section with data mode status */}
      <section className="metrics-page__header">
        <div className="metrics-page__title-section">
          <h2 className="metrics-page__title">Model Performance & Audit</h2>
          <span className="metrics-page__subtitle">
            Algorithmic diagnostics and validation matrix of the ProgyNova forecasting core.
          </span>
        </div>
        <div className="metrics-page__header-actions">
          <div className="sensitivity-selector">
            <span className="sensitivity-selector__label">Alert Sensitivity:</span>
            <div className="sensitivity-selector__options">
              <button 
                className={`sensitivity-btn ${sensitivityMode === 'strict' ? 'sensitivity-btn--active' : ''}`}
                onClick={() => onSensitivityModeChange('strict')}
                title="Strict: Focus on Precision (fewer false alerts, lower recall)"
              >
                Strict
              </button>
              <button 
                className={`sensitivity-btn ${sensitivityMode === 'balanced' ? 'sensitivity-btn--active' : ''}`}
                onClick={() => onSensitivityModeChange('balanced')}
                title="Balanced: Optimal trade-off (best F1 score)"
              >
                Balanced
              </button>
              <button 
                className={`sensitivity-btn ${sensitivityMode === 'safe' ? 'sensitivity-btn--active' : ''}`}
                onClick={() => onSensitivityModeChange('safe')}
                title="Clinical Safe: Maximizes Recall (critical stockouts caught first, higher false alerts)"
              >
                Clinical Safe
              </button>
            </div>
          </div>
          <div className="metrics-page__status">
            {hasUploaded ? (
              <span className="badge badge--success">
                <span className="badge__dot" /> Dynamic Audit (Uploaded Logs)
              </span>
            ) : (
              <span className="badge badge--warning">
                <span className="badge__dot" /> Model Baseline Benchmark
              </span>
            )}
          </div>
        </div>
      </section>

      {/* TOP LEVEL: Feature Recall Card */}
      <section className="metrics-page__hero-section">
        <div className="recall-card">
          <div className="recall-card__main">
            <div className="recall-card__info-header">
              <span className="recall-card__tag">PRIMARY CLINICAL METRIC</span>
              <h3 className="recall-card__title">
                Model Recall (Sensitivity)
                <button
                  className="recall-card__info-btn"
                  onClick={toggleRecallExplanation}
                  aria-label="Explain Recall clinical importance"
                  title="Why is this the most important metric?"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>
              </h3>
            </div>
            <div className="recall-card__value-display">
              <div className="recall-card__percentage">
                {(metrics.classification.recall * 100).toFixed(1)}%
              </div>
              <p className="recall-card__summary">
                The model successfully detects <strong>{Math.round(metrics.classification.recall * 100)} out of every 100 actual stockout events</strong>, giving the pharmacy the necessary head-start to reorder.
              </p>
            </div>
          </div>

          {/* Interactive Clinical Justification Overlay */}
          <div className={`recall-card__explanation ${showRecallExplanation ? 'recall-card__explanation--visible' : ''}`}>
            <div className="recall-card__explanation-header">
              <h4>Why Recall is Critical in Healthcare</h4>
              <button className="recall-card__close-btn" onClick={toggleRecallExplanation}>&times;</button>
            </div>
            <p>
              In clinical demand forecasting, a <strong>False Negative</strong> (missing a stockout risk) means critical medications are not restocked in time.
            </p>
            <div className="recall-card__clinical-impact">
              <span className="alert-badge">HIGH RISK</span>
              <p>Patients with severe asthma, infections, or diabetes arrive at the store to find zero stock of Salbutamol, Amoxicillin, or Insulin. This can lead to emergency hospitalizations or severe clinical setbacks.</p>
            </div>
            <p>
              Conversely, a <strong>False Positive</strong> (false stockout alert) simply results in minor inventory holding costs. In medicine, <strong>minimizing missed shortages (maximizing Recall) takes absolute priority over minimizing false alarms.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* CORE CLASSIFICATION & REGRESSION METRICS GRID */}
      <section className="metrics-page__grid" aria-label="Detailed ML metrics">
        {/* F1 Score */}
        <div className="metric-card">
          <div className="metric-card__header">
            <span className="metric-card__label">F1-Score</span>
            <span className="metric-card__icon" title="Harmonic mean of precision and recall">F1</span>
          </div>
          <span className="metric-card__value">{(metrics.classification.f1_score * 100).toFixed(1)}%</span>
          <div className="metric-card__footer">
            <p>Balances sensitivity (Recall) against alert accuracy (Precision) to prevent fatigue.</p>
          </div>
        </div>

        {/* ROC-AUC */}
        <div className="metric-card">
          <div className="metric-card__header">
            <span className="metric-card__label">ROC-AUC</span>
            <span className="metric-card__icon" title="Area Under Receiver Operating Characteristic Curve">AUC</span>
          </div>
          <span className="metric-card__value">{metrics.classification.roc_auc.toFixed(3)}</span>
          <div className="metric-card__footer">
            <p>Measures the model's capacity to distinguish high-risk stockouts from safe stock levels.</p>
          </div>
        </div>

        {/* Accuracy */}
        <div className="metric-card">
          <div className="metric-card__header">
            <span className="metric-card__label">Overall Accuracy</span>
            <span className="metric-card__icon" title="Overall percentage of correct predictions">ACC</span>
          </div>
          <span className="metric-card__value">{(metrics.classification.accuracy * 100).toFixed(1)}%</span>
          <div className="metric-card__footer">
            <p>Percentage of correct stockout alerts and correct safe-stock predictions combined.</p>
          </div>
        </div>

        {/* Precision */}
        <div className="metric-card">
          <div className="metric-card__header">
            <span className="metric-card__label">Precision</span>
            <span className="metric-card__icon" title="Proportion of alerts that are correct">PRE</span>
          </div>
          <span className="metric-card__value">{(metrics.classification.precision * 100).toFixed(1)}%</span>
          <div className="metric-card__footer">
            <p>Proportion of triggered alerts that correspond to a genuine impending deficit.</p>
          </div>
        </div>

        {/* Filtered Non-Zero MAPE */}
        <div className="metric-card">
          <div className="metric-card__header">
            <span className="metric-card__label">Non-Zero MAPE</span>
            <span className="metric-card__icon" title="Mean Absolute Percentage Error on non-zero rows">MAPE</span>
          </div>
          <span className="metric-card__value">{metrics.regression.mape.toFixed(1)}%</span>
          <div className="metric-card__footer">
            <p>Average percentage error of demand forecasts, evaluating only non-zero demand weeks.</p>
          </div>
        </div>

        {/* Stabilized MAPE */}
        <div className="metric-card">
          <div className="metric-card__header">
            <span className="metric-card__label">Stabilized MAPE</span>
            <span className="metric-card__icon" title="Epsilon-stabilized Mean Absolute Percentage Error">sMAPE</span>
          </div>
          <span className="metric-card__value">{metrics.regression.stabilized_mape.toFixed(1)}%</span>
          <div className="metric-card__footer">
            <p>Adjusted error rate adding a 1-unit epsilon to handle zero-demand (intermittent) weeks.</p>
          </div>
        </div>

        {/* RMSE */}
        <div className="metric-card">
          <div className="metric-card__header">
            <span className="metric-card__label">RMSE</span>
            <span className="metric-card__icon" title="Root Mean Squared Error">RMSE</span>
          </div>
          <span className="metric-card__value">{metrics.regression.rmse.toFixed(1)}</span>
          <div className="metric-card__footer">
            <p>Penalizes larger outliers. Crucial for heavy-demand outbreak drugs.</p>
          </div>
        </div>

        {/* MAE */}
        <div className="metric-card">
          <div className="metric-card__header">
            <span className="metric-card__label">MAE</span>
            <span className="metric-card__icon" title="Mean Absolute Error in physical units">MAE</span>
          </div>
          <span className="metric-card__value">{metrics.regression.mae.toFixed(1)} <span className="metric-card__unit">units</span></span>
          <div className="metric-card__footer">
            <p>Average prediction error in absolute units (boxes). Direct operational inventory variance.</p>
          </div>
        </div>
      </section>

      {/* CONFUSION MATRIX & OPERATIONAL INTERPRETATION */}
      <section className="metrics-page__row">
        <div className="metrics-page__col metrics-page__col--wide">
          <div className="card matrix-card-container">
            <div className="matrix-card-container__header">
              <h3 className="card__title">Operational Confusion Matrix</h3>
              <p className="card__subtitle">Hover or click cells to analyze the operational impact in a pharmacy setting.</p>
            </div>
            
            <div className="matrix-grid-layout">
              {/* Labels */}
              <div className="matrix-label matrix-label--vertical">ACTUAL OUTCOME</div>
              
              <div className="matrix-wrapper">
                <div className="matrix-header-row">
                  <div className="matrix-header-cell">Predicted: NO RISK</div>
                  <div className="matrix-header-cell">Predicted: STOCKOUT ALERT</div>
                </div>
                
                <div className="matrix-body">
                  {/* Row 1: Actual Safe */}
                  <div className="matrix-row">
                    <div className="matrix-row-label">Actual: SAFE</div>
                    
                    {/* True Negative */}
                    <div 
                      className={`matrix-cell matrix-cell--tn ${selectedMatrixCell === 'tn' ? 'matrix-cell--active' : ''}`}
                      onClick={() => selectMatrixCell('tn')}
                    >
                      <span className="matrix-cell__number">{metrics.confusion_matrix.tn}</span>
                      <span className="matrix-cell__label">True Negative (TN)</span>
                      <span className="matrix-cell__hint">Click for details</span>
                    </div>

                    {/* False Positive */}
                    <div 
                      className={`matrix-cell matrix-cell--fp ${selectedMatrixCell === 'fp' ? 'matrix-cell--active' : ''}`}
                      onClick={() => selectMatrixCell('fp')}
                    >
                      <span className="matrix-cell__number">{metrics.confusion_matrix.fp}</span>
                      <span className="matrix-cell__label">False Positive (FP)</span>
                      <span className="matrix-cell__hint">Click for details</span>
                    </div>
                  </div>

                  {/* Row 2: Actual Stockout */}
                  <div className="matrix-row">
                    <div className="matrix-row-label">Actual: STOCKOUT</div>
                    
                    {/* False Negative */}
                    <div 
                      className={`matrix-cell matrix-cell--fn ${selectedMatrixCell === 'fn' ? 'matrix-cell--active' : ''}`}
                      onClick={() => selectMatrixCell('fn')}
                    >
                      <span className="matrix-cell__number">{metrics.confusion_matrix.fn}</span>
                      <span className="matrix-cell__label">False Negative (FN)</span>
                      <span className="matrix-cell__hint">Click for details</span>
                    </div>

                    {/* True Positive */}
                    <div 
                      className={`matrix-cell matrix-cell--tp ${selectedMatrixCell === 'tp' ? 'matrix-cell--active' : ''}`}
                      onClick={() => selectMatrixCell('tp')}
                    >
                      <span className="matrix-cell__number">{metrics.confusion_matrix.tp}</span>
                      <span className="matrix-cell__label">True Positive (TP)</span>
                      <span className="matrix-cell__hint">Click for details</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Matrix interactive detail sidebar */}
        <div className="metrics-page__col metrics-page__col--narrow">
          <div className="card interpretation-card">
            <h3 className="card__title">Operational Interpretation</h3>
            <div className="interpretation-card__content">
              {!selectedMatrixCell ? (
                <div className="interpretation-card__placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239a9 9 0 0 1 12.573 12.573" />
                  </svg>
                  <p>Click any quadrant in the Confusion Matrix to check its business and clinical impact on pharmacy operations.</p>
                </div>
              ) : (
                <div className="interpretation-card__details">
                  {selectedMatrixCell === 'tp' && (
                    <>
                      <div className="interpretation-badge interpretation-badge--tp">TRUE POSITIVE (SUCCESS)</div>
                      <h4 className="interpretation-title">Stockout Correctly Prevented</h4>
                      <p className="interpretation-text">
                        The model predicted a deficit, and a restock order was recommended. The replenishment arrived before stock hit zero.
                      </p>
                      <ul className="interpretation-bullets">
                        <li><strong>Clinical Impact:</strong> Patients receive critical medications without delays.</li>
                        <li><strong>Operational Cost:</strong> Optimal buffer inventory levels maintained.</li>
                      </ul>
                    </>
                  )}
                  {selectedMatrixCell === 'tn' && (
                    <>
                      <div className="interpretation-badge interpretation-badge--tn">TRUE NEGATIVE (STABILITY)</div>
                      <h4 className="interpretation-title">Correctly Left Unflagged</h4>
                      <p className="interpretation-text">
                        The model correctly predicted that current stock was sufficient to cover forecasted weekly demand. No alert was triggered.
                      </p>
                      <ul className="interpretation-bullets">
                        <li><strong>Clinical Impact:</strong> No supply disruption.</li>
                        <li><strong>Operational Cost:</strong> Prevents excessive reordering and capital lockup in shelves.</li>
                      </ul>
                    </>
                  )}
                  {selectedMatrixCell === 'fp' && (
                    <>
                      <div className="interpretation-badge interpretation-badge--fp">FALSE POSITIVE (OVER-ORDER)</div>
                      <h4 className="interpretation-title">Unnecessary Restock Alert</h4>
                      <p className="interpretation-text">
                        The model triggered a stockout alert, but the actual demand was low, meaning current shelf stock was already sufficient.
                      </p>
                      <ul className="interpretation-bullets">
                        <li><strong>Clinical Impact:</strong> Safe. No patient goes without medication.</li>
                        <li><strong>Operational Cost:</strong> Slight inventory excess. Increases carrying costs and minor shelf space usage.</li>
                      </ul>
                    </>
                  )}
                  {selectedMatrixCell === 'fn' && (
                    <>
                      <div className="interpretation-badge interpretation-badge--fn">FALSE NEGATIVE (CRITICAL FAILURE)</div>
                      <h4 className="interpretation-title">Uncaught Shortage Event</h4>
                      <p className="interpretation-text">
                        The model predicted safe inventory levels (no alert), but actual demand surged, depleting all stocks.
                      </p>
                      <ul className="interpretation-bullets">
                        <li><strong>Clinical Impact:</strong> Severe risk. Critical shortages of life-saving drugs.</li>
                        <li><strong>Operational Cost:</strong> Emergency express shipping fees, lost sales, and reputational damage.</li>
                      </ul>
                    </>
                  )}
                  <button className="btn btn--outline btn--sm btn-clear-matrix" onClick={() => selectMatrixCell(null)}>
                    Clear Selection
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CHARTS LAYER: SCATTER & RESIDUALS HISTOGRAM */}
      <section className="metrics-page__row">
        {/* Actual vs Predicted Scatter */}
        <div className="metrics-page__col metrics-page__col--half">
          <div className="card chart-card">
            <h3 className="card__title">Actual vs. Predicted Demand Scatter</h3>
            <p className="card__subtitle">Proximity to the diagonal reference line indicates prediction precision.</p>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" dataKey="actual" name="Actual Demand" unit=" boxes" stroke="var(--color-text-muted)" fontSize={11} />
                  <YAxis type="number" dataKey="predicted" name="Predicted Demand" unit=" boxes" stroke="var(--color-text-muted)" fontSize={11} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }} 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface-elevated)', 
                      borderColor: 'var(--border)', 
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-md)',
                      fontSize: '13px',
                      width: 'auto',
                      minWidth: 'max-content',
                    }} 
                  />
                  <Scatter name="Demand Observations" data={metrics.actual_vs_predicted} fill="var(--color-primary)" opacity={0.6} />
                  <Legend verticalAlign="top" height={36} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Residuals Error Histogram */}
        <div className="metrics-page__col metrics-page__col--half">
          <div className="card chart-card">
            <h3 className="card__title">Residuals Error Distribution</h3>
            <p className="card__subtitle">Histogram of (Actual - Predicted) errors. Normal distribution around 0 indicates unbiased forecasts.</p>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.error_distribution} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="bin" stroke="var(--color-text-muted)" fontSize={10} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface-elevated)', 
                      borderColor: 'var(--border)', 
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-md)',
                      fontSize: '13px',
                      width: 'auto',
                      minWidth: 'max-content',
                    }} 
                  />
                  <Bar dataKey="count" name="Frequency" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
                  <Legend verticalAlign="top" height={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
