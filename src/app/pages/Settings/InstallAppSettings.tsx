import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Download, CheckCircle2, Smartphone } from 'lucide-react';
import { useInstallPrompt } from '../../lib/useInstallPrompt';

export const InstallAppSettings: React.FC = () => {
  const { canInstall, isInstalled, triggerInstall } = useInstallPrompt();

  return (
    <Card className={canInstall ? 'border-l-4 border-l-primary' : ''}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <CardTitle>Install App</CardTitle>
        </div>
        <CardDescription>
          Add DJ Grain Hub to your device's home screen for a native-app experience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isInstalled ? (
          <div className="flex items-center gap-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">App is installed</p>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                You're running DJ Grain Hub as a standalone app.
              </p>
            </div>
          </div>
        ) : canInstall ? (
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              <p>Install this app on your device for faster access, offline support, and a full-screen experience.</p>
            </div>
            <Button onClick={triggerInstall} className="shrink-0">
              <Download className="mr-2 h-4 w-4" /> Install
            </Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>To install, open this page in <strong>Chrome on Android</strong> or <strong>Edge / Chrome on desktop</strong>, then:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Tap the <strong>⋮ menu</strong> (top-right)</li>
              <li>Select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
              <li>Tap <strong>Install</strong> to confirm</li>
            </ol>
            <p className="text-xs pt-1">
              <em>On iOS Safari: tap the Share button → "Add to Home Screen".</em>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
