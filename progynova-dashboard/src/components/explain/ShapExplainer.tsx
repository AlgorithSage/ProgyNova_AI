import { useMemo } from 'react';
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
}

export function ShapExplainer({ explanation, selectedEntity }: ShapExplainerProps) {
  const chartData = useMemo(() => {
    if (!explanation) return [];

    return Object.entries(explanation.shap_values)
      .map(([feature, value]) => ({ feature, value }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [explanation]);

  if (!explanation) {
    return (
      <div className="shap-explainer">
        <div className="shap-explainer__header">
          <h2 className="shap-explainer__title">Feature Explanation</h2>
        </div>
        <div className="shap-explainer__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p>Select an item from the alerts table</p>
          <span className="shap-explainer__empty-hint">to view SHAP feature contributions</span>
        </div>
      </div>
    );
  }

  return (
    <div className="shap-explainer">
      <div className="shap-explainer__header">
        <h2 className="shap-explainer__title">Feature Explanation</h2>
        {selectedEntity && (
          <span className="shap-explainer__entity mono">{selectedEntity}</span>
        )}
      </div>

      <div className="shap-explainer__meta">
        <div className="shap-explainer__meta-item">
          <span className="shap-explainer__meta-label">Base Value</span>
          <span className="shap-explainer__meta-value mono">{explanation.base_value.toFixed(2)}</span>
        </div>
        <div className="shap-explainer__meta-item">
          <span className="shap-explainer__meta-label">Prediction</span>
          <span className="shap-explainer__meta-value shap-explainer__meta-value--primary mono">
            {explanation.prediction.toFixed(2)}
          </span>
        </div>
        <div className="shap-explainer__meta-item">
          <span className="shap-explainer__meta-label">Delta</span>
          <span className={`shap-explainer__meta-value mono ${
            explanation.prediction - explanation.base_value >= 0 ? 'shap-explainer__meta-value--positive' : 'shap-explainer__meta-value--negative'
          }`}>
            {explanation.prediction - explanation.base_value >= 0 ? '+' : ''}
            {(explanation.prediction - explanation.base_value).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="shap-explainer__chart">
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              type="category"
              dataKey="feature"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              width={95}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-lg)',
              }}
              formatter={(value) => [Number(value).toFixed(4), 'SHAP Value']}
            />
            <ReferenceLine x={0} stroke="var(--border)" />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
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
  );
}
