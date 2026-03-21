import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Share2, Printer, Home } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface ReceiptPageProps {
  cart: Array<{ product: { name: string; price: number }; quantity: number }>;
  totalAmount: number;
  onProceed: () => void;
}

export function ReceiptPage({ cart, totalAmount, onProceed }: ReceiptPageProps) {
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (countdown === 0) {
      onProceed();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, onProceed]);

  return (
    <div className="h-full flex flex-col bg-background items-center justify-center p-[clamp(0.75rem,2vw,1.5rem)] text-primary select-none">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-primary/5"
        style={{ maxHeight: 'calc(100dvh - clamp(1.5rem, 4vw, 3rem))' }}
      >
        {/* Success Header */}
        <div
          className="bg-primary text-center text-white relative overflow-hidden flex-shrink"
          style={{ padding: 'clamp(0.75rem, 2.5vh, 2rem) clamp(1rem, 3vw, 2rem)' }}
        >
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-10 -right-10 w-28 h-28 sm:w-40 sm:h-40 border-4 border-dashed border-accent/20 rounded-full"
          />
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
            className="bg-accent rounded-full flex items-center justify-center mx-auto shadow-lg relative z-10"
            style={{ width: 'clamp(2.5rem, 6vh, 5rem)', height: 'clamp(2.5rem, 6vh, 5rem)', marginBottom: 'clamp(0.25rem, 1vh, 1rem)' }}
          >
            <CheckCircle style={{ width: 'clamp(1.25rem, 3vh, 2.5rem)', height: 'clamp(1.25rem, 3vh, 2.5rem)' }} className="text-primary" />
          </motion.div>
          <h1 className="font-bold relative z-10" style={{ fontSize: 'clamp(1rem, 2.5vh, 1.875rem)', lineHeight: 1.2 }}>Success!</h1>
          <p className="text-white/60 relative z-10 uppercase tracking-widest font-bold" style={{ fontSize: 'clamp(6px, 1vh, 10px)', marginTop: 'clamp(0px, 0.25vh, 4px)' }}>Transaction Completed</p>
        </div>

        {/* Content */}
        <div
          className="flex-1 flex flex-col justify-between min-h-0"
          style={{ padding: 'clamp(0.5rem, 1.5vh, 2rem) clamp(1rem, 3vw, 2rem)' }}
        >
          {/* Order Summary Header */}
          <div className="text-center" style={{ marginBottom: 'clamp(0.25rem, 1vh, 1.5rem)' }}>
            <p className="uppercase tracking-widest text-primary/40 font-bold" style={{ fontSize: 'clamp(9px, 1.2vh, 14px)', marginBottom: 'clamp(2px, 0.5vh, 8px)' }}>Order Summary</p>
            <p className="text-primary/30 font-medium" style={{ fontSize: 'clamp(8px, 1vh, 12px)' }}>Order ID: #DJG-{Math.floor(100000 + Math.random() * 900000)}</p>
            <p className="text-primary/30" style={{ fontSize: 'clamp(8px, 1vh, 12px)' }}>{new Date().toLocaleDateString()} | {new Date().toLocaleTimeString()}</p>
          </div>

          {/* Cart Items */}
          <div
            className="border-t border-b border-dashed border-primary/10 flex flex-col"
            style={{ padding: 'clamp(0.25rem, 1vh, 1.5rem) 0', gap: 'clamp(0.125rem, 0.75vh, 1rem)' }}
          >
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between" style={{ fontSize: 'clamp(10px, 1.2vh, 14px)' }}>
                <span className="font-medium text-primary/80">{item.quantity}x {item.product.name}</span>
                <span className="font-bold text-primary flex-shrink-0 ml-2">₱{(item.product.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center" style={{ marginTop: 'clamp(0.25rem, 1vh, 1.5rem)' }}>
            <span className="font-bold" style={{ fontSize: 'clamp(11px, 1.4vh, 18px)' }}>Total Paid</span>
            <div className="text-right">
              <span className="font-black text-primary" style={{ fontSize: 'clamp(1rem, 2.5vh, 1.875rem)' }}>₱{totalAmount.toLocaleString()}</span>
              <p className="font-bold text-accent uppercase tracking-tighter" style={{ fontSize: 'clamp(7px, 0.9vh, 10px)', marginTop: '-2px' }}>via GCash</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="bg-gray-50 border-t flex flex-col flex-shrink-0"
          style={{ padding: 'clamp(0.375rem, 1vh, 1.5rem) clamp(1rem, 3vw, 2rem)', gap: 'clamp(0.25rem, 0.75vh, 1rem)' }}
        >
          <div className="text-center font-medium text-primary/40 uppercase tracking-widest" style={{ fontSize: 'clamp(8px, 1vh, 12px)' }}>
            Closing in <span className="text-primary font-black tabular-nums">{countdown}s</span>
          </div>
          
          <Button 
            className="w-full rounded-xl sm:rounded-2xl font-bold bg-primary hover:bg-secondary text-white flex items-center justify-center transition-all active:scale-95"
            style={{ height: 'clamp(2.25rem, 4vh, 4rem)', fontSize: 'clamp(0.75rem, 1.5vh, 1.25rem)', gap: 'clamp(0.375rem, 0.75vh, 0.75rem)' }}
            onClick={onProceed}
          >
            <Home style={{ width: 'clamp(1rem, 1.8vh, 1.5rem)', height: 'clamp(1rem, 1.8vh, 1.5rem)' }} />
            Done & Proceed
          </Button>
        </div>
      </motion.div>
      
      <p className="text-primary/30 font-bold tracking-widest uppercase text-center max-w-[280px]" style={{ marginTop: 'clamp(0.5rem, 1.5vh, 2rem)', fontSize: 'clamp(8px, 1vh, 12px)' }}>
        Thank you for choosing DJ Grain Hub. Freshness in every grain.
      </p>
    </div>
  );
}