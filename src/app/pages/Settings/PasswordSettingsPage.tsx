import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { SecuritySettings } from './SecuritySettings';

interface PasswordSettingsPageProps {
  onNavigate: (page: string) => void;
}

export function PasswordSettingsPage({ onNavigate }: PasswordSettingsPageProps) {
  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => onNavigate('settings')}>
          <ArrowLeft size={14} className="mr-1.5" /> Back to Settings
        </Button>
      </div>
      <SecuritySettings />
    </div>
  );
}
