import React from 'react';
import { motion } from 'motion/react';

interface MobileBottomNavProps {
  navItems: any[];
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function MobileBottomNav({ navItems, currentPage, onNavigate }: MobileBottomNavProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 flex justify-around items-center h-18 z-50 px-2 pb-safe shadow-[0_-8px_20px_-6px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${
            currentPage === item.id 
              ? 'text-primary' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {currentPage === item.id && (
            <motion.div 
              layoutId="mobile-indicator"
              className="absolute top-0 w-8 h-1 bg-primary rounded-b-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <item.icon size={22} strokeWidth={currentPage === item.id ? 2.5 : 2} className={`transition-transform duration-300 ${currentPage === item.id ? 'scale-110' : ''}`} />
          <span className={`text-[10px] font-bold tracking-tight uppercase ${currentPage === item.id ? 'opacity-100' : 'opacity-80'}`}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
