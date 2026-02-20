import React from 'react';
import { useAuth } from '../../lib/AuthContext';
import { AppearanceSettings } from './AppearanceSettings';
import { KioskModeLauncher } from './KioskModeLauncher';
import { ProfileSettings } from './ProfileSettings';
import { SecuritySettings } from './SecuritySettings';
import { NotificationSettings } from './NotificationSettings';
import { AboutApp } from './AboutApp';

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
        <AppearanceSettings />
        <KioskModeLauncher onNavigate={onNavigate} />
        <ProfileSettings user={user} />
        <SecuritySettings />
        <NotificationSettings />
        <AboutApp logout={logout} />
      </div>
    </div>
  );
}
