import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Receipt } from 'lucide-react';

interface TransactionTableProps {
  sales: any[];
  getMachineName: (id: string) => string;
  getProductName: (id: string) => string;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ 
  sales, 
  getMachineName, 
  getProductName 
}) => {
  return (
    <Card className="hidden md:block shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Receipt size={32} className="mx-auto mb-2 opacity-30" />
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium font-mono text-xs text-muted-foreground">{sale.id}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{new Date(sale.timestamp).toLocaleDateString()}</span>
                        <span className="text-xs text-muted-foreground">{new Date(sale.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{getMachineName(sale.machineId)}</span>
                        <span className="text-[10px] text-muted-foreground">{sale.machineId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {sale.items.length === 1 
                        ? getProductName(sale.items[0].productId)
                        : `${sale.items.length} Products`}
                    </TableCell>
                    <TableCell>{sale.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} pcs</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={sale.status === 'completed' ? 'outline' : 'destructive'}>
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-right">₱{sale.totalPrice.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
