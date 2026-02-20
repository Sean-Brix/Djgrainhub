import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { MonitorPlay } from 'lucide-react';

interface KioskModeLauncherProps {
  onNavigate: (page: string) => void;
}

export const KioskModeLauncher: React.FC<KioskModeLauncherProps> = ({ onNavigate }) => {
  return (
    <Card className="border-l-4 border-l-primary/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MonitorPlay className="h-5 w-5 text-primary" />
          <CardTitle>Kiosk Mode</CardTitle>
        </div>
        <CardDescription>
          Launch the customer-facing interface for vending.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <p>Use this mode to turn this device into a self-service kiosk.</p>
            <p>The interface will be locked to the purchasing flow.</p>
          </div>
          <Button onClick={() => onNavigate('kiosk')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <MonitorPlay className="mr-2 h-4 w-4" /> Launch Kiosk
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
