import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { CSVUploader } from './components/upload/CSVUploader';
import { ForecastChart } from './components/forecast/ForecastChart';
import { AlertsTable } from './components/alerts/AlertsTable';
import { ShapExplainer } from './components/explain/ShapExplainer';
import { ReorderApprovalCard } from './components/reorder/ReorderApprovalCard';
import { getForecast, getAlerts, getExplanation, checkHealth } from './services/api';
import type { Theme, ForecastPoint, StockoutAlert, ShapExplanation, UploadResponse } from './types';
import './App.css';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('progynova-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isConnected, setIsConnected] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  // Data states — all start empty
  const [, setUploadResult] = useState<UploadResponse | null>(null);
  const [forecasts, setForecasts] = useState<ForecastPoint[]>([]);
  const [alerts, setAlerts] = useState<StockoutAlert[]>([]);
  const [explanation, setExplanation] = useState<ShapExplanation | null>(null);
  const [selectedAlertIndex, setSelectedAlertIndex] = useState<number | null>(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('progynova-theme', theme);
  }, [theme]);

  // Check backend health on mount
  useEffect(() => {
    checkHealth().then((result) => {
      setIsConnected(result !== null);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const handleUploadSuccess = useCallback(async (response: UploadResponse, file: File) => {
    setUploadResult(response);
    setCurrentFile(file);
    setExplanation(null);
    setSelectedAlertIndex(null);

    // Fetch forecast and alerts in parallel
    const [forecastData, alertData] = await Promise.all([
      getForecast(file),
      getAlerts(file),
    ]);

    setForecasts(forecastData);
    setAlerts(alertData);
  }, []);

  const handleUploadError = useCallback((error: string) => {
    console.error('[Upload Error]', error);
  }, []);

  const handleSelectAlert = useCallback(async (index: number) => {
    setSelectedAlertIndex(index);

    if (currentFile) {
      const result = await getExplanation(currentFile, index);
      setExplanation(result);
    }
  }, [currentFile]);

  const selectedEntity = selectedAlertIndex !== null && alerts[selectedAlertIndex]
    ? alerts[selectedAlertIndex].entity_id
    : '';

  return (
    <AppLayout
      theme={theme}
      onToggleTheme={toggleTheme}
      isConnected={isConnected}
    >
      <div className="dashboard">
        {/* Row 1: Upload */}
        <section className="dashboard__row dashboard__row--upload">
          <CSVUploader
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </section>

        {/* Row 2: Forecast Chart + Reorder Summary */}
        <section className="dashboard__row dashboard__row--forecast">
          <div className="dashboard__col dashboard__col--wide">
            <ForecastChart data={forecasts} onSelectItem={handleSelectAlert} />
          </div>
          <div className="dashboard__col dashboard__col--narrow">
            <ReorderApprovalCard alerts={alerts} />
          </div>
        </section>

        {/* Row 3: Alerts Table + SHAP Explainer */}
        <section className="dashboard__row dashboard__row--analysis">
          <div className="dashboard__col dashboard__col--wide">
            <AlertsTable
              alerts={alerts}
              onSelectItem={handleSelectAlert}
              selectedIndex={selectedAlertIndex}
            />
          </div>
          <div className="dashboard__col dashboard__col--narrow">
            <ShapExplainer
              explanation={explanation}
              selectedEntity={selectedEntity}
            />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

export default App;
