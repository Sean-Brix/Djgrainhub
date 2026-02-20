import React from 'react';
import { Card, CardContent } from '../../components/ui/card';

interface TransactionStatsProps {
  count: number;
  revenue: number;
  volume: number;
}

export const TransactionStats: React.FC<TransactionStatsProps> = ({ count, revenue, volume }) => {
  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4">
      <Card className="bg-card shadow-sm">
        <CardContent className="p-3 md:p-4 text-center">
          <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Count</p>
          <p className="text-xl md:text-2xl font-bold">{count}</p>
        </CardContent>
      </Card>
      <Card className="bg-card shadow-sm">
        <CardContent className="p-3 md:p-4 text-center">
          <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Revenue</p>
          <p className="text-xl md:text-2xl font-bold text-primary">₱{revenue.toLocaleString()}</p>
        </CardContent>
      </Card>
      <Card className="bg-card shadow-sm">
        <CardContent className="p-3 md:p-4 text-center">
          <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Volume</p>
          <p className="text-xl md:text-2xl font-bold">{volume} pcs</p>
        </CardContent>
      </Card>
    </div>
  );
};
