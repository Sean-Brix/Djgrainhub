import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, QrCode, Smartphone } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

interface PaymentPageProps {
  totalAmount: number;
  onBack: () => void;
  onSuccess: () => void;
}

export function PaymentPage({ totalAmount, onBack, onSuccess }: PaymentPageProps) {
  
  // Simulate payment detection
  useEffect(() => {
    const timer = setTimeout(() => {
      onSuccess();
    }, 5000); // Auto succeed after 5s for demo
    return () => clearTimeout(timer);
  }, [onSuccess]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full bg-[#F5F5F0] text-[#1F4D3A]"
    >
      <header className="bg-[#1F4D3A] text-white p-4 flex items-center shadow-md z-10">
        <Button variant="ghost" onClick={onBack} className="text-white hover:bg-white/10 mr-4">
          <ChevronLeft className="mr-2" /> Back
        </Button>
        <h1 className="font-bold text-xl">Payment</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Card className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border-2 border-[#1F4D3A]/10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Scan to Pay</h2>
            <p className="text-[#1F4D3A]/60">Use GCash or any QR PH app</p>
          </div>

          <div className="bg-[#1F4D3A]/5 p-8 rounded-2xl mb-8 flex items-center justify-center relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#1F4D3A] rounded-tl-xl -mt-1 -ml-1" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#1F4D3A] rounded-tr-xl -mt-1 -mr-1" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#1F4D3A] rounded-bl-xl -mb-1 -ml-1" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#1F4D3A] rounded-br-xl -mb-1 -mr-1" />
            
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PayMongo-Payment-${totalAmount}`} 
              alt="Payment QR Code"
              className="w-48 h-48 mix-blend-multiply opacity-90"
            />
          </div>

          <div className="flex items-center justify-between bg-[#F5F5F0] p-4 rounded-xl mb-6">
            <span className="font-medium text-[#1F4D3A]/70">Total Amount</span>
            <span className="text-3xl font-black text-[#1F4D3A]">₱{totalAmount.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-[#1F4D3A]/50 animate-pulse">
            <Smartphone size={16} />
            <span>Waiting for payment...</span>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
