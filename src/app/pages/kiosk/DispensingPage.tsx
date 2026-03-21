import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Wheat, AlertTriangle, RefreshCw } from 'lucide-react';
import { getStoredToken } from '../../lib/auth';

interface CartItem {
  product: { id: string; slotNumber: number; name: string; price: number };
  quantity: number;
}

interface DispensingPageProps {
  machineId: string;
  cart: CartItem[];
  saleId?: string;        // passed from kiosk — used to confirm sale on server
  onComplete: () => void;
}

type Phase = 'sending' | 'waiting' | 'success' | 'malfunction' | 'error';

interface SlotResult {
  ordered: number;
  dispensedOk: boolean;
}

/** Build { slot1: qty, slot2: qty, ..., slot6: qty } from the cart */
function buildSlotPayload(cart: CartItem[]): Record<string, number> {
  const slots: Record<string, number> = {
    slot1: 0, slot2: 0, slot3: 0, slot4: 0, slot5: 0, slot6: 0,
  };
  for (const item of cart) {
    const key = `slot${item.product.slotNumber}`;
    if (key in slots) slots[key] += item.quantity;
  }
  return slots;
}

export function DispensingPage({ machineId, cart, saleId, onComplete }: DispensingPageProps) {
  const [phase, setPhase] = useState<Phase>('sending');
  const [slotResults, setSlotResults] = useState<Record<string, SlotResult>>({});
  const [errorMsg, setErrorMsg] = useState<string>('');
  const hasSent = useRef(false);

  async function sendOrder() {
    hasSent.current = true;
    setPhase('sending');
    setErrorMsg('');

    const token = getStoredToken();
    const slots = buildSlotPayload(cart);

    try {
      setPhase('waiting');
      const res = await fetch(`/api/machines/${machineId}/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(slots),
      });

      const data = await res.json();

      if (res.status === 504) {
        // No confirmation from machine within timeout
        setErrorMsg(data.error || 'Machine did not respond in time. Please collect your order manually or contact support.');
        setPhase('error');
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.error || 'An unexpected error occurred.');
        setPhase('error');
        return;
      }

      // Store slot-level results
      setSlotResults(data.dispenseConfirmation || {});

      if (data.allOk) {
        setPhase('success');
        setTimeout(onComplete, 2000);
      } else {
        setPhase('malfunction');
      }
    } catch (err) {
      setErrorMsg('Could not reach the server. Check your connection and try again.');
      setPhase('error');
    }
  }

  useEffect(() => {
    if (!hasSent.current) sendOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isWaiting = phase === 'sending' || phase === 'waiting';

  // Slots that were ordered but failed to dispense correctly
  const failedSlots = Object.entries(slotResults).filter(
    ([, r]) => !r.dispensedOk
  );

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center bg-primary text-white z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background orbs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
        className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/5 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
        transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
        className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-accent/10 rounded-full blur-[120px]"
      />

      {/* Icon area */}
      <div className="relative mb-10">
        <motion.div
          animate={isWaiting ? { scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] } : {}}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="absolute inset-0 bg-accent/30 rounded-full blur-2xl"
        />

        <div className="w-48 h-48 border-8 border-white/10 rounded-full relative flex items-center justify-center bg-white/5 backdrop-blur-sm shadow-2xl">
          {isWaiting && (
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Wheat size={72} className="text-white drop-shadow-lg" />
            </motion.div>
          )}
          {phase === 'success' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Check size={88} strokeWidth={3} className="text-white" />
            </motion.div>
          )}
          {(phase === 'malfunction' || phase === 'error') && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <AlertTriangle size={80} className="text-accent" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Status text */}
      {isWaiting && (
        <>
          <h2 className="text-4xl font-black mb-3 tracking-tight drop-shadow-md">DISPENSING...</h2>
          <p className="text-white/70 text-lg font-medium text-center max-w-sm mb-10">
            {phase === 'sending' ? 'Sending order to machine…' : 'Waiting for machine confirmation…'}
          </p>
          {/* Indeterminate pulse bar */}
          <div className="w-72 h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full w-1/3 bg-gradient-to-r from-accent to-white rounded-full"
              animate={{ x: ['-100%', '300%'] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            />
          </div>
        </>
      )}

      {phase === 'success' && (
        <>
          <h2 className="text-4xl font-black mb-3 tracking-tight drop-shadow-md">COMPLETED!</h2>
          <p className="text-white/70 text-lg font-medium text-center max-w-sm">
            Your order has been dispensed. Please collect your grains.
          </p>
        </>
      )}

      {phase === 'malfunction' && (
        <>
          <h2 className="text-3xl font-black mb-3 tracking-tight drop-shadow-md text-accent">
            PARTIAL DISPENSE
          </h2>
          <p className="text-white/70 text-base font-medium text-center max-w-xs mb-4">
            Some slots may not have dispensed correctly. Please check your order.
          </p>
          {failedSlots.length > 0 && (
            <div className="mb-6 bg-white/10 rounded-xl px-5 py-3 text-sm space-y-1 max-w-xs w-full">
              {failedSlots.map(([key, r]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize font-semibold">{key}</span>
                  <span className="text-accent">
                    {r.ordered === 0 ? 'Unexpected dispense' : 'Failed to dispense'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={onComplete}
            className="mt-2 px-8 py-3 bg-white text-primary font-black rounded-full text-lg tracking-wide shadow-lg active:scale-95 transition-transform"
          >
            ACKNOWLEDGE &amp; CONTINUE
          </button>
        </>
      )}

      {phase === 'error' && (
        <>
          <h2 className="text-3xl font-black mb-3 tracking-tight drop-shadow-md text-accent">
            MACHINE ISSUE
          </h2>
          <p className="text-white/60 text-sm text-center max-w-xs mb-6 leading-relaxed">
            {errorMsg}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { hasSent.current = false; sendOrder(); }}
              className="flex items-center gap-2 px-6 py-3 bg-white/20 border border-white/30 text-white font-bold rounded-full text-base active:scale-95 transition-transform"
            >
              <RefreshCw size={16} /> Retry
            </button>
            <button
              onClick={onComplete}
              className="px-6 py-3 bg-white text-primary font-black rounded-full text-base shadow-lg active:scale-95 transition-transform"
            >
              Continue Anyway
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
