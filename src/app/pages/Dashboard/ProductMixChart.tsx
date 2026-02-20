import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { Package } from 'lucide-react';

interface ProductMixChartProps {
  completedSales: any[];
  isMounted: boolean;
  itemVariants: any;
  getProductName: (id: string) => string;
}

const COLORS = ['#1F4D3A', '#D4AF37', '#E6C86E', '#1E293B', '#64748B', '#94A3B8'];

export const ProductMixChart: React.FC<ProductMixChartProps> = ({
  completedSales,
  isMounted,
  itemVariants,
  getProductName
}) => {
  const productStats = completedSales.reduce((acc: Record<string, number>, sale) => {
    sale.items.forEach((item: any) => {
      const name = getProductName(item.productId);
      acc[name] = (acc[name] || 0) + item.quantity;
    });
    return acc;
  }, {});

  const productData = Object.entries(productStats)
    .map(([name, value]) => ({ name, value }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 5);

  const totalItems = productData.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div variants={itemVariants} className="col-span-full md:col-span-3">
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full">
        <CardHeader className="px-6 py-6 border-b border-slate-50">
          <CardTitle className="text-xl font-bold text-slate-900">Product Mix</CardTitle>
          <CardDescription className="text-slate-500 font-medium">Top selling grain varieties</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center">
            <div className="h-[200px] w-full relative min-h-[200px]">
              {isMounted && productData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={productData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {productData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} pcs`, 'Quantity']}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' 
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                   <Package className="h-12 w-12 mb-3 opacity-20" />
                   <p className="text-sm font-medium tracking-tight">Data unavailable</p>
                </div>
              )}
              {productData.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">{totalItems}</span>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 space-y-3 w-full">
              {productData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs font-bold text-slate-700">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900">
                      {totalItems > 0 ? Math.round((item.value / totalItems) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
