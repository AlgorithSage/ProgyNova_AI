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
  const [currentFiles, setCurrentFiles] = useState<File[]>([]);

  // Data states
  const [, setUploadResult] = useState<UploadResponse | null>(null);
  const [forecasts, setForecasts] = useState<ForecastPoint[]>([]);
  const [alerts, setAlerts] = useState<StockoutAlert[]>([]);
  const [explanation, setExplanation] = useState<ShapExplanation | null>(null);
  const [selectedOriginalIndex, setSelectedOriginalIndex] = useState<number | null>(null);

  // UI states
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);

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

  const handleUploadSuccess = useCallback(async (response: UploadResponse, files: File[]) => {
    setUploadResult(response);
    setCurrentFiles(files);
    setExplanation(null);
    setSelectedOriginalIndex(null);
    setIsExplainerOpen(false);
    setIsDataLoading(true);

    try {
      const [forecastData, alertData] = await Promise.all([
        getForecast(files),
        getAlerts(files),
      ]);
      setForecasts(forecastData);
      setAlerts(alertData);
    } catch (error) {
      console.error('[Upload Success Error]', error);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  const handleUploadError = useCallback((error: string) => {
    console.error('[Upload Error]', error);
  }, []);

  const handleSelectAlert = useCallback(async (originalIndex: number) => {
    setSelectedOriginalIndex(originalIndex);
    setIsExplainerOpen(true);

    if (currentFiles.length > 0) {
      setIsExplanationLoading(true);
      try {
        const result = await getExplanation(currentFiles, originalIndex);
        setExplanation(result);
      } catch (error) {
        console.error('[Explanation Error]', error);
      } finally {
        setIsExplanationLoading(false);
      }
    }
  }, [currentFiles]);

  const handleCloseExplainer = useCallback(() => {
    setIsExplainerOpen(false);
    setSelectedOriginalIndex(null);
    setExplanation(null);
  }, []);

  // Resolve selected entity name
  const selectedAlert = alerts.find((a) => a.original_index === selectedOriginalIndex);
  const selectedForecast = forecasts.find((f) => f.original_index === selectedOriginalIndex);
  const selectedEntity = selectedAlert
    ? selectedAlert.entity_id
    : (selectedForecast ? selectedForecast.entity_id : '');

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
            <ForecastChart
              data={forecasts}
              onSelectItem={handleSelectAlert}
              isLoading={isDataLoading}
            />
          </div>
          <div className="dashboard__col dashboard__col--narrow">
            <ReorderApprovalCard
              alerts={alerts}
              isLoading={isDataLoading}
            />
          </div>
        </section>

        {/* Row 3: Stockout Alerts — Full dedicated section */}
        <section className={`dashboard__row dashboard__row--alerts ${isExplainerOpen ? 'dashboard__row--alerts-split' : ''}`}>
          <div className={`dashboard__alerts-col ${isExplainerOpen ? 'dashboard__alerts-col--retracted' : ''}`}>
            <AlertsTable
              alerts={alerts}
              onSelectItem={handleSelectAlert}
              selectedOriginalIndex={selectedOriginalIndex}
              isLoading={isDataLoading}
              isExplainerOpen={isExplainerOpen}
              onCloseExplainer={handleCloseExplainer}
            />
          </div>

          {/* Explainer panel — slides in when an alert is selected */}
          <div className={`dashboard__explainer-col ${isExplainerOpen ? 'dashboard__explainer-col--open' : ''}`}>
            <ShapExplainer
              explanation={explanation}
              selectedEntity={selectedEntity}
              isLoading={isExplanationLoading}
              isOpen={isExplainerOpen}
              onClose={handleCloseExplainer}
            />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

export default App;
