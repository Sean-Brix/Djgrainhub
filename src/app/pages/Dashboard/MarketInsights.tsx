import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { CloudSun, Thermometer, TrendingUp, Info, Wind } from 'lucide-react';
import { motion } from 'motion/react';

export const MarketInsights: React.FC = () => {
  return (
    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <CardHeader className="p-5 pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <CloudSun className="text-amber-500" size={16} />
          Market & Weather Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-2 space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow-sm">
              <Thermometer size={20} className="text-rose-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Local Temperature</p>
              <p className="text-sm font-black text-foreground">32°C - High Humidity</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full">HOT</span>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Info size={12} />
            Smart Recommendations
          </h4>
          
          <motion.div 
            whileHover={{ x: 5 }}
            className="p-3 border border-border rounded-xl bg-card hover:border-primary/20 transition-all cursor-default"
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-emerald-500" />
              <span className="text-xs font-bold text-foreground">Stock Jasmine Rice</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Sales of Jasmine rice tend to increase by 15% during humid weather in your area. Consider topping up Unit-01.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ x: 5 }}
            className="p-3 border border-border rounded-xl bg-card hover:border-primary/20 transition-all cursor-default"
          >
            <div className="flex items-center gap-2 mb-1">
              <Wind size={14} className="text-blue-500" />
              <span className="text-xs font-bold text-foreground">Maintenance Window</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Low traffic predicted between 2 PM - 4 PM. Best time for scheduled sensor cleaning at Bin-04.
            </p>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
};
