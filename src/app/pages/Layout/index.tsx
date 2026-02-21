import React from 'react';
import { 
  LayoutDashboard, 
  Monitor, 
  Receipt, 
  Settings,
  MessageSquareWarning,
  FlaskConical,
  Radio,
} from 'lucide-react';
import { useAuth, permissions } from '../../lib/AuthContext';
import { getAccessRoleLabel } from '../../lib/auth';
import type { AuthUser } from '../../lib/auth';
import { motion, AnimatePresence } from 'motion/react';
import { MobileHeader } from './components/MobileHeader';
import { DesktopSidebar } from './components/DesktopSidebar';
import { MobileBottomNav } from './components/MobileBottomNav';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  user: AuthUser;
}

export function Layout({ children, currentPage, onNavigate, onLogout, user }: LayoutProps) {
  const { hasPermission } = useAuth();

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: permissions.canViewDashboard },
    { id: 'machines', label: 'Machines', icon: Monitor, permission: permissions.canManageMachines },
    { id: 'transactions', label: 'Transactions', icon: Receipt, permission: permissions.canViewTransactions },
    { id: 'reports', label: 'Reports', icon: MessageSquareWarning, permission: permissions.canViewReports },
    { id: 'settings',      label: 'Settings',    icon: Settings,       permission: permissions.canViewDashboard },
    { id: 'dev-paymongo', label: 'PayMongo',     icon: FlaskConical,   permission: permissions.canManageMachines },
    { id: 'dev-mqtt',     label: 'MQTT Console', icon: Radio,          permission: permissions.canManageMachines },
  ];

  const navItems = allNavItems.filter(item => hasPermission(item.permission));
  const roleLabel = getAccessRoleLabel(user.accessRole);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-foreground">
      <MobileHeader 
        user={user} 
        roleLabel={roleLabel} 
        onNavigate={onNavigate} 
        onLogout={onLogout} 
      />

      <DesktopSidebar 
        user={user} 
        roleLabel={roleLabel} 
        navItems={navItems} 
        currentPage={currentPage} 
        onNavigate={onNavigate} 
        onLogout={onLogout} 
      />

      <main className="flex-1 overflow-auto h-[calc(100vh-64px)] md:h-screen bg-[#F8FAFC]">
        <header className="hidden md:flex justify-between items-center px-8 py-5 bg-white border-b border-border sticky top-0 z-30 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-slate-900 capitalize tracking-tight">
              {navItems.find(i => i.id === currentPage)?.label || 'Dashboard'}
            </h2>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               System Online
             </div>
          </div>
        </header>
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <MobileBottomNav 
        navItems={navItems} 
        currentPage={currentPage} 
        onNavigate={onNavigate} 
      />
    </div>
  );
}
