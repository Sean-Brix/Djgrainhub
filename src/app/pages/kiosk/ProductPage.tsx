import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Plus, Minus, ChevronRight, LogOut, ShoppingCart } from 'lucide-react';
import logo from '@/assets/c35d81f584a09df9348d8ddde3e202e99fefbfbb.png';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import type { Product } from '../../lib/dataHelpers';

interface CartItem {
  product: Product;
  quantity: number;
}

interface ProductPageProps {
  products: Product[];
  cart: CartItem[];
  onUpdateCart: (cart: CartItem[]) => void;
  onCheckout: () => void;
  onExit: () => void;
}

export function ProductPage({ products, cart, onUpdateCart, onCheckout, onExit }: ProductPageProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Ensure we display exactly 6 slots
  const displaySlots = Array.from({ length: 6 }).map((_, i) => {
    return products.find(p => p.slotNumber === i + 1) || null;
  });

  const handleSelectProduct = (product: Product) => {
    if (product.stock <= 0) return;
    setSelectedProduct(product);
    setQuantity(1);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const existingItemIndex = cart.findIndex(item => item.product.id === selectedProduct.id);
    let newCart = [...cart];
    if (existingItemIndex >= 0) {
      newCart[existingItemIndex].quantity += quantity;
    } else {
      newCart.push({ product: selectedProduct, quantity });
    }
    onUpdateCart(newCart);
    setSelectedProduct(null);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    onUpdateCart(newCart);
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalWeight = cart.reduce((sum, item) => sum + (item.product.weight * item.quantity), 0);
  const totalPiecesCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-[#F0F4F1] text-[#1F4D3A] overflow-hidden font-sans">

      {/* ── Compact Header ── */}
      <header className="bg-[#1F4D3A] text-white flex items-center justify-between px-4 py-2.5 z-20 shadow-md flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20 flex-shrink-0">
            <img src={logo} alt="DJ Grain Hub" className="w-5 h-5 object-contain" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="font-black text-sm tracking-tighter leading-none">GRAIN HUB</p>
            <p className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-widest">Premium Selection</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            className="relative flex items-center gap-1.5 h-8 px-3 rounded-full border border-white/20 bg-white/10 text-white text-xs font-bold"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingCart className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>Cart</span>
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-[#D4AF37] text-[#1F4D3A] text-[9px] font-black border border-[#1F4D3A]">
                {cart.length}
              </span>
            )}
          </button>
          <button
            className="h-8 w-8 flex items-center justify-center rounded-full text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            onClick={onExit}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ── Product Grid (2 cols × 3 rows, no scroll) ── */}
      <div className="flex-1 overflow-hidden p-2.5 pb-0">
        <div className="grid grid-cols-2 gap-2 h-full" style={{ gridTemplateRows: 'repeat(3, 1fr)' }}>
          {displaySlots.map((product, idx) => {
            const cartItem = product ? cart.find(item => item.product.id === product.id) : null;
            const available = product && product.stock > 0;
            return (
              <motion.div
                key={product?.id || `empty-${idx}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.04 }}
                whileTap={available ? { scale: 0.97 } : {}}
                onClick={() => product && available && handleSelectProduct(product)}
                className={`rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col relative
                  ${!available ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer active:shadow-md'}
                  ${cartItem ? 'ring-2 ring-[#1F4D3A]' : ''}`}
              >
                {product ? (
                  <>
                    {/* Product image — takes upper ~55% of card */}
                    <div className="relative flex-shrink-0" style={{ flex: '0 0 55%' }}>
                      <ImageWithFallback
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Price badge */}
                      <span className="absolute top-1.5 right-1.5 bg-[#1F4D3A] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                        ₱{product.price}
                      </span>
                      {/* In-cart indicator */}
                      {cartItem && (
                        <span className="absolute top-1.5 left-1.5 bg-[#1F4D3A] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow">
                          <ShoppingCart size={9} />{cartItem.quantity}
                        </span>
                      )}
                      {/* Out of stock overlay */}
                      {!available && (
                        <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                          <span className="text-white text-[10px] font-black uppercase tracking-widest bg-rose-600/80 px-2 py-0.5 rounded-full">Sold Out</span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex flex-col justify-between p-2" style={{ flex: '1' }}>
                      <div>
                        <p className="font-black text-[11px] text-slate-900 leading-tight truncate">{product.name}</p>
                        <p className="text-[9px] text-slate-400 font-semibold">{product.weight}kg · Slot {product.slotNumber}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${available ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className={`text-[9px] font-bold uppercase tracking-wide ${available ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {available ? `${product.stock} left` : 'Out of stock'}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                    <div className="text-center opacity-25">
                      <div className="w-8 h-8 bg-slate-200 rounded-full mx-auto mb-1 flex items-center justify-center">
                        <X size={14} className="text-slate-400" />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Slot {idx + 1}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Compact Bottom Bar ── */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-[#1F4D3A] text-white flex items-center justify-between px-4 py-2.5 flex-shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]"
      >
        {/* Summary pills */}
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-[8px] text-white/40 font-black uppercase tracking-widest leading-none">Weight</p>
            <p className="text-base font-black tabular-nums leading-tight">{totalWeight}<span className="text-[9px] font-bold text-white/50 ml-0.5">kg</span></p>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div className="text-center">
            <p className="text-[8px] text-white/40 font-black uppercase tracking-widest leading-none">Total</p>
            <p className="text-base font-black tabular-nums text-[#D4AF37] leading-tight">₱{totalAmount.toLocaleString()}</p>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            className="h-9 px-3 rounded-xl border border-white/20 bg-white/10 text-white text-xs font-bold"
            onClick={() => setIsCartOpen(true)}
          >
            Review
          </button>
          <button
            disabled={cart.length === 0}
            onClick={onCheckout}
            className="h-9 px-4 rounded-xl bg-[#D4AF37] text-[#1F4D3A] text-xs font-black flex items-center gap-1 disabled:opacity-40 transition-all active:scale-95 shadow-md"
          >
            Checkout <ChevronRight size={14} strokeWidth={3} />
          </button>
        </div>
      </motion.div>

      {/* ── Cart Side Drawer ── */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
              onClick={() => setIsCartOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col"
            >
              {/* Drawer header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1F4D3A]/10 flex items-center justify-center">
                    <ShoppingBag className="text-[#1F4D3A]" size={18} />
                  </div>
                  <div>
                    <h2 className="font-black text-lg text-slate-900 tracking-tight leading-none">Your Order</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cart.length} items</p>
                  </div>
                </div>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
                  onClick={() => setIsCartOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Cart items */}
              <ScrollArea className="flex-1 px-4 py-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-300 gap-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                      <ShoppingBag size={32} strokeWidth={1.5} />
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-slate-900">Cart is empty</p>
                      <p className="text-xs text-slate-400 mt-1">Tap a product to add it</p>
                    </div>
                    <button className="text-xs font-bold text-[#1F4D3A] underline underline-offset-2" onClick={() => setIsCartOpen(false)}>
                      Start Selection
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {cart.map((item, index) => (
                      <motion.div
                        layout
                        key={`${item.product.id}-${index}`}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 group relative"
                      >
                        <div className="w-16 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 shadow-sm">
                          <ImageWithFallback src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="font-black text-sm text-slate-900 truncate leading-tight">{item.product.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{item.quantity} pcs · {item.quantity * item.product.weight}kg</p>
                          <p className="font-black text-[#1F4D3A] text-base leading-tight mt-0.5">₱{(item.product.price * item.quantity).toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="absolute -top-1.5 -right-1.5 bg-white text-rose-500 border border-slate-100 rounded-full p-1 shadow-md hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X size={12} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Drawer footer */}
              <div className="px-4 py-4 border-t border-slate-100 bg-white flex-shrink-0">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs text-slate-400 font-bold">{totalWeight} kg total</div>
                  <div className="text-xl font-black text-[#1F4D3A]">₱{totalAmount.toLocaleString()}</div>
                </div>
                <Button
                  className="w-full h-12 text-base font-black bg-[#1F4D3A] hover:bg-[#153428] rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                  disabled={cart.length === 0}
                  onClick={() => { setIsCartOpen(false); onCheckout(); }}
                >
                  Proceed to Payment
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Product Detail Modal ── */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 z-[60] flex items-end justify-center backdrop-blur-md"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="bg-white rounded-t-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
              style={{ maxHeight: '85dvh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Image strip */}
              <div className="relative h-44 flex-shrink-0 bg-[#1F4D3A]">
                <ImageWithFallback
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover opacity-75"
                />
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 w-8 h-8 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/20"
                >
                  <X size={16} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-8 bg-gradient-to-t from-[#1F4D3A] to-transparent">
                  <h2 className="text-2xl font-black text-white tracking-tighter leading-none">{selectedProduct.name}</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge className="bg-[#D4AF37] text-[#1F4D3A] font-black px-3 py-0.5 rounded-full text-sm">₱{selectedProduct.price}</Badge>
                    <span className="text-white/60 font-bold uppercase tracking-widest text-[10px]">{selectedProduct.weight}KG PACK</span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="p-5 flex flex-col gap-4 flex-1">
                {/* Quantity */}
                <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</span>
                  <div className="flex items-center gap-5">
                    <button
                      className="w-10 h-10 rounded-2xl border-2 border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus size={18} strokeWidth={3} />
                    </button>
                    <span className="text-4xl font-black text-slate-900 tabular-nums w-10 text-center leading-none">{quantity}</span>
                    <button
                      className="w-10 h-10 rounded-2xl border-2 border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors"
                      onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}
                      disabled={quantity >= selectedProduct.stock}
                    >
                      <Plus size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
                  <span className="text-xs font-bold text-slate-500">{quantity * selectedProduct.weight}kg net weight</span>
                  <span className="text-xl font-black text-[#1F4D3A] tracking-tighter">₱{(selectedProduct.price * quantity).toLocaleString()}</span>
                </div>

                {/* Add button */}
                <Button
                  className="w-full h-13 text-base font-black bg-[#D4AF37] text-[#1F4D3A] hover:bg-[#c29f2f] rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                  onClick={handleAddToCart}
                >
                  Add to My Order
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
