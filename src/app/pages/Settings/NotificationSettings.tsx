import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import { Bell } from 'lucide-react';

export const NotificationSettings: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle>Notifications</CardTitle>
        </div>
        <CardDescription>
          Configure how you want to be notified.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-2">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="machine-alerts">Machine Alerts</Label>
            <span className="text-xs text-muted-foreground">Receive notifications when machines go offline or encounter errors.</span>
          </div>
          <Switch id="machine-alerts" defaultChecked />
        </div>
        <Separator />
        <div className="flex items-center justify-between space-x-2">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="stock-alerts">Low Stock Warnings</Label>
            <span className="text-xs text-muted-foreground">Get notified when stock levels drop below 20%.</span>
          </div>
          <Switch id="stock-alerts" defaultChecked />
        </div>
        <Separator />
        <div className="flex items-center justify-between space-x-2">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="daily-summary">Daily Summary</Label>
            <span className="text-xs text-muted-foreground">Receive a daily email summary of sales and performance.</span>
          </div>
          <Switch id="daily-summary" />
        </div>
      </CardContent>
    </Card>
  );
};
