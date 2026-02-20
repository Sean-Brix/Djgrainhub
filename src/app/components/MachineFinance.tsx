import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Weight,
  BarChart3,
  ShoppingCart,
  Percent,
  Calendar,
  CreditCard,
} from 'lucide-react';
import {
  type Machine,
  type Sale,
  type Product,
} from '../lib/dataHelpers';
import { useData } from '../lib/DataContext';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

// ─── Colors ────────────────────────────────────────────────────────────

const CHART_COLORS = [
  '#1F4D3A', '#D4AF37', '#2E7D5B', '#4B5563', '#94A3B8', '#E2E8F0',
];

const PROFIT_COLOR = '#10B981';
const COST_COLOR = '#EF4444';
const REVENUE_COLOR = '#1F4D3A';

// ─── Helpers ───────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return `₱${n.toLocaleString()}`;
}

// ─── Component ─────────────────────────────────────────────────────────

export function MachineFinance({
  machine,
  onBack,
}: { machine: Machine; onBack: () => void }) {
  const { sales, products } = useData();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const getProductById = (id: string): Product | undefined => {
    return products.find(p => p.id === id);
  };

  // Get all completed sales for this machine
  const machineSales: Sale[] = sales.filter(
    s => s.machineId === machine.id && s.status === 'completed'
  );
  const failedSales = sales.filter(
    s => s.machineId === machine.id && s.status === 'failed'
  );

  // ─── Core metrics ──────────────────────────────────────────────────
  const totalRevenue = machineSales.reduce((s, t) => s + t.totalPrice, 0);
  const totalItemsSold = machineSales.reduce(
    (s, t) => s + t.items.reduce((a, i) => a + i.quantity, 0), 0
  );

  // Calculate total cost using product cost data
  let totalCost = 0;
  let totalKgSold = 0;
  machineSales.forEach(sale => {
    sale.items.forEach(item => {
      const product = getProductById(item.productId);
      if (product) {
        totalCost += product.cost * item.quantity;
        totalKgSold += product.weight * item.quantity;
      }
    });
  });

  const netProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const avgOrderValue = machineSales.length > 0 ? totalRevenue / machineSales.length : 0;

  // ─── Revenue by product ────────────────────────────────────────────
  const revenueByProduct: Record<string, { name: string; revenue: number; cost: number; profit: number; qty: number; kg: number }> = {};
  machineSales.forEach(sale => {
    sale.items.forEach(item => {
      const product = getProductById(item.productId);
      const pName = product?.name || item.productId;
      if (!revenueByProduct[pName]) {
        revenueByProduct[pName] = { name: pName, revenue: 0, cost: 0, profit: 0, qty: 0, kg: 0 };
      }
      const lineRevenue = item.price * item.quantity;
      const lineCost = (product?.cost || 0) * item.quantity;
      revenueByProduct[pName].revenue += lineRevenue;
      revenueByProduct[pName].cost += lineCost;
      revenueByProduct[pName].profit += lineRevenue - lineCost;
      revenueByProduct[pName].qty += item.quantity;
      revenueByProduct[pName].kg += (product?.weight || 0) * item.quantity;
    });
  });
  const productData = Object.values(revenueByProduct).sort((a, b) => b.revenue - a.revenue);

  // ─── Revenue by day ────────────────────────────────────────────────
  const revenueByDay: Record<string, { date: string; revenue: number; cost: number; profit: number; txns: number }> = {};
  machineSales.forEach(sale => {
    const day = sale.timestamp.slice(0, 10); // YYYY-MM-DD
    if (!revenueByDay[day]) {
      revenueByDay[day] = { date: day, revenue: 0, cost: 0, profit: 0, txns: 0 };
    }
    revenueByDay[day].revenue += sale.totalPrice;
    revenueByDay[day].txns += 1;
    sale.items.forEach(item => {
      const product = getProductById(item.productId);
      if (product) {
        revenueByDay[day].cost += product.cost * item.quantity;
      }
    });
    revenueByDay[day].profit = revenueByDay[day].revenue - revenueByDay[day].cost;
  });
  const dailyData = Object.values(revenueByDay)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

  // ─── Pie data for revenue split ───────��────────────────────────────
  const pieData = productData.map(p => ({
    name: p.name,
    value: p.revenue,
  }));

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-24 md:pb-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight truncate">{machine.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
               <Badge className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/5 px-2 py-0 font-bold uppercase tracking-widest text-[9px]">Financials</Badge>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Analysis</span>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-full w-fit">
           <Calendar size={14} className="text-primary" />
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LIFETIME REPORT</span>
        </div>
      </div>

      {/* ─── Summary Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item}>
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform duration-300">
               <DollarSign size={40} className="text-primary" />
            </div>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalRevenue)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform duration-300">
               <TrendingDown size={40} className="text-rose-600" />
            </div>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Cost</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-2xl font-black text-rose-600 tracking-tighter">{formatCurrency(totalCost)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform duration-300">
               <TrendingUp size={40} className="text-emerald-600" />
            </div>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Net Profit</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className={`text-2xl font-black tracking-tighter ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(netProfit)}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-none shadow-[0_8px_30_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform duration-300">
               <Percent size={40} className="text-amber-500" />
            </div>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Margin</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className={`text-2xl font-black tracking-tighter ${profitMargin >= 30 ? 'text-emerald-600' : 'text-amber-500'}`}>
                {profitMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Secondary stats */}
      <motion.div variants={item} className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <ShoppingCart size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">Orders</span>
          </div>
          <p className="text-xl font-black text-slate-900">{machineSales.length}</p>
          {failedSales.length > 0 && (
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">{failedSales.length} Failed</p>
          )}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Package size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">Items sold</span>
          </div>
          <p className="text-xl font-black text-slate-900">{totalItemsSold}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Weight size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">Weight sold</span>
          </div>
          <p className="text-xl font-black text-slate-900">{totalKgSold} <span className="text-xs font-bold text-slate-400">kg</span></p>
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ─── Revenue vs Cost Over Time ──────────────────────────────── */}
        <motion.div variants={item}>
          <Card className="border-none shadow-[0_8px_30_rgb(0,0,0,0.04)] h-full">
            <CardHeader className="px-6 py-6 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-900">Performance Over Time</CardTitle>
                <div className="flex gap-4">
                   <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Rev</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-rose-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Cost</span>
                   </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2 py-6">
              <div style={{ width: '100%', height: 260 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dailyData} margin={{ top: 5, right: 15, left: -5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="label" fontSize={10} fontWeight={600} stroke="#64748B" tickLine={false} axisLine={false} dy={10} />
                      <YAxis fontSize={10} fontWeight={600} stroke="#64748B" tickLine={false} axisLine={false} tickFormatter={v => `₱${v}`} />
                      <Tooltip
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          padding: '12px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number, name: string) => [
                          formatCurrency(value),
                          name === 'revenue' ? 'Revenue' : name === 'cost' ? 'Cost' : 'Profit',
                        ]}
                      />
                      <Bar dataKey="revenue" fill={REVENUE_COLOR} radius={[4, 4, 0, 0]} name="revenue" barSize={16} />
                      <Bar dataKey="cost" fill={COST_COLOR} radius={[4, 4, 0, 0]} opacity={0.4} name="cost" barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Revenue by Product ────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card className="border-none shadow-[0_8px_30_rgb(0,0,0,0.04)] h-full">
            <CardHeader className="px-6 py-6 border-b border-slate-50">
               <CardTitle className="text-lg font-bold text-slate-900">Revenue by Variety</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div style={{ width: '100%', height: 220 }} className="relative">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={6}
                          dataKey="value"
                        >
                          {pieData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            fontSize: '12px'
                          }}
                          formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-3xl font-black text-slate-900 tracking-tighter">{productData.length}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Varieties</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {productData.map((p, i) => {
                    const pct = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
                    return (
                      <div key={p.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-700 truncate tracking-tight">{p.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{p.qty} PCS SOLD</p>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-xs font-black text-slate-900">{formatCurrency(p.revenue)}</p>
                          <p className="text-[9px] font-bold text-slate-400">{pct.toFixed(0)}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Product Profitability Table ───────────────────────────── */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border-none shadow-[0_8px_30_rgb(0,0,0,0.04)] h-full overflow-hidden">
            <CardHeader className="px-6 py-6 border-b border-slate-50">
               <CardTitle className="text-lg font-bold text-slate-900">Profitability Matrix</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="text-left px-6 py-4 font-black uppercase tracking-widest text-slate-400 text-[9px]">Variety</th>
                    <th className="text-right px-4 py-4 font-black uppercase tracking-widest text-slate-400 text-[9px]">Revenue</th>
                    <th className="text-right px-4 py-4 font-black uppercase tracking-widest text-slate-400 text-[9px]">Margin</th>
                    <th className="text-right px-6 py-4 font-black uppercase tracking-widest text-slate-400 text-[9px]">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productData.map((p, i) => {
                    const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                    return (
                      <tr key={p.name} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{p.name}</td>
                        <td className="text-right px-4 py-4 font-bold text-slate-600 tabular-nums">{formatCurrency(p.revenue)}</td>
                        <td className="text-right px-4 py-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase ${
                            margin >= 30 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {margin.toFixed(0)}%
                          </span>
                        </td>
                        <td className="text-right px-6 py-4 text-emerald-600 font-black tabular-nums">{formatCurrency(p.profit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-black">
                    <td className="px-6 py-5 text-slate-900 uppercase tracking-widest text-[10px]">Total Aggregate</td>
                    <td className="text-right px-4 py-5 text-slate-900 tabular-nums">{formatCurrency(totalRevenue)}</td>
                    <td className="text-right px-4 py-5">
                       <span className="text-emerald-600">{profitMargin.toFixed(1)}%</span>
                    </td>
                    <td className="text-right px-6 py-5 text-emerald-600 tabular-nums">{formatCurrency(netProfit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* ─── Recent Transactions ───────────────────────────────────── */}
        <motion.div variants={item}>
          <Card className="border-none shadow-[0_8px_30_rgb(0,0,0,0.04)] h-full flex flex-col">
            <CardHeader className="px-6 py-6 border-b border-slate-50">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center justify-between">
                <span>Direct Activity</span>
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold text-[9px] tracking-widest px-2 py-0">LIVE</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <ScrollArea className="h-[400px] px-6">
                <div className="divide-y divide-slate-100 py-2">
                  {[...machineSales, ...failedSales]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map(sale => {
                      const isFailed = sale.status === 'failed';
                      return (
                        <div key={sale.id} className="py-4 group">
                          <div className="flex items-center justify-between mb-1">
                             <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isFailed ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary'}`}>
                                  {isFailed ? <TrendingDown size={14} /> : <CreditCard size={14} />}
                               </div>
                               <div>
                                  <p className="text-xs font-black text-slate-900 tracking-tight">₱{sale.totalPrice.toLocaleString()}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                     {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                               </div>
                             </div>
                             {isFailed ? (
                               <Badge className="bg-rose-50 text-rose-600 border-none font-black text-[8px] px-1.5 py-0">FAILED</Badge>
                             ) : (
                               <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[8px] px-1.5 py-0">PAID</Badge>
                             )}
                          </div>
                        </div>
                      );
                    })}
                  {machineSales.length + failedSales.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="text-sm font-bold text-slate-300">No activity logged</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Profit Trend Line ─────────────────────────────────────── */}
      {dailyData.length > 1 && (
        <motion.div variants={item}>
          <Card className="border-none shadow-[0_8px_30_rgb(0,0,0,0.04)]">
            <CardHeader className="px-6 py-6 border-b border-slate-50">
               <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-500" />
                  Growth Trajectory
               </CardTitle>
            </CardHeader>
            <CardContent className="px-2 py-6">
              <div style={{ width: '100%', height: 200 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dailyData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="label" fontSize={10} fontWeight={600} stroke="#64748B" tickLine={false} axisLine={false} dy={10} />
                      <YAxis fontSize={10} fontWeight={600} stroke="#64748B" tickLine={false} axisLine={false} tickFormatter={v => `₱${v}`} />
                      <Tooltip
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          padding: '12px',
                          fontSize: '12px' 
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Profit']}
                      />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        stroke={PROFIT_COLOR}
                        strokeWidth={4}
                        dot={{ r: 4, fill: '#FFFFFF', stroke: PROFIT_COLOR, strokeWidth: 2 }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Footer Stats ────────────────────────────────── */}
      <motion.div variants={item} className="grid grid-cols-2 gap-6 bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
           <BarChart3 size={120} />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Average Order Value</p>
          <p className="text-3xl font-black tabular-nums tracking-tighter">{formatCurrency(Math.round(avgOrderValue))}</p>
          <div className="flex items-center gap-2 mt-2">
             <div className="w-1.5 h-1.5 rounded-full bg-primary" />
             <span className="text-[10px] font-bold text-white/60">Based on {machineSales.length} successful cycles</span>
          </div>
        </div>
        <div className="relative z-10 border-l border-white/10 pl-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Avg Profit per Order</p>
          <p className="text-3xl font-black tabular-nums tracking-tighter text-emerald-400">
            {formatCurrency(machineSales.length > 0 ? Math.round(netProfit / machineSales.length) : 0)}
          </p>
          <div className="flex items-center gap-2 mt-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
             <span className="text-[10px] font-bold text-white/60">Estimated net contribution</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
