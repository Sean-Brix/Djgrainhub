import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Sun, Moon, Monitor, Sparkles } from 'lucide-react';
import { useTheme } from '../../components/theme-provider';

export const AppearanceSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          <CardTitle>Appearance</CardTitle>
        </div>
        <CardDescription>
          Customize how the application looks on your device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-2">
          <Label>Theme</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
            <Button 
              variant={theme === 'light' ? 'default' : 'outline'} 
              className="flex flex-col items-center justify-center h-20 gap-2"
              onClick={() => setTheme('light')}
            >
              <Sun size={20} />
              <span>Light</span>
            </Button>
            <Button 
              variant={theme === 'dark' ? 'default' : 'outline'} 
              className="flex flex-col items-center justify-center h-20 gap-2"
              onClick={() => setTheme('dark')}
            >
              <Moon size={20} />
              <span>Dark</span>
            </Button>
            <Button 
              variant={theme === 'system' ? 'default' : 'outline'} 
              className="flex flex-col items-center justify-center h-20 gap-2"
              onClick={() => setTheme('system')}
            >
              <Monitor size={20} />
              <span>System</span>
            </Button>
            <Button 
              variant={theme === 'gold' ? 'default' : 'outline'} 
              className="flex flex-col items-center justify-center h-20 gap-2"
              onClick={() => setTheme('gold')}
            >
              <Sparkles size={20} />
              <span>Gold</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
