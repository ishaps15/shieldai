import React, { useState, useEffect } from 'react';
import { Sidebar, NavPage } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Alerts } from './pages/Alerts';
import { Thresholds } from './pages/Thresholds';
import { DriftMonitoring } from './pages/DriftMonitoring';
import { ModelEvaluation } from './pages/ModelEvaluation';
import { Ingestion } from './pages/Ingestion';
import { Settings } from './pages/Settings';
import { api } from './services/api';

export function App() {
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeModel, setActiveModel] = useState('Isolation Forest v1.0');
  const [driftStatus, setDriftStatus] = useState('Stable');
  const [alertCount, setAlertCount] = useState(18);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const pageMeta: Record<NavPage, { title: string; category: string }> = {
    dashboard: { title: 'Surveillance Operations', category: 'SURVEILLANCE' },
    transactions: { title: 'Transaction Stream & Signals', category: 'SURVEILLANCE' },
    alerts: { title: 'Alert Center & Incident Triage', category: 'SURVEILLANCE' },
    thresholds: { title: 'Threshold Sandbox & Policy Engine', category: 'MACHINE LEARNING' },
    drift: { title: 'Feature & Model Drift Monitoring', category: 'MACHINE LEARNING' },
    evaluation: { title: 'Supervised Evaluation & PR Curves', category: 'MACHINE LEARNING' },
    ingestion: { title: 'Data Ingestion & CSV Diagnostics', category: 'DATA PLATFORM' },
    settings: { title: 'Methodology, Math & Config', category: 'DATA PLATFORM' },
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const stats = await api.getDashboardStats();
      if (stats.active_model) {
        setActiveModel(`${stats.active_model.model_type} (${stats.active_model.version})`);
      }
      if (stats.drift_status) {
        setDriftStatus(stats.drift_status);
      }
      if (stats.review_backlog !== undefined) {
        setAlertCount(stats.review_backlog);
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <div className="flex h-screen bg-[#FAF7F7] text-charcoal-800 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        alertCount={alertCount}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#FAF7F7]">
        <Header
          currentPage={currentPage}
          onNavigate={(page) => setCurrentPage(page)}
          pageTitle={pageMeta[currentPage].title}
          category={pageMeta[currentPage].category}
          activeModelName={activeModel}
          driftStatus={driftStatus}
          onRefresh={handleRefresh}
          isRefreshing={refreshing}
        />

        <main className="flex-1 overflow-y-auto px-6 py-8 bg-gradient-to-b from-[#FAF7F7] via-blush-50/25 to-[#FAF7F7]">
          <div className="max-w-7xl mx-auto" key={refreshKey}>
            {currentPage === 'dashboard' && <Dashboard onNavigate={(page) => setCurrentPage(page)} />}
            {currentPage === 'transactions' && <Transactions />}
            {currentPage === 'alerts' && <Alerts />}
            {currentPage === 'thresholds' && <Thresholds />}
            {currentPage === 'drift' && <DriftMonitoring />}
            {currentPage === 'evaluation' && <ModelEvaluation />}
            {currentPage === 'ingestion' && <Ingestion />}
            {currentPage === 'settings' && <Settings />}
          </div>
          <Footer onNavigate={(page) => setCurrentPage(page)} />
        </main>
      </div>
    </div>
  );
}

export default App;
