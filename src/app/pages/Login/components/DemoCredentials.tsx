import React from 'react';
import { ShieldCheck, Shield } from 'lucide-react';

export const DemoCredentials: React.FC = () => {
  return (
    <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
      <p className="text-xs font-medium text-muted-foreground mb-3 text-center">Demo Credentials</p>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck size={14} className="text-primary shrink-0" />
          <div>
            <span className="font-medium">Super Admin:</span>{' '}
            <code className="bg-background px-1.5 py-0.5 rounded text-[11px]">superadmin</code>{' / '}
            <code className="bg-background px-1.5 py-0.5 rounded text-[11px]">superadmin123</code>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Shield size={14} className="text-muted-foreground shrink-0" />
          <div>
            <span className="font-medium">Admin:</span>{' '}
            <code className="bg-background px-1.5 py-0.5 rounded text-[11px]">maria</code>{' / '}
            <code className="bg-background px-1.5 py-0.5 rounded text-[11px]">admin123</code>
          </div>
        </div>
      </div>
    </div>
  );
};
