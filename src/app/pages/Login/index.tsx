import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Lock, Wheat } from 'lucide-react';
import { LoginForm } from './components/LoginForm';
import { DemoCredentials } from './components/DemoCredentials';

export function Login() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg mb-4">
            <Wheat size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">DJ Grain Hub</h1>
          <p className="text-muted-foreground">Automated Rice Vending Management</p>
        </div>

        <Card className="border-t-4 border-t-primary shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign in</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <DemoCredentials />
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Lock size={12} />
              <p>Secured with JWT Authentication</p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
