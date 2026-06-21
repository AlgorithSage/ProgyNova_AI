import { useMemo, useState } from 'react';

const MAX_CHART_POINTS = 500;
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { ForecastPoint } from '../../types';
import './ForecastChart.css';

interface ForecastChartProps {
  data: ForecastPoint[];
  onSelectItem?: (originalIndex: number) => void;
  isLoading?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="forecast-chart__tooltip">
        <p className="forecast-chart__tooltip-label">Week {label}</p>
        <div className="forecast-chart__tooltip-items">
          {payload.map((item: any, idx: number) => {
            const val = typeof item.value === 'number' ? item.value.toFixed(1) : item.value;
            return (
              <div key={idx} className="forecast-chart__tooltip-item">
                <span 
                  className="item-color-indicator" 
                  style={{ backgroundColor: item.color || item.stroke }} 
                />
                <span className="item-name">{item.name}:</span>
                <span className="item-value">{val}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}

export function ForecastChart({ data, onSelectItem, isLoading }: ForecastChartProps) {
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  const entities = useMemo(() => {
    const unique = [...new Set(data.map((d) => d.entity_id))];
    return unique.sort();
  }, [data]);

  const locations = useMemo(() => {
    const unique = [...new Set(data.map((d) => d.location_id))];
    return unique.sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((d) => {
      const matchEntity = selectedEntity === 'all' || d.entity_id === selectedEntity;
      const matchLocation = selectedLocation === 'all' || d.location_id === selectedLocation;
      return matchEntity && matchLocation;
    });
  }, [data, selectedEntity, selectedLocation]);

  // Down-sample to prevent recharts stack overflow on large datasets
  const sampledData = useMemo(() => {
    if (filteredData.length <= MAX_CHART_POINTS) return filteredData;
    const step = Math.ceil(filteredData.length / MAX_CHART_POINTS);
    return filteredData.filter((_, i) => i % step === 0);
  }, [filteredData]);

  if (isLoading) {
    return (
      <div className="forecast-chart">
        <div className="forecast-chart__skeleton">
          <div className="forecast-chart__skeleton-header">
            <div className="forecast-chart__skeleton-title" />
            <div className="forecast-chart__skeleton-filters">
              <div className="forecast-chart__skeleton-filter" />
              <div className="forecast-chart__skeleton-filter" />
            </div>
          </div>
          <div className="forecast-chart__skeleton-body" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="forecast-chart">
        <div className="forecast-chart__header">
          <h2 className="forecast-chart__title">Demand Forecast</h2>
        </div>
        <div className="forecast-chart__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p>Upload a dataset to view forecast predictions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="forecast-chart">
      <div className="forecast-chart__header">
        <h2 className="forecast-chart__title">Demand Forecast</h2>
        <div className="forecast-chart__filters">
          <select
            className="forecast-chart__select"
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            aria-label="Filter by entity"
          >
            <option value="all">All SKUs</option>
            {entities.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <select
            className="forecast-chart__select"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            aria-label="Filter by location"
          >
            <option value="all">All Locations</option>
            {locations.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="forecast-chart__legend">
        <div className="forecast-chart__legend-item">
          <span className="forecast-chart__legend-color forecast-chart__legend-color--actual" />
          <span className="forecast-chart__legend-label">Actual Demand</span>
        </div>
        <div className="forecast-chart__legend-item">
          <span className="forecast-chart__legend-color forecast-chart__legend-color--forecast" />
          <span className="forecast-chart__legend-label">Forecast</span>
        </div>
      </div>

      <div className="forecast-chart__container">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart
            data={sampledData}
            onClick={(state) => {
              if (state && typeof state.activeTooltipIndex === 'number' && onSelectItem) {
                const point = sampledData[state.activeTooltipIndex];
                if (point) {
                  onSelectItem(point.original_index);
                }
              }
            }}
          >
            <defs>
              <linearGradient id="gradTarget" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-secondary)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--chart-secondary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-primary)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--chart-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="time_index"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-number)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-number)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />
            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="target"
              name="Actual Demand"
              stroke="var(--chart-secondary)"
              fill="url(#gradTarget)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--chart-secondary)' }}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              stroke="var(--chart-primary)"
              fill="url(#gradForecast)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 4, fill: 'var(--chart-primary)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
