import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Activity, Signal, ShoppingCart, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useData } from '@/app/lib/DataContext';
import { useAuth } from '@/app/lib/AuthContext';

interface LiveEvent {
  id: string;
  type: 'sale' | 'status' | 'alert';
  message: string;
  time: Date;
  machineName: string;
  severity?: 'info' | 'warning' | 'error' | 'success';
}

export const LiveMonitor: React.FC = () => {
  const { user } = useAuth();
  const data = useData();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [isLive, setIsLive] = useState(true);

  // Initial events
  useEffect(() => {
    if (!user) return;
    const machines = data.getMachinesForUser(user);
    const initialEvents: LiveEvent[] = machines.slice(0, 3).map((m, i) => ({
      id: `init-${i}`,
      type: 'status',
      message: 'System Check: All sensors active',
      time: new Date(Date.now() - (i * 1000 * 60 * 5)),
      machineName: m.name,
      severity: 'success'
    }));
    setEvents(initialEvents);
  }, [user]);

  // Simulation loop
  useEffect(() => {
    if (!isLive || !user) return;

    const interval = setInterval(() => {
      const machines = data.getMachinesForUser(user);
      if (machines.length === 0) return;

      const machine = machines[Math.floor(Math.random() * machines.length)];
      const eventTypes: LiveEvent['type'][] = ['sale', 'status', 'status', 'status']; // More status than sales
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      let newEvent: LiveEvent;

      if (type === 'sale') {
        const products = machine.products || [];
        const product = products.length > 0 ? products[Math.floor(Math.random() * products.length)] : null;
        const productName = product ? data.getProductName(product.productId) : 'Rice';
        const amount = (Math.random() * 5 + 1).toFixed(1);

        newEvent = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'sale',
          message: `Dispensed ${amount}kg of ${productName}`,
          time: new Date(),
          machineName: machine.name,
          severity: 'info'
        };
      } else {
        const statuses = [
          'Heartbeat received',
          'Temperature: 24°C - Optimal',
          'Power supply stable',
          'Network latency: 45ms',
          'Bin sensor: Calibrated'
        ];
        newEvent = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'status',
          message: statuses[Math.floor(Math.random() * statuses.length)],
          time: new Date(),
          machineName: machine.name,
          severity: 'success'
        };
      }

      setEvents(prev => [newEvent, ...prev].slice(0, 10));
    }, 8000 + Math.random() * 10000);

    return () => clearInterval(interval);
  }, [isLive, user, data]);

  const getIcon = (type: LiveEvent['type'], severity?: string) => {
    switch (type) {
      case 'sale': return <ShoppingCart className="text-blue-500" size={14} />;
      case 'alert': return <AlertCircle className="text-rose-500" size={14} />;
      case 'status': 
        if (severity === 'success') return <CheckCircle2 className="text-emerald-500" size={14} />;
        return <Activity className="text-muted-foreground" size={14} />;
      default: return <Signal size={14} />;
    }
  };

  return (
    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="text-primary animate-pulse" size={16} />
            Live Operations Monitor
          </CardTitle>
          <p className="text-[10px] text-muted-foreground mt-0.5">Real-time machine telemetry</p>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
        <div className="p-5 pt-4 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 10, height: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-3 group"
              >
                <div className="mt-1 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-border group-hover:bg-card group-hover:shadow-sm transition-all">
                    {getIcon(event.type, event.severity)}
                  </div>
                </div>
                <div className="flex-1 min-w-0 border-b border-border pb-3 group-last:border-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight truncate max-w-[120px]">
                      {event.machineName}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-medium">
                      {event.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground leading-tight">
                    {event.message}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 opacity-40">
              <Signal size={24} className="mb-2" />
              <p className="text-xs">Waiting for data...</p>
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
      </CardContent>
    </Card>
  );
};
