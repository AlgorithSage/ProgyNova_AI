import type {
  UploadResponse,
  ForecastPoint,
  StockoutAlert,
  ShapExplanation,
  HealthResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T | null> {
  if (!API_BASE) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`[API] ${endpoint} failed:`, error);
    return null;
  }
}

export async function checkHealth(): Promise<HealthResponse | null> {
  return request<HealthResponse>('/health');
}

export async function uploadCSV(files: File[]): Promise<UploadResponse | null> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file);
  });

  return request<UploadResponse>('/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function getForecast(files: File[]): Promise<ForecastPoint[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file);
  });

  const result = await request<ForecastPoint[]>('/forecast', {
    method: 'POST',
    body: formData,
  });

  return result ?? [];
}

export async function getAlerts(files: File[]): Promise<StockoutAlert[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file);
  });

  const result = await request<StockoutAlert[]>('/alerts', {
    method: 'POST',
    body: formData,
  });

  return result ?? [];
}

export async function getExplanation(
  files: File[],
  itemIndex: number
): Promise<ShapExplanation | null> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file);
  });

  return request<ShapExplanation>(
    `/explain?item_index=${itemIndex}`,
    {
      method: 'POST',
      body: formData,
    }
  );
}
