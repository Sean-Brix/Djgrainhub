import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Plus, Minus, ChevronRight, LogOut, ShoppingCart } from 'lucide-react';
import logo from '@/assets/c35d81f584a09df9348d8ddde3e202e99fefbfbb.png';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import type { Product } from '../../lib/dataHelpers';

interface CartItem {
  product: Product;
  quantity: number; // in pieces
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
    <div className="flex flex-col h-full bg-[#F8FAFC] text-[#1F4D3A] overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-[#1F4D3A] text-white flex justify-between items-center shadow-lg z-20 gap-4 px-6 py-4 md:px-10 md:py-6">
        <div className="flex items-center gap-4 min-w-0">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/20"
          >
            <img src={logo} alt="DJ Grain Hub" className="w-7 h-7 md:w-8 md:h-8 object-contain" />
          </motion.div>
          <div className="min-w-0">
            <h1 className="font-black text-lg md:text-2xl leading-none truncate tracking-tighter">GRAIN HUB</h1>
            <p className="text-[10px] md:text-xs text-[#D4AF37] font-bold uppercase tracking-widest mt-0.5">Premium Selection</p>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-10 px-4 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/15 relative font-bold text-xs md:text-sm"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingCart className="mr-2 h-4 w-4 text-[#D4AF37]" /> 
            <span>View Order</span>
            {cart.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-[#D4AF37] text-[#1F4D3A] border-2 border-[#1F4D3A] text-[10px] font-black">
                {cart.length}
              </Badge>
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white/40 hover:text-rose-400 h-10 px-3 rounded-full hover:bg-rose-500/10 transition-colors" 
            onClick={onExit}
          >
            <LogOut className="h-4 w-4" /> 
          </Button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        {/* Product Grid - 6 Slots Fixed */}
        <div className="h-full p-6 md:p-10 overflow-y-auto pb-40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {displaySlots.map((product, idx) => (
              <motion.div
                key={product?.id || `empty-${idx}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={product && product.stock > 0 ? { y: -5 } : {}}
                whileTap={product && product.stock > 0 ? { scale: 0.98 } : {}}
                onClick={() => product && handleSelectProduct(product)}
                className={!product || product.stock <= 0 ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
              >
                <Card className={`overflow-hidden border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.08)] h-full bg-white group transition-all duration-300 relative rounded-[2rem] ${product && cart.find(item => item.product.id === product.id) ? 'ring-2 ring-primary' : ''}`}>
                  {product ? (
                    <div className="flex flex-col h-full">
                      <div className="w-full h-48 md:h-64 bg-slate-50 relative overflow-hidden flex-shrink-0">
                        <ImageWithFallback 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-[#1F4D3A] text-white font-black text-sm px-4 py-1.5 rounded-full shadow-lg border border-white/20">
                            ₱{product.price}
                          </Badge>
                        </div>
                        {(() => {
                          const cartItem = cart.find(item => item.product.id === product.id);
                          return cartItem ? (
                            <div className="absolute top-4 left-4">
                              <div className="px-3 py-1 rounded-full bg-primary text-white flex items-center gap-2 shadow-lg border border-white/20 font-black text-xs">
                                <ShoppingCart size={12} />
                                {cartItem.quantity} In Cart
                              </div>
                            </div>
                          ) : null;
                        })()}
                        <div className="absolute bottom-4 left-4">
                          <Badge variant="secondary" className="bg-white/90 backdrop-blur-md text-[#1F4D3A] text-[10px] font-black px-3 py-1 rounded-full shadow-sm">
                            {product.weight}KG UNIT
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-6 flex flex-col justify-center flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-black text-xl text-slate-900 tracking-tight truncate">{product.name}</h3>
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">SLOT {product.slotNumber}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-500 mb-4">Premium local rice variety</p>
                        <div className="flex items-center justify-between mt-auto">
                          {product.stock > 0 ? (
                            <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-emerald-500" />
                               <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Available</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-rose-500" />
                               <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Out of Stock</span>
                            </div>
                          )}
                          <span className="text-xs font-bold text-slate-400">{product.stock} units left</span>
                        </div>
                      </CardContent>
                    </div>
                  ) : (
                    <div className="h-full min-h-[16rem] flex items-center justify-center p-10 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2rem]">
                      <div className="text-center opacity-20">
                        <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                           <X size={20} className="text-slate-400" />
                        </div>
                        <p className="font-bold uppercase tracking-widest text-[10px]">Slot {idx + 1}</p>
                        <p className="text-[10px] font-medium">Empty</p>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Floating Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none p-[0px]">
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="pointer-events-auto bg-[#1F4D3A] text-white px-8 py-6 flex flex-col lg:flex-row items-center justify-between w-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 gap-6"
          >
            <div className="flex flex-wrap items-center gap-6 md:gap-12 w-full lg:w-auto justify-center lg:justify-start">
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black">Net Weight</span>
                <span className="text-2xl font-black tabular-nums">{totalWeight} kg</span>
              </div>
              <div className="hidden sm:block w-[1px] h-10 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black">Total Items</span>
                <span className="text-2xl font-black tabular-nums">{totalPiecesCount} pcs</span>
              </div>
              <div className="hidden sm:block w-[1px] h-10 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black">Total Due</span>
                <span className="text-2xl font-black text-[#D4AF37] tabular-nums">₱{totalAmount.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="flex gap-4 w-full lg:w-auto">
              <Button 
                variant="ghost"
                className="h-14 px-8 rounded-2xl bg-white/5 text-white hover:bg-white/10 font-bold text-sm flex-1 lg:flex-none border border-white/10 transition-all"
                onClick={() => setIsCartOpen(true)}
              >
                Review Cart
              </Button>
              <Button 
                className="h-14 px-10 md:px-16 text-lg font-black bg-[#D4AF37] text-[#1F4D3A] hover:bg-[#c29f2f] hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl shadow-xl flex-1 lg:flex-none"
                disabled={cart.length === 0}
                onClick={onCheckout}
              >
                Checkout Now <ChevronRight className="ml-2 h-6 w-6" strokeWidth={3} />
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Cart Side-over */}
        <AnimatePresence>
          {isCartOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40"
                onClick={() => setIsCartOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
              >
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center">
                       <ShoppingBag className="text-primary" size={24} />
                    </div>
                    <div>
                       <h2 className="font-black text-2xl text-slate-900 tracking-tight">Your Order</h2>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cart.length} Varieties selected</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full"
                    onClick={() => setIsCartOpen(false)}
                  >
                    <X size={24} />
                  </Button>
                </div>
                
                <ScrollArea className="flex-1 p-8">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-6 py-20">
                      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
                         <ShoppingBag size={48} strokeWidth={1.5} />
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-900">Cart is empty</p>
                        <p className="text-sm font-medium text-slate-500 mt-2">Select your favorite rice to continue</p>
                      </div>
                      <Button variant="outline" className="rounded-xl px-8" onClick={() => setIsCartOpen(false)}>Start Selection</Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {cart.map((item, index) => (
                        <motion.div 
                          layout
                          key={`${item.product.id}-${index}`} 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex gap-5 bg-slate-50/50 p-4 rounded-3xl border border-slate-100 group relative"
                        >
                          <div className="w-24 h-24 bg-white rounded-2xl overflow-hidden flex-shrink-0 shadow-sm border border-slate-100">
                            <ImageWithFallback 
                              src={item.product.imageUrl} 
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h4 className="font-black text-lg text-slate-900 truncate tracking-tight">{item.product.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                               <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold rounded-lg text-[10px]">{item.quantity} PCS</Badge>
                               <span className="text-xs font-medium text-slate-400">{item.quantity * item.product.weight}KG TOTAL</span>
                            </div>
                            <p className="font-black text-primary mt-2 text-xl tracking-tighter">₱{(item.product.price * item.quantity).toLocaleString()}</p>
                          </div>
                          <button 
                            onClick={() => removeFromCart(index)}
                            className="absolute -top-2 -right-2 bg-white text-rose-500 border border-slate-100 rounded-full p-2 shadow-lg hover:bg-rose-500 hover:text-white transition-all scale-0 group-hover:scale-100"
                          >
                            <X size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-8 border-t border-slate-100 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-400 uppercase tracking-widest">
                      <span>Total weight</span>
                      <span className="text-slate-900">{totalWeight} kg</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-lg font-bold text-slate-900">Total Due</span>
                      <span className="text-3xl font-black text-primary tracking-tighter">₱{totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full h-16 text-xl font-black bg-[#1F4D3A] hover:bg-[#153428] shadow-2xl rounded-2xl transition-all active:scale-[0.98]"
                    disabled={cart.length === 0}
                    onClick={() => {
                      setIsCartOpen(false);
                      onCheckout();
                    }}
                  >
                    Proceed to Payment
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Product Selection Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 z-[60] flex items-center justify-center backdrop-blur-xl p-6"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative"
              style={{ maxHeight: '90dvh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Image Header */}
              <div className="bg-[#1F4D3A] relative h-64 md:h-80 flex-shrink-0">
                <ImageWithFallback 
                  src={selectedProduct.imageUrl} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover opacity-80"
                />
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all border border-white/20"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#1F4D3A] via-[#1F4D3A]/80 to-transparent">
                  <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">{selectedProduct.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className="bg-[#D4AF37] text-[#1F4D3A] font-black px-4 py-1.5 rounded-full text-base">₱{selectedProduct.price}</Badge>
                    <span className="text-white/60 font-bold uppercase tracking-widest text-xs">{selectedProduct.weight}KG PREMIUM PACK</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 md:p-10 flex flex-col gap-8 flex-1">
                {/* Quantity Controls */}
                <div className="flex flex-col items-center gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Adjust Quantity</span>
                  <div className="flex items-center gap-10">
                    <button 
                      className="w-14 h-14 md:w-16 md:h-16 rounded-3xl border-2 border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-400 disabled:opacity-30"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus size={24} strokeWidth={3} />
                    </button>
                    <div className="text-center min-w-[5rem]">
                      <span className="text-5xl md:text-6xl font-black text-slate-900 tabular-nums leading-none tracking-tighter">{quantity}</span>
                    </div>
                    <button 
                      className="w-14 h-14 md:w-16 md:h-16 rounded-3xl border-2 border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-900 disabled:opacity-30"
                      onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}
                      disabled={quantity >= selectedProduct.stock}
                    >
                      <Plus size={24} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-slate-50 p-6 rounded-[2rem] flex items-center justify-between border border-slate-100">
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Impact</span>
                    <span className="text-sm font-bold text-slate-900">{quantity * selectedProduct.weight} kg total net weight</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subtotal</span>
                    <span className="text-2xl font-black text-primary tracking-tighter">₱{(selectedProduct.price * quantity).toLocaleString()}</span>
                  </div>
                </div>

                {/* Add Button */}
                <Button 
                  className="w-full h-16 md:h-20 text-xl font-black bg-[#D4AF37] text-[#1F4D3A] hover:bg-[#c29f2f] rounded-3xl shadow-xl transition-all active:scale-[0.98] mt-auto"
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
