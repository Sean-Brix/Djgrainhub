import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { History, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';

interface RecentActivityProps {
  recentTransactions: any[];
  getMachineName: (id: string) => string;
  getProductName: (id: string) => string;
  itemVariants: any;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  recentTransactions,
  getMachineName,
  getProductName,
  itemVariants
}) => {
  return (
    <motion.div variants={itemVariants}>
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full">
        <CardHeader className="px-6 py-6 border-b border-slate-50">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="h-5 w-5 text-blue-500" />
            Latest Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[320px] px-6">
            <div className="space-y-1 py-4">
              {recentTransactions.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0 group">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 tracking-tight">{getMachineName(sale.machineId)}</p>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                        <span className="text-slate-500">
                          {sale.items.length === 1 
                            ? getProductName(sale.items[0].productId)
                            : `${sale.items.length} Varieties`}
                        </span>
                        <span>&bull;</span>
                        <span>{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">₱{sale.totalPrice}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      {sale.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} Units
                    </p>
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-medium">
                  No activity recorded
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};
