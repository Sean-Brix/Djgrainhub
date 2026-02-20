import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { motion } from 'motion/react';
import type { AuthUser } from '../../../lib/auth';
import logo from 'figma:asset/c35d81f584a09df9348d8ddde3e202e99fefbfbb.png';

interface DesktopSidebarProps {
  user: AuthUser;
  roleLabel: string;
  navItems: any[];
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function DesktopSidebar({ user, roleLabel, navItems, currentPage, onNavigate, onLogout }: DesktopSidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0 overflow-hidden">
      <div className="p-6 flex items-center gap-3 border-b border-sidebar-border/20">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-12 h-12 flex items-center justify-center overflow-hidden"
        >
          <img src={logo} alt="Logo" className="w-full h-full object-contain" />
        </motion.div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-tight">Grain Hub</h1>
          <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 font-semibold">Admin Console</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-2">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={`w-full justify-start gap-3 h-11 relative overflow-hidden group transition-all duration-200 ${
              currentPage === item.id 
                ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20' 
                : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-white'
            }`}
            onClick={() => onNavigate(item.id)}
          >
            {currentPage === item.id && (
              <motion.div 
                layoutId="active-pill"
                className="absolute left-0 w-1 h-6 bg-accent rounded-r-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <item.icon size={20} className={`transition-transform duration-200 ${currentPage === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className="font-medium">{item.label}</span>
          </Button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-sidebar-border/20 bg-black/5">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent border border-sidebar-border/30 flex items-center justify-center font-bold text-sidebar-foreground">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-[10px] uppercase tracking-tighter text-sidebar-foreground/50 font-medium truncate">{roleLabel}</p>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full h-10 justify-start gap-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
          onClick={onLogout}
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Logout</span>
        </Button>
      </div>
    </aside>
  );
}
