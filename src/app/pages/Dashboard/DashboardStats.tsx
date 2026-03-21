import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { motion } from 'motion/react';
import { DollarSign, Activity, Package, AlertTriangle, TrendingUp } from 'lucide-react';

interface DashboardStatsProps {
  totalRevenue: number;
  activeMachines: number;
  totalMachines: number;
  totalStockKg: number;
  activeAlerts: number;
  itemVariants: any;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  totalRevenue,
  activeMachines,
  totalMachines,
  totalStockKg,
  activeAlerts,
  itemVariants
}) => {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <motion.div variants={itemVariants}>
        <Card className="group border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <DollarSign size={48} className="text-primary" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-5">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl md:text-3xl font-black text-foreground tracking-tighter">₱{totalRevenue.toLocaleString()}</div>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5%
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="group border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <Activity size={48} className="text-blue-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-5">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Units</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl md:text-3xl font-black text-foreground tracking-tighter">{activeMachines}/{totalMachines}</div>
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-2 flex items-center bg-blue-500/10 w-fit px-2 py-0.5 rounded-full">
              {totalMachines > 0 ? ((activeMachines / totalMachines) * 100).toFixed(0) : 0}% Online
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="group border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <Package size={48} className="text-amber-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-5">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current Stock</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl md:text-3xl font-black text-foreground tracking-tighter">{totalStockKg} kg</div>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-2 flex items-center bg-amber-500/10 w-fit px-2 py-0.5 rounded-full">
              Total Inventory
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="group border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <AlertTriangle size={48} className="text-rose-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-5">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status Alerts</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl md:text-3xl font-black text-foreground tracking-tighter">{activeAlerts}</div>
            <p className={`text-xs font-bold mt-2 flex items-center w-fit px-2 py-0.5 rounded-full ${activeAlerts > 0 ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'}`}>
              {activeAlerts > 0 ? 'Action Required' : 'All Systems Nominal'}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
