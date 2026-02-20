import React from 'react';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/theme-provider';
import { AuthProvider } from './lib/AuthContext';
import { DataProvider } from './lib/DataContext';
import { PushNotificationsProvider } from './lib/PushNotifications';
import { AppContent } from './components/AppContent';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider>
        <DataProvider>
          <PushNotificationsProvider>
            <AppContent />
            <Toaster />
          </PushNotificationsProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;