import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/AuthContext';
import { useData } from '../../lib/DataContext';
import { MachineSelectPage } from '../kiosk/MachineSelectPage';
import { IdlePage as WelcomePage } from '../kiosk/IdlePage';
import { ProductPage } from '../kiosk/ProductPage';
import { PaymentPage } from '../kiosk/PaymentPage';
import { DispensingPage } from '../kiosk/DispensingPage';
import { ReceiptPage } from '../kiosk/ReceiptPage';
import { ProcessingPage } from './components/ProcessingPage';

const KIOSK_MACHINE_KEY = 'dj_grain_hub_kiosk_machine';

type KioskStep = 'machine-select' | 'welcome' | 'products' | 'payment' | 'processing' | 'dispensing' | 'receipt';

interface CartItem {
  product: any;
  quantity: number;
}

export default function Kiosk({ onExit }: { onExit?: () => void }) {
  const { user } = useAuth();
  const { getMachinesForUser, getProductsForMachine, addSale, decrementStock, updateMachine } = useData();
  const [cart, setCart] = useState<CartItem[]>([]);

  const machines = user ? getMachinesForUser(user) : [];

  const [machineId, setMachineId] = useState<string | null>(() => {
    const saved = localStorage.getItem(KIOSK_MACHINE_KEY);
    if (!saved) return null;
    return saved;
  });

  const [step, setStep] = useState<KioskStep>(() =>
    machineId ? 'welcome' : 'machine-select'
  );

  const products = machineId ? getProductsForMachine(machineId) : [];

  const handleMachineSelect = (id: string) => {
    setMachineId(id);
    localStorage.setItem(KIOSK_MACHINE_KEY, id);
    setStep('welcome');
  };

  const handleMachineSelectBack = () => {
    if (onExit) onExit();
  };

  const handleStart = () => setStep('products');
  const handleCheckout = () => setStep('payment');
  const handlePaymentSelect = () => {
    setStep('processing');
  };
  const handleProcessComplete = () => {
    if (machineId && cart.length > 0) {
      const saleId = `sale-kiosk-${Date.now()}`;
      addSale({
        id: saleId,
        machineId,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        })),
        totalPrice: totalAmount,
        timestamp: new Date().toISOString(),
        status: 'completed',
      });

      cart.forEach(item => {
        decrementStock(item.product.id, item.quantity);
      });

      updateMachine(machineId, {
        earnings: (machines.find(m => m.id === machineId)?.earnings || 0) + totalAmount,
      });
    }
    setStep('dispensing');
  };
  const handleDispenseComplete = () => setStep('receipt');
  const handleDone = () => {
    setCart([]);
    setStep('welcome');
  };

  const handleAdminExit = () => {
    localStorage.removeItem(KIOSK_MACHINE_KEY);
    setMachineId(null);
    if (onExit) onExit();
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const renderStep = () => {
    switch (step) {
      case 'machine-select':
        return (
          <MachineSelectPage
            machines={machines}
            onSelect={handleMachineSelect}
            onBack={handleMachineSelectBack}
          />
        );
      case 'welcome':
        return <WelcomePage onStart={handleStart} onAdminExit={handleAdminExit} machineId={machineId || undefined} />;
      case 'products':
        return (
          <ProductPage 
            products={products} 
            cart={cart} 
            onUpdateCart={setCart} 
            onCheckout={handleCheckout}
            onExit={handleDone}
          />
        );
      case 'payment':
        return (
          <PaymentPage 
            totalAmount={totalAmount} 
            onSuccess={handlePaymentSelect} 
            onBack={() => setStep('products')} 
          />
        );
      case 'processing':
        return (
          <ProcessingPage 
            paymentMethod="GCash" 
            onComplete={handleProcessComplete} 
          />
        );
      case 'dispensing':
        return (
          <DispensingPage 
            onComplete={handleDispenseComplete} 
          />
        );
      case 'receipt':
        return (
          <ReceiptPage 
            cart={cart} 
            totalAmount={totalAmount} 
            onProceed={handleDone} 
          />
        );
      default:
        return <WelcomePage onStart={handleStart} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={step === 'welcome' || step === 'machine-select' ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full w-full"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
