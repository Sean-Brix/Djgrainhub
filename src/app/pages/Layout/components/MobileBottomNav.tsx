import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal, X } from 'lucide-react';

const VISIBLE_COUNT = 4;

interface MobileBottomNavProps {
  navItems: any[];
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function MobileBottomNav({ navItems, currentPage, onNavigate }: MobileBottomNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleItems = navItems.slice(0, VISIBLE_COUNT);
  const overflowItems = navItems.slice(VISIBLE_COUNT);
  const hasOverflow = overflowItems.length > 0;
  const overflowIsActive = overflowItems.some(i => i.id === currentPage);

  function handleNavigate(id: string) {
    onNavigate(id);
    setMenuOpen(false);
  }

  return (
    <>
      {/* Overflow menu sheet */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="md:hidden fixed bottom-16 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-[0_-8px_40px_-4px_rgba(0,0,0,0.15)] border-t border-border"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted" />
              </div>

              <div className="flex items-center justify-between px-5 pb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">More</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1 px-3 pb-5">
                {overflowItems.map(item => {
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                      <span className="text-[10px] font-bold tracking-tight uppercase leading-none text-center">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border z-50 shadow-[0_-8px_20px_-6px_rgba(0,0,0,0.05)]">
        <div className="flex items-stretch h-16 pb-safe">
          {visibleItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`relative flex flex-col items-center justify-center flex-1 gap-0.5 transition-all duration-300 ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-indicator"
                    className="absolute top-0 w-8 h-0.5 bg-primary rounded-b-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                <span className={`text-[9px] font-bold tracking-tight uppercase leading-none ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {hasOverflow && (
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className={`relative flex flex-col items-center justify-center flex-1 gap-0.5 transition-all duration-300 ${
                overflowIsActive || menuOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {(overflowIsActive || menuOpen) && !menuOpen && (
                <motion.div
                  layoutId="mobile-indicator"
                  className="absolute top-0 w-8 h-0.5 bg-primary rounded-b-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <MoreHorizontal size={20} strokeWidth={overflowIsActive || menuOpen ? 2.5 : 2} />
              <span className="text-[9px] font-bold tracking-tight uppercase leading-none opacity-70">More</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
