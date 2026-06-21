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
