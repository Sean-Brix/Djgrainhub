import React from 'react';
import { MonitorPlay, Settings, LogOut } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import type { AuthUser } from '../../../lib/auth';
import logo from 'figma:asset/c35d81f584a09df9348d8ddde3e202e99fefbfbb.png';

interface MobileHeaderProps {
  user: AuthUser;
  roleLabel: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function MobileHeader({ user, roleLabel, onNavigate, onLogout }: MobileHeaderProps) {
  return (
    <div className="md:hidden bg-background/80 backdrop-blur-md border-b border-border p-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
          <img src={logo} alt="Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-lg font-bold tracking-tight text-foreground">Grain Hub</h1>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 bg-secondary shadow-sm">
            <span className="sr-only">Open user menu</span>
            <div className="font-bold text-xs text-secondary-foreground">
              {user.name.charAt(0)}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 mt-2">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">{roleLabel}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onNavigate('kiosk')} className="cursor-pointer">
            <MonitorPlay className="mr-2 h-4 w-4" />
            <span>Kiosk Mode</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onNavigate('settings')} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
