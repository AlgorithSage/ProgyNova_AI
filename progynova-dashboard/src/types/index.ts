export interface DetectedSchema {
  is_wide: boolean;
  detected_roles: Record<string, string>;
  column_types: Record<string, string>;
}

export interface UploadResponse {
  status: string;
  rows: number;
  columns: string[];
  detected_schema: DetectedSchema;
}

export interface ForecastPoint {
  original_index: number;
  entity_id: string;
  location_id: string;
  time_index: number;
  target: number;
  forecast: number;
}

export interface StockoutAlert {
  original_index: number;
  entity_id: string;
  location_id: string;
  time_index: number;
  stock_on_hand: number;
  forecast: number;
  deficit: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommended_reorder: number;
}

export interface ShapExplanation {
  item_index: number;
  prediction: number;
  base_value: number;
  shap_values: Record<string, number>;
}

export interface HealthResponse {
  status: string;
  model: string;
}

export type Theme = 'light' | 'dark';

export interface RegressionMetrics {
  mae: number;
  rmse: number;
  mape: number;
  stabilized_mape: number;
}

export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
}

export interface ConfusionMatrix {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

export interface ErrorBin {
  bin: string;
  count: number;
}

export interface ScatterPoint {
  index: number;
  actual: number;
  predicted: number;
}

export interface MetricsSummary {
  total_samples: number;
  actual_stockouts: number;
  predicted_alerts: number;
}

export interface MLMetricsResponse {
  summary: MetricsSummary;
  regression: RegressionMetrics;
  classification: ClassificationMetrics;
  confusion_matrix: ConfusionMatrix;
  error_distribution: ErrorBin[];
  actual_vs_predicted: ScatterPoint[];
}
