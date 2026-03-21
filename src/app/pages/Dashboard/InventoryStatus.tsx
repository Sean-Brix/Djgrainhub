import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Droplets, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface InventoryStatusProps {
  lowStockMachines: any[];
  getMachineStockLevel: (machine: any) => number;
  getMachineTotalStockKg: (machine: any) => number;
  itemVariants: any;
}

export const InventoryStatus: React.FC<InventoryStatusProps> = ({
  lowStockMachines,
  getMachineStockLevel,
  getMachineTotalStockKg,
  itemVariants
}) => {
  return (
    <motion.div variants={itemVariants}>
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full">
        <CardHeader className="px-6 py-6 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              Inventory Status
            </CardTitle>
            <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-bold">{lowStockMachines.length} Critical</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[320px] px-6">
          {lowStockMachines.length > 0 ? (
            <div className="space-y-3 py-6">
              {lowStockMachines.map(machine => {
                const stockLevel = getMachineStockLevel(machine);
                const stockColor = stockLevel < 10 ? 'bg-rose-500' : 'bg-primary';
                const textColor = stockLevel < 10 ? 'text-rose-600' : 'text-primary';
                
                return (
                  <div key={machine.id} className="group p-4 border border-border rounded-2xl bg-muted/50 hover:bg-card hover:border-primary/20 hover:shadow-sm transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-sm text-foreground tracking-tight">{machine.name}</p>
                        <p className="text-xs font-medium text-muted-foreground">{machine.location}</p>
                      </div>
                      <span className={`text-sm font-black ${textColor}`}>
                         {stockLevel}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stockLevel}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${stockColor}`} 
                      />
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-wider">
                       Capacity: {getMachineTotalStockKg(machine)} / 500 kg
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="font-bold text-foreground">Inventory Optimal</p>
              <p className="text-sm font-medium text-muted-foreground mt-1">All machines are well supplied</p>
            </div>
          )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};
