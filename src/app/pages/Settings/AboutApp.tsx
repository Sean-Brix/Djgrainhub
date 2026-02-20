import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { HelpCircle, FileText, Shield, LogOut } from 'lucide-react';

interface AboutAppProps {
  logout: () => void;
}

export const AboutApp: React.FC<AboutAppProps> = ({ logout }) => {
  return (
    <Card className="bg-muted/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <CardTitle>About DJ Grain Hub</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Version</span>
          <span className="font-mono">v1.2.0</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Build Date</span>
          <span className="font-mono">February 2026</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Support</span>
          <a href="#" className="text-primary hover:underline">support@djgrainhub.com</a>
        </div>
        
        <div className="pt-4 flex gap-2">
          <Button variant="outline" size="sm" className="w-full">
            <FileText className="mr-2 h-4 w-4" /> Terms of Service
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            <Shield className="mr-2 h-4 w-4" /> Privacy Policy
          </Button>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/30 p-4">
         <Button variant="destructive" className="w-full sm:w-auto" onClick={logout}>
           <LogOut className="mr-2 h-4 w-4" /> Log Out
         </Button>
      </CardFooter>
    </Card>
  );
};
