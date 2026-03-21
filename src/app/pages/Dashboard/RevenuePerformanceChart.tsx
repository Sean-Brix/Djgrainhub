import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

interface RevenuePerformanceChartProps {
  data: any[];
  isMounted: boolean;
  itemVariants: any;
}

export const RevenuePerformanceChart: React.FC<RevenuePerformanceChartProps> = ({
  data,
  isMounted,
  itemVariants
}) => {
  return (
    <motion.div variants={itemVariants} className="col-span-full md:col-span-4">
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full">
        <CardHeader className="px-6 py-6 border-b border-border">
          <CardTitle className="text-xl font-bold text-foreground">Revenue Performance</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">Daily income distribution per unit</CardDescription>
        </CardHeader>
        <CardContent className="px-2 py-6">
          <div className="h-[300px] w-full min-h-[300px] relative">
            {isMounted ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1F4D3A" stopOpacity={1} />
                      <stop offset="100%" stopColor="#1F4D3A" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748B" 
                    fontSize={11} 
                    fontWeight={600}
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#64748B" 
                    fontSize={11} 
                    fontWeight={600}
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `₱${value}`} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFC', radius: 4 }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      padding: '12px'
                    }}
                    formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-muted animate-pulse rounded-xl" />
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
