import React, { useState } from 'react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Search, Download, Filter } from 'lucide-react';
import { useAuth, permissions } from '../../lib/AuthContext';
import { useData } from '../../lib/DataContext';
import { TransactionStats } from './TransactionStats';
import { TransactionTable } from './TransactionTable';
import { TransactionCards } from './TransactionCards';

export function Transactions() {
  const [searchTerm, setSearchTerm] = useState('');
  const { user, hasPermission } = useAuth();
  const data = useData();

  if (!user) return null;

  const sales = data.getSalesForUser(user);

  const filteredSales = sales.filter(sale => {
    const productNames = sale.items.map(item => data.getProductName(item.productId)).join(', ');
    return productNames.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.machineId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      data.getMachineName(sale.machineId).toLowerCase().includes(searchTerm.toLowerCase());
  });

  const sortedSales = [...filteredSales].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const completedSales = sales.filter(s => s.status === 'completed');
  const totalRevenue = completedSales.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalVolume = completedSales.reduce((sum, s) => {
    return sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Transaction ID,Machine,Products,Total Price,Status,Timestamp\n"
      + sortedSales.map(s => {
          const products = s.items.map(item => data.getProductName(item.productId)).join(' | ');
          const machine = data.getMachineName(s.machineId);
          return `"${s.id}","${machine}","${products}","${s.totalPrice}","${s.status}","${s.timestamp}"`;
        }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "dj_grain_hub_transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transaction History</h2>
          <p className="text-muted-foreground">
            {user.accessRole === 'super_admin' 
              ? 'Review all sales and payment statuses.'
              : `Showing transactions for your assigned machines.`
            }
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          {hasPermission(permissions.canExportData) && (
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          )}
        </div>
      </div>

      <TransactionStats 
        count={sales.length}
        revenue={totalRevenue}
        volume={totalVolume}
      />

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search transactions..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <TransactionCards 
        sales={sortedSales}
        getMachineName={data.getMachineName}
        getProductName={data.getProductName}
      />

      <TransactionTable 
        sales={sortedSales}
        getMachineName={data.getMachineName}
        getProductName={data.getProductName}
      />
    </div>
  );
}
