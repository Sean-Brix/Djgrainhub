import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { CreditCard, FlaskConical } from 'lucide-react';

export const PAYMENT_TEST_MODE_KEY = 'payment_gateway_testing_mode';

export const PaymentGatewaySettings: React.FC = () => {
  const [testMode, setTestMode] = useState<boolean>(() => {
    return localStorage.getItem(PAYMENT_TEST_MODE_KEY) === 'true';
  });

  const handleToggle = (checked: boolean) => {
    setTestMode(checked);
    localStorage.setItem(PAYMENT_TEST_MODE_KEY, String(checked));
  };

  return (
    <Card className={testMode ? 'border-l-4 border-l-amber-400' : ''}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>Payment Gateway</CardTitle>
        </div>
        <CardDescription>
          Configure payment processing behavior for the kiosk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-2">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="payment-test-mode">Payment Gateway Testing Mode</Label>
              {testMode && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <FlaskConical size={11} />
                  Active
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {testMode
                ? 'The kiosk will simulate a successful payment after 5 seconds without contacting PayMongo.'
                : 'The kiosk will wait for a real QR Ph payment via PayMongo before proceeding.'}
            </span>
          </div>
          <Switch
            id="payment-test-mode"
            checked={testMode}
            onCheckedChange={handleToggle}
          />
        </div>
        {testMode && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold mb-1">⚠ Testing Mode is ON</p>
            <p className="text-xs leading-relaxed">
              Payments will be automatically approved after a 5-second simulated delay.
              No actual transaction will be processed. Turn this off before going live.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
