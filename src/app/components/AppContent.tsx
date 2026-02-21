import React, { useState, useEffect } from 'react';
import { Layout } from '@/app/pages/Layout/index';
import { Dashboard } from '@/app/pages/Dashboard/index';
import { Machines } from '@/app/pages/Machines/index';
import { Transactions } from '@/app/pages/Transactions/index';
import { Settings } from '@/app/pages/Settings/index';
import { Reports } from '@/app/pages/Reports/index';
import Kiosk from '@/app/pages/Kiosk/index';
import { Login } from '@/app/pages/Login/index';
import { DevPayMongo } from '@/app/pages/DevPayMongo/index';
import { DevMqtt } from '@/app/pages/DevMqtt/index';
import { useAuth } from '../lib/AuthContext';
import { Wheat } from 'lucide-react';

export function AppContent() {
  const { user, loading, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('dj-hub-current-page') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('dj-hub-current-page', currentPage);
  }, [currentPage]);

  // Show loading spinner while checking JWT session
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <Wheat size={32} />
          </div>
          <p className="text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleLogout = () => {
    logout();
    setCurrentPage('dashboard');
  };

  // Kiosk mode bypasses the standard layout
  if (currentPage === 'kiosk') {
    return <Kiosk onExit={() => setCurrentPage('dashboard')} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'machines':
        return <Machines />;
      case 'transactions':
        return <Transactions />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings onNavigate={setCurrentPage} />;
      case 'dev-paymongo':
        return <DevPayMongo />;
      case 'dev-mqtt':
        return <DevMqtt />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout 
      currentPage={currentPage} 
      onNavigate={setCurrentPage} 
      onLogout={handleLogout}
      user={user}
    >
      {renderPage()}
    </Layout>
  );
}