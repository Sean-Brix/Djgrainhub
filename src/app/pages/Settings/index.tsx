import React from 'react';
import { useAuth } from '../../lib/AuthContext';
import { AppearanceSettings } from './AppearanceSettings';
import { KioskModeLauncher } from './KioskModeLauncher';
import { InstallAppSettings } from './InstallAppSettings';
import { NotificationSettings } from './NotificationSettings';
import { PaymentGatewaySettings } from './PaymentGatewaySettings';
import { AboutApp } from './AboutApp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { User, Shield } from 'lucide-react';

interface SettingsProps {
  onNavigate: (page: string) => void;
}

export function Settings({ onNavigate }: SettingsProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-6">
        <InstallAppSettings />
        <AppearanceSettings />
        <KioskModeLauncher onNavigate={onNavigate} />
        <PaymentGatewaySettings />
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your profile information and password in dedicated pages.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start h-11" onClick={() => onNavigate('settings-profile')}>
              <User className="h-4 w-4 mr-2" /> Edit Profile
            </Button>
            <Button variant="outline" className="justify-start h-11" onClick={() => onNavigate('settings-password')}>
              <Shield className="h-4 w-4 mr-2" /> Change Password
            </Button>
          </CardContent>
        </Card>
        <NotificationSettings />
        <AboutApp logout={logout} />
      </div>
    </div>
  );
}
