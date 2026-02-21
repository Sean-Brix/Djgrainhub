import React, { useState, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { X, ImagePlus, Box } from 'lucide-react';
import { type Product } from '../../../lib/dataHelpers';

export interface ProductFormData {
  name: string;
  slotNumber: number;
  price: number;
  cost: number;
  weight: number;
  stock: number;
  imageUrl: string;
}

const EMPTY_FORM: ProductFormData = { name: '', slotNumber: 1, price: 0, cost: 0, weight: 0, stock: 0, imageUrl: '' };

interface ProductFormModalProps {
  open: boolean;
  product: Product | null;
  usedSlots: number[];
  onSave: (data: ProductFormData) => void;
  onClose: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  open,
  product,
  usedSlots,
  onSave,
  onClose,
}) => {
  const isEdit = !!product;
  const [form, setForm] = useState<ProductFormData>(
    product
      ? { name: product.name, slotNumber: product.slotNumber, price: product.price, cost: product.cost, weight: product.weight, stock: product.stock, imageUrl: product.imageUrl }
      : { ...EMPTY_FORM, slotNumber: getNextSlot(usedSlots) }
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  React.useEffect(() => {
    if (product) {
      setForm({ name: product.name, slotNumber: product.slotNumber, price: product.price, cost: product.cost, weight: product.weight, stock: product.stock, imageUrl: product.imageUrl });
    } else {
      setForm({ ...EMPTY_FORM, slotNumber: getNextSlot(usedSlots) });
    }
  }, [product, open]);

  if (!open) return null;

  function getNextSlot(used: number[]): number {
    for (let i = 1; i <= 6; i++) {
      if (!used.includes(i)) return i;
    }
    return 1;
  }

  const availableSlots = isEdit
    ? [product!.slotNumber, ...([1,2,3,4,5,6].filter(s => !usedSlots.includes(s)))]
    : [1,2,3,4,5,6].filter(s => !usedSlots.includes(s));

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 5 MB.`);
      // Reset the input so the user can try again
      e.target.value = '';
      return;
    }

    setImageError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => ({ ...f, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const canSave = form.name.trim() && form.price > 0 && form.weight > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background w-full sm:max-w-md sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="text-lg font-bold">{isEdit ? 'Edit Product' : 'Add Product'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4 pb-12">
          <div>
            <label className="text-sm text-muted-foreground font-medium mb-1.5 block">Product Image</label>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus size={24} className="text-muted-foreground/50" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus size={14} className="mr-1.5" /> Upload Image
                </Button>
                <Input
                  type="text"
                  placeholder="Or paste image URL..."
                  value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl}
                  onChange={e => { setImageError(null); setForm(f => ({ ...f, imageUrl: e.target.value })); }}
                  className="text-xs h-8"
                />
                {imageError && (
                  <p className="text-xs text-destructive leading-tight">{imageError}</p>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground font-medium mb-1.5 block">Product Name</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Premium Jasmine" />
          </div>

          <div>
            <label className="text-sm text-muted-foreground font-medium mb-1.5 block">Slot Number</label>
            <div className="flex gap-2">
              {[1,2,3,4,5,6].map(s => {
                const isAvailable = availableSlots.includes(s);
                const isSelected = form.slotNumber === s;
                return (
                  <button
                    key={s}
                    disabled={!isAvailable}
                    onClick={() => setForm(f => ({ ...f, slotNumber: s }))}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : isAvailable
                        ? 'bg-muted hover:bg-muted/80 text-foreground'
                        : 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground font-medium mb-1.5 block">Sell Price (per pc)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
                <Input type="number" min={0} className="pl-7" value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground font-medium mb-1.5 block">Cost (per pc)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
                <Input type="number" min={0} className="pl-7" value={form.cost || ''} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))} placeholder="0" />
              </div>
            </div>
          </div>
          {form.price > 0 && form.cost > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg text-xs">
              <span className="text-muted-foreground">Margin:</span>
              <span className={`font-bold ${((form.price - form.cost) / form.price) * 100 >= 30 ? 'text-green-600' : 'text-amber-600'}`}>
                ₱{form.price - form.cost}/pc ({(((form.price - form.cost) / form.price) * 100).toFixed(1)}%)
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground font-medium mb-1.5 block">Weight (kg/pc)</label>
              <div className="relative">
                <Input type="number" min={0} step={0.1} value={form.weight || ''} onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) }))} placeholder="0" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">kg</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground font-medium mb-1.5 block">Stock (pieces)</label>
              <Input type="number" min={0} value={form.stock || ''} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} placeholder="0" />
            </div>
          </div>
        </div>

        <div className="px-5 py-4 md:pb-4 pb-24 border-t border-border flex gap-3 sticky bottom-0 bg-background z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!canSave} onClick={() => onSave(form)}>
            {isEdit ? 'Save Changes' : 'Add Product'}
          </Button>
        </div>
      </div>
    </div>
  );
};
