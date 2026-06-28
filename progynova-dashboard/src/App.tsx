import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { CSVUploader } from './components/upload/CSVUploader';
import { ForecastChart } from './components/forecast/ForecastChart';
import { AlertsTable } from './components/alerts/AlertsTable';
import { ShapExplainer } from './components/explain/ShapExplainer';
import { MLMetricsPage } from './components/metrics/MLMetricsPage';
import { DocsPage } from './components/docs/DocsPage';
import { LandingPage } from './components/landing/LandingPage';
import { AuthPage } from './components/auth/AuthPage';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { auth } from './firebase';
import { getForecast, getAlerts, getExplanation, checkHealth, getMetrics } from './services/api';
import { applyTheme } from './mtheme';
import type { Theme, ForecastPoint, StockoutAlert, ShapExplanation, UploadResponse, MLMetricsResponse } from './types';
import './App.css';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('progynova-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ── Navigation model ────────────────────────────────────────────────────────
// The app is a single-page state machine (no router). We mirror each view into
// the browser history stack so the Back button walks the view stack (instead of
// exiting the app), and we gate the in-app views behind Firebase auth (RBAC).
type View = 'landing' | 'auth' | 'dashboard' | 'metrics' | 'docs';

/** Views that require a signed-in user. Everything else is public. */
const PROTECTED_VIEWS: ReadonlySet<View> = new Set(['dashboard', 'metrics', 'docs']);
const isProtected = (v: View): boolean => PROTECTED_VIEWS.has(v);

const VIEW_STORAGE_KEY = 'progynova-view';

/** Restore the last in-app view after a reload (only protected views are cached). */
function getInitialView(): View {
  const saved = sessionStorage.getItem(VIEW_STORAGE_KEY) as View | null;
  if (saved && isProtected(saved)) return saved;
  return 'landing';
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isConnected, setIsConnected] = useState(false);
  const [currentFiles, setCurrentFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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
  const alertsRowRef = useRef<HTMLDivElement>(null);

  // View & ML Metrics states
  const [currentView, setCurrentView] = useState<View>(getInitialView);
  const [uploadedMetrics, setUploadedMetrics] = useState<MLMetricsResponse | null>(null);
  const [sensitivityMode, setSensitivityMode] = useState<'strict' | 'balanced' | 'safe'>('balanced');

  // Firebase auth state — tracks the signed-in user across the app.
  // `authReady` flips true after the first auth callback so we don't flash a
  // protected view (or bounce a still-restoring user) before persistence loads.
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Latest currentView for use inside event listeners that subscribe once.
  const currentViewRef = useRef<View>(currentView);
  useEffect(() => { currentViewRef.current = currentView; }, [currentView]);

  // Where to send the user once they finish signing in (set when a launch button
  // bounces an unauthenticated user to the auth page).
  const pendingViewRef = useRef<View>('dashboard');

  // ── History-stack navigation ──────────────────────────────────────────────
  /** Navigate to a view and record it in the browser history stack. */
  const navigate = useCallback((view: View, opts?: { replace?: boolean }) => {
    setCurrentView(view);
    const state = { view };
    if (opts?.replace) window.history.replaceState(state, '');
    else window.history.pushState(state, '');
  }, []);

  /** Guarded navigation used by launch/CTA links: protected views require auth. */
  const requestView = useCallback((view: View) => {
    if (isProtected(view) && !auth.currentUser) {
      pendingViewRef.current = view;     // remember intended destination
      navigate('auth');
      return;
    }
    navigate(view);
  }, [navigate]);

  // Seed the initial history entry + handle Back/Forward (popstate).
  useEffect(() => {
    window.history.replaceState({ view: currentViewRef.current }, '');
    const onPop = (e: PopStateEvent) => {
      const view = ((e.state as { view?: View } | null)?.view) ?? 'landing';
      // Re-apply the auth guard on Back/Forward so protected views can't be
      // reached without a session.
      if (isProtected(view) && !auth.currentUser) {
        setCurrentView('landing');
        return;
      }
      setCurrentView(view);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Persist the current view so a reload restores the in-app page (cache).
  useEffect(() => {
    if (isProtected(currentView)) sessionStorage.setItem(VIEW_STORAGE_KEY, currentView);
    else sessionStorage.removeItem(VIEW_STORAGE_KEY);
  }, [currentView]);

  // ── Auth lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthUser(u);
      setAuthReady(true);
      // If the session ends (or never existed) while on a protected view, leave.
      if (!u && isProtected(currentViewRef.current)) {
        navigate('landing', { replace: true });
      }
    });
    return unsub;
  }, [navigate]);

  /** Called by AuthPage on a successful sign-in. */
  const handleAuthenticated = useCallback(() => {
    const dest = pendingViewRef.current || 'dashboard';
    pendingViewRef.current = 'dashboard';
    // Replace the 'auth' entry so Back from the dashboard skips the login page
    // and returns to the landing page instead.
    navigate(dest, { replace: true });
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('[Auth] sign-out failed', err);
    }
    sessionStorage.removeItem(VIEW_STORAGE_KEY);
    pendingViewRef.current = 'dashboard';
    navigate('landing', { replace: true });
  }, [navigate]);

  // Apply theme dynamically using the theme manager
  useEffect(() => {
    applyTheme(theme);
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
    setExplanation(null);
    setSelectedOriginalIndex(null);
    setIsExplainerOpen(false);
    setIsDataLoading(true);

    try {
      const forecastData = await getForecast(files);
      setForecasts(forecastData);
      setCurrentFiles(files);
      setIsDataLoading(false);
    } catch (error) {
      console.error('[Upload Success Error]', error);
      setIsDataLoading(false);
    }
  }, []);

  // Load alerts and metrics when currentFiles, forecasts, or sensitivityMode changes
  useEffect(() => {
    if (forecasts.length === 0) {
      setAlerts([]);
      setUploadedMetrics(null);
      return;
    }

    const fetchAlertsAndMetrics = async () => {
      setIsDataLoading(true);
      try {
        const modeParams = {
          strict: { multiplier: 1.0, buffer: 0.0 },
          balanced: { multiplier: 1.0, buffer: 5.0 },
          safe: { multiplier: 1.05, buffer: 1.0 }
        }[sensitivityMode];

        const [alertData, metricsData] = await Promise.all([
          getAlerts(currentFiles, modeParams.multiplier, modeParams.buffer),
          getMetrics(currentFiles, modeParams.multiplier, modeParams.buffer)
        ]);

        setAlerts(alertData);
        setUploadedMetrics(metricsData);
      } catch (error) {
        console.error('[Sensitivity/Files Fetch Error]', error);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchAlertsAndMetrics();
  }, [currentFiles, forecasts, sensitivityMode]);

  const handleUploadError = useCallback((error: string) => {
    console.error('[Upload Error]', error);
  }, []);

  const handleSelectAlert = useCallback(async (originalIndex: number) => {
    setSelectedOriginalIndex(originalIndex);
    setIsExplainerOpen(true);

    requestAnimationFrame(() => {
      alertsRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    if (forecasts.length > 0) {
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
  }, [currentFiles, forecasts.length]);

  const handleCloseExplainer = useCallback(() => {
    setIsExplainerOpen(false);
    setSelectedOriginalIndex(null);
    setExplanation(null);
  }, []);

  const handleNavClick = useCallback((sectionId: string) => {
    if (sectionId === 'dashboard') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      return;
    }

    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, currentView !== 'dashboard' ? 100 : 0);
  }, [currentView]);

  // Filter alerts in real-time using search query from Top Bar
  const filteredAlerts = useMemo(() => {
    if (!searchQuery) return alerts;
    const q = searchQuery.toLowerCase();
    return alerts.filter(
      (a) =>
        a.entity_id.toLowerCase().includes(q) ||
        a.location_id.toLowerCase().includes(q) ||
        a.severity.toLowerCase().includes(q)
    );
  }, [alerts, searchQuery]);

  // Expose triggers for file import button
  const handleImportClick = useCallback(() => {
    const input = document.querySelector('.csv-uploader__input') as HTMLInputElement | null;
    if (input) {
      input.click();
    }
  }, []);

  // Export order CSV sheet
  const handleExportCSV = useCallback(() => {
    if (alerts.length === 0) return;
    const headers = ['entity_id', 'location_id', 'time_index', 'stock_on_hand', 'forecast', 'deficit', 'severity', 'recommended_reorder'];
    const rows = alerts.map((a) =>
      [a.entity_id, a.location_id, a.time_index, a.stock_on_hand, a.forecast.toFixed(1), a.deficit.toFixed(1), a.severity, a.recommended_reorder.toFixed(0)].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reorder_recommendations_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [alerts]);

  // Donezo Summary Card calculations
  const criticalCount = useMemo(() => alerts.filter((a) => a.severity === 'CRITICAL').length, [alerts]);
  const totalDeficit = useMemo(() => alerts.reduce((sum, a) => sum + a.deficit, 0), [alerts]);
  const totalReorder = useMemo(() => alerts.reduce((sum, a) => sum + a.recommended_reorder, 0), [alerts]);

  // Resolve selected entity name
  const selectedAlert = alerts.find((a) => a.original_index === selectedOriginalIndex);
  const selectedForecast = forecasts.find((f) => f.original_index === selectedOriginalIndex);
  const selectedEntity = selectedAlert
    ? selectedAlert.entity_id
    : (selectedForecast ? selectedForecast.entity_id : '');

  // Hold protected views behind a lightweight loader until Firebase has
  // restored (or cleared) the persisted session — prevents a flash of the
  // dashboard for a user whose session is still loading.
  if (isProtected(currentView) && !authReady) {
    return (
      <div className="app-boot" role="status" aria-live="polite">
        <span className="app-boot__spinner" aria-hidden="true" />
        <span className="app-boot__text">Loading your workspace…</span>
      </div>
    );
  }

  // Auth resolved with no user on a protected view: render the public landing
  // page while the auth effect redirects (never leak the dashboard).
  if (isProtected(currentView) && !authUser) {
    return <LandingPage onViewChange={requestView} />;
  }

  if (currentView === 'landing') {
    return <LandingPage onViewChange={requestView} />;
  }

  if (currentView === 'auth') {
    return <AuthPage onAuthenticated={handleAuthenticated} onClose={() => navigate('landing')} />;
  }

  return (
    <AppLayout
      theme={theme}
      onToggleTheme={toggleTheme}
      isConnected={isConnected}
      alertsCount={alerts.length}
      criticalCount={criticalCount}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      currentView={currentView}
      onViewChange={(view) => requestView(view as View)}
      onNavClick={handleNavClick}
      userName={authUser?.displayName || authUser?.phoneNumber || 'Account'}
      userEmail={authUser?.email || authUser?.phoneNumber || ''}
      userPhotoURL={authUser?.photoURL || undefined}
      onSignOut={handleSignOut}
    >
      {currentView === 'dashboard' ? (
        <div id="dashboard" className="dashboard">
          {/* Dashboard Header Title + Buttons */}
          <section className="dashboard__header">
            <div className="dashboard__title-section">
              <h2 className="dashboard__title">Dashboard</h2>
              <span className="dashboard__subtitle">Plan, prioritize, and accomplish your forecasting tasks with ease.</span>
            </div>
            <div className="dashboard__actions">
              <button
                className="btn btn--outline"
                onClick={handleImportClick}
                title="Import new CSV forecast data"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import Data
              </button>
              <button
                className="btn btn--primary"
                onClick={handleExportCSV}
                title="Export restock order sheets as spreadsheet"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                Export Order Sheet
              </button>
            </div>
          </section>

          {/* Donezo Top Metrics Row */}
          <section className="dashboard__metrics-grid" aria-label="Key summaries">
            {/* Card 1: Total Alerts (Donezo colored accent card) */}
            <div className="dashboard__metric-card dashboard__metric-card--primary">
              <div className="dashboard__metric-header">
                <span className="dashboard__metric-label">Total Alerts</span>
                <div className="dashboard__metric-icon-circle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                </div>
              </div>
              <span className="dashboard__metric-value">{alerts.length}</span>
              <div className="dashboard__metric-footer">
                <span>Total alerts detected</span>
              </div>
            </div>

            {/* Card 2: Critical Alerts */}
            <div className="dashboard__metric-card">
              <div className="dashboard__metric-header">
                <span className="dashboard__metric-label">Critical Alerts</span>
                <div className="dashboard__metric-icon-circle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  </svg>
                </div>
              </div>
              <span className="dashboard__metric-value">{criticalCount}</span>
              <div className="dashboard__metric-footer">
                <span>On active warning</span>
              </div>
            </div>

            {/* Card 3: Total Deficit */}
            <div className="dashboard__metric-card">
              <div className="dashboard__metric-header">
                <span className="dashboard__metric-label">Total Deficit</span>
                <div className="dashboard__metric-icon-circle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              </div>
              <span className="dashboard__metric-value">{totalDeficit.toFixed(0)}</span>
              <div className="dashboard__metric-footer">
                <span>Units needed</span>
              </div>
            </div>

            {/* Card 4: Recommended Reorders */}
            <div className="dashboard__metric-card">
              <div className="dashboard__metric-header">
                <span className="dashboard__metric-label">Suggested Replenish</span>
                <div className="dashboard__metric-icon-circle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                </div>
              </div>
              <span className="dashboard__metric-value">{totalReorder.toFixed(0)}</span>
              <div className="dashboard__metric-footer">
                <span>Units recommended</span>
              </div>
            </div>
          </section>

          {/* Forecast Chart + CSV Upload card side-by-side */}
          <section id="forecast" className="dashboard__row">
            <div className="dashboard__col dashboard__col--wide">
              <ForecastChart
                data={forecasts}
                onSelectItem={handleSelectAlert}
                isLoading={isDataLoading}
              />
            </div>
            <div className="dashboard__col dashboard__col--narrow">
              <CSVUploader
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>
          </section>

          {/* Stockout Alerts - Full dedicated section */}
          <section
            id="alerts"
            ref={alertsRowRef}
            className={`dashboard__row dashboard__row--alerts ${isExplainerOpen ? 'dashboard__row--alerts-split' : ''}`}
          >
            <div className={`dashboard__alerts-col ${isExplainerOpen ? 'dashboard__alerts-col--retracted' : ''}`}>
              <AlertsTable
                alerts={filteredAlerts}
                onSelectItem={handleSelectAlert}
                selectedOriginalIndex={selectedOriginalIndex}
                isLoading={isDataLoading}
                isExplainerOpen={isExplainerOpen}
                onCloseExplainer={handleCloseExplainer}
              />
            </div>

            {/* Explainer panel - slides in when an alert is selected */}
            <div id="explain" className={`dashboard__explainer-col ${isExplainerOpen ? 'dashboard__explainer-col--open' : ''}`}>
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
      ) : currentView === 'metrics' ? (
        <MLMetricsPage 
          uploadedMetrics={uploadedMetrics} 
          hasUploaded={currentFiles.length > 0 || uploadedMetrics !== null} 
          sensitivityMode={sensitivityMode}
          onSensitivityModeChange={setSensitivityMode}
        />
      ) : (
        <DocsPage />
      )}
    </AppLayout>
  );
}

export default App;
