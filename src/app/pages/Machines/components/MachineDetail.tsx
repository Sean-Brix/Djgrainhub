import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Progress } from '../../../components/ui/progress';
import { toast } from 'sonner';
import {
  MapPin,
  ArrowLeft,
  Box,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Weight,
  Package,
  TrendingUp,
  Hash,
  BarChart3,
  Settings2,
} from 'lucide-react';
import { useAuth } from '../../../lib/AuthContext';
import { useData } from '../../../lib/DataContext';
import {
  getMachineStockLevel,
  type Machine,
  type Product,
} from '../../../lib/dataHelpers';
import { MachineFinance } from '../../../components/MachineFinance';
import { STATUS_MAP } from './MachineFormModal';
import { ProductFormModal, type ProductFormData } from './ProductFormModal';
import { ConfirmModal } from './ConfirmModal';

interface MachineDetailProps {
  machine: Machine;
  onBack: () => void;
  onEditMachine: (machine: Machine) => void;
  onDeleteMachine: (machine: Machine) => void;
}

export const MachineDetail: React.FC<MachineDetailProps> = ({
  machine,
  onBack,
  onEditMachine,
  onDeleteMachine,
}) => {
  const { user } = useAuth();
  const data = useData();
  const sales = user ? data.getSalesForUser(user) : [];
  const machineSales = sales.filter(s => s.machineId === machine.id && s.status === 'completed');
  const machineEarnings = machineSales.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalItems = machineSales.reduce((sum, s) => s.items.reduce((a, i) => a + i.quantity, 0) + sum, 0);

  const products = data.getProductsForMachine(machine.id);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [showFinance, setShowFinance] = useState(false);

  const totalPcs = products.reduce((s, p) => s + p.stock, 0);
  const totalKg = products.reduce((s, p) => s + p.stock * p.weight, 0);
  const stockLevel = getMachineStockLevel(machine);
  const usedSlots = products.map(p => p.slotNumber);

  const ownerName = data.users.find(u => u.id === machine.ownerId)?.name || machine.ownerId;

  const handleSave = (formData: ProductFormData) => {
    if (editProduct) {
      data.updateProduct(editProduct.id, formData);
      toast.success(`${formData.name} updated`);
    } else {
      const newProduct: Product = {
        id: `p${formData.slotNumber}-${machine.id}-${Date.now()}`,
        machineId: machine.id,
        ...formData,
      };
      data.addProduct(newProduct);
      toast.success(`${formData.name} added to Slot ${formData.slotNumber}`);
    }
    setShowForm(false);
    setEditProduct(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    data.deleteProduct(deleteTarget.id);
    toast.success(`${deleteTarget.name} removed`);
    setDeleteTarget(null);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditProduct(null);
    setShowForm(true);
  };

  const status = STATUS_MAP[machine.status] || STATUS_MAP.offline;

  if (showFinance) {
    return <MachineFinance machine={machine} onBack={() => setShowFinance(false)} />;
  }

  return (
    <div className="space-y-5 pb-24 md:pb-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{machine.name}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={13} className="shrink-0" />
            <span className="truncate">{machine.location}</span>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-mono text-muted-foreground">
          <Hash size={12} />
          {machine.id}
        </span>
        {user?.accessRole === 'super_admin' && (
          <span className="text-xs text-muted-foreground">Owner: {ownerName}</span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { onEditMachine(machine); onBack(); }}>
            <Settings2 size={13} className="mr-1" /> Edit Details
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onDeleteMachine(machine)}>
            <Trash2 size={13} className="mr-1" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <DollarSign size={14} /><span className="text-xs">Earnings</span>
          </div>
          <p className="text-xl font-bold">₱{machineEarnings.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <TrendingUp size={14} /><span className="text-xs">Items Sold</span>
          </div>
          <p className="text-xl font-bold">{totalItems}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <Package size={14} /><span className="text-xs">In Stock</span>
          </div>
          <p className="text-xl font-bold">{totalPcs} <span className="text-sm text-muted-foreground font-normal">pcs</span></p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <Weight size={14} /><span className="text-xs">Total Weight</span>
          </div>
          <p className="text-xl font-bold">{totalKg} <span className="text-sm text-muted-foreground font-normal">kg</span></p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Overall Stock Level</span>
          <span className={`text-sm font-bold ${stockLevel < 20 ? 'text-destructive' : stockLevel < 50 ? 'text-amber-600' : 'text-green-600'}`}>{stockLevel}%</span>
        </div>
        <Progress value={stockLevel} className="h-2" />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{products.length}/6 slots filled</span>
          <span>Capacity: {machine.capacity} units</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
        onClick={() => setShowFinance(true)}
      >
        <BarChart3 size={16} className="mr-2" /> Finance & Analytics
      </Button>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Products ({products.length})</h3>
        {products.length < 6 && (
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} className="mr-1.5" /> Add Product
          </Button>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
          <Box size={40} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground mb-3">No products in this machine yet.</p>
          <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Add First Product</Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {products.map(product => {
            const pctStock = Math.min(100, Math.round((product.stock / 20) * 100));
            return (
              <div key={product.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3 p-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                        <Box size={22} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">SLOT {product.slotNumber}</span>
                      <h4 className="text-sm font-bold truncate">{product.name}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>₱{product.price}/pc</span>
                      <span>{product.stock} pcs</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(product)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleteTarget(product)} className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="px-3 pb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Slot Capacity</span>
                    <span className={`text-[10px] font-bold ${pctStock < 25 ? 'text-red-600' : 'text-slate-600'}`}>{pctStock}%</span>
                  </div>
                  <Progress value={pctStock} className="h-1.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProductFormModal
        open={showForm}
        product={editProduct}
        usedSlots={usedSlots}
        onSave={handleSave}
        onClose={() => {
          setShowForm(false);
          setEditProduct(null);
        }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        icon={<Trash2 className="text-red-600" size={24} />}
        iconBg="bg-red-100"
        title="Remove Product"
        message={<>Are you sure you want to remove <strong>{deleteTarget?.name}</strong> from Slot {deleteTarget?.slotNumber}?</>}
        confirmLabel="Remove"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
