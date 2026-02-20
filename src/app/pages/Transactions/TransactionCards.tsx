import React from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Calendar, CreditCard, Package, Receipt } from 'lucide-react';

interface TransactionCardsProps {
  sales: any[];
  getMachineName: (id: string) => string;
  getProductName: (id: string) => string;
}

export const TransactionCards: React.FC<TransactionCardsProps> = ({ 
  sales, 
  getMachineName, 
  getProductName 
}) => {
  return (
    <div className="md:hidden space-y-4">
      {sales.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Receipt size={32} className="mx-auto mb-2 opacity-30" />
          <p>No transactions found.</p>
        </div>
      ) : (
        sales.map((sale) => (
          <Card key={sale.id} className="shadow-sm border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-sm text-foreground">{getMachineName(sale.machineId)}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Calendar size={10} />
                    {new Date(sale.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
                <Badge variant={sale.status === 'completed' ? 'outline' : 'destructive'} className="text-[10px]">
                  {sale.status}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between py-2 border-t border-b border-border/50 my-2">
                <div className="flex items-center gap-2">
                  <div className="bg-secondary/50 p-1.5 rounded text-secondary-foreground">
                    <Package size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {sale.items.length === 1 
                        ? getProductName(sale.items[0].productId)
                        : `${sale.items.length} Products`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sale.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} pieces
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">₱{sale.totalPrice.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span className="font-mono">{sale.id}</span>
                <div className="flex items-center gap-1">
                  <CreditCard size={12} />
                  GCash
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
