import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/app/lib/AuthContext';
import { useData } from '@/app/lib/DataContext';
import { 
  getMachineStockLevel,
  getMachineTotalStockKg,
} from '@/app/lib/dataHelpers';
import { DashboardStats } from './DashboardStats';
import { RevenuePerformanceChart } from './RevenuePerformanceChart';
import { ProductMixChart } from './ProductMixChart';
import { InventoryStatus } from './InventoryStatus';
import { RecentActivity } from './RecentActivity';
import { LiveMonitor } from './LiveMonitor';
import { MarketInsights } from './MarketInsights';

export function Dashboard() {
  const { user } = useAuth();
  const data = useData();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!user) return null;

  const machines = data.getMachinesForUser(user);
  const sales = data.getSalesForUser(user);
  const alerts = data.getAlertsForUser(user);

  // Filter completed sales
  const completedSales = sales.filter(s => s.status === 'completed');

  // Calculate total revenue
  const totalRevenue = completedSales.reduce((acc, sale) => acc + sale.totalPrice, 0);
  
  // Calculate active machines
  const activeMachines = machines.filter(m => m.status === 'online').length;
  const totalMachines = machines.length;
  
  // Calculate total alerts
  const activeAlerts = alerts.filter(a => a.status === 'active').length;

  // Calculate total stock from products (in KG)
  const totalStockKg = machines.reduce((acc, m) => acc + getMachineTotalStockKg(m), 0);

  // Sales by machine
  const salesByMachine = machines.map(m => {
    const machineSales = completedSales.filter(s => s.machineId === m.id);
    const revenue = machineSales.reduce((sum, s) => sum + s.totalPrice, 0);
    const shortName = m.name.replace('Machine ', 'M').split(' - ')[0];
    return { name: shortName, fullName: m.name, revenue, stock: getMachineStockLevel(m) };
  }).sort((a, b) => b.revenue - a.revenue);

  // Recent Transactions
  const recentTransactions = [...completedSales]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  // Low Stock Machines (< 25%)
  const lowStockMachines = machines.filter(m => getMachineStockLevel(m) < 25);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-20 md:pb-6"
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Dashboard</h2>
        </div>
      </div>
      
      <DashboardStats 
        totalRevenue={totalRevenue}
        activeMachines={activeMachines}
        totalMachines={totalMachines}
        totalStockKg={totalStockKg}
        activeAlerts={activeAlerts}
        itemVariants={itemVariants}
      />

      <div className="grid gap-6 md:grid-cols-7">
        <RevenuePerformanceChart 
          data={salesByMachine}
          isMounted={isMounted}
          itemVariants={itemVariants}
        />

        <ProductMixChart 
          completedSales={completedSales}
          isMounted={isMounted}
          itemVariants={itemVariants}
          getProductName={data.getProductName}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-6 md:grid-cols-2">
          <InventoryStatus 
            lowStockMachines={lowStockMachines}
            getMachineStockLevel={getMachineStockLevel}
            getMachineTotalStockKg={getMachineTotalStockKg}
            itemVariants={itemVariants}
          />

          <RecentActivity 
            recentTransactions={recentTransactions}
            getMachineName={data.getMachineName}
            getProductName={data.getProductName}
            itemVariants={itemVariants}
          />
        </div>

        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <MarketInsights />
          </motion.div>
          <motion.div variants={itemVariants}>
            <LiveMonitor />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
