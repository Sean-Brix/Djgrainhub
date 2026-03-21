import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, QrCode, Smartphone, Loader2, AlertCircle, RefreshCw, FlaskConical } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { api } from '../../lib/api';
import { PAYMENT_TEST_MODE_KEY } from '../Settings/PaymentGatewaySettings';

interface CartItem {
  product: { id: string; slotNumber: number; name: string; price: number };
  quantity: number;
}

interface PaymentPageProps {
  totalAmount: number;
  machineId: string;
  cart: CartItem[];
  onBack: () => void;
  onSuccess: (saleId: string) => void;
}

type Phase = 'generating' | 'ready' | 'error';

export function PaymentPage({ totalAmount, machineId, cart, onBack, onSuccess }: PaymentPageProps) {
  const isTestMode = localStorage.getItem(PAYMENT_TEST_MODE_KEY) === 'true';

  const [phase, setPhase] = useState<Phase>('generating');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [testCountdown, setTestCountdown] = useState(5);
  const intentIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  };

  const generateQR = useCallback(async () => {
    setPhase('generating');
    setQrUrl(null);
    setErrorMsg('');
    setElapsed(0);
    setTestCountdown(5);
    stopPolling();

    // ── TEST MODE: skip PayMongo, auto-succeed after 5 s ──────────────────
    if (isTestMode) {
      try {
        setPhase('ready');

        let remaining = 5;
        setTestCountdown(remaining);
        tickRef.current = setInterval(() => {
          remaining -= 1;
          setTestCountdown(remaining);
          if (remaining <= 0) {
            stopPolling();
            (async () => {
              try {
                const saleData = await api.post<any>('/sales', {
                  machineId,
                  paymentMethod: 'QR PH (Test)',
                  status: 'completed',
                  paymentIntentId: null,
                  items: cart.map(item => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                    unitPrice: item.product.price,
                  })),
                });
                onSuccess(saleData?.id ?? '');
              } catch (err: any) {
                setErrorMsg(err?.message || 'Failed to save completed test transaction');
                setPhase('error');
              }
            })();
          }
        }, 1000);
      } catch (e: any) {
        setErrorMsg(e.message || 'Failed to initialize test payment');
        setPhase('error');
      }
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    try {
      // 1. Create payment intent (qrph only)
      const intentData = await api.post<any>('/payment/intent', {
        amount: totalAmount,
        description: 'DJ Grain Hub Kiosk Payment',
        payment_method_types: ['qrph'],
      });
      const id        = intentData?.data?.id;
      const clientKey = intentData?.data?.attributes?.client_key;
      intentIdRef.current = id;

      // 2. Create qrph payment method
      const methodData = await api.post<any>('/payment/method', { type: 'qrph' });
      const methodId   = methodData?.data?.id;

      // 3. Attach → get QR image
      const attachData = await api.post<any>(`/payment/intent/${id}/attach`, {
        payment_method_id: methodId,
        client_key: clientKey,
      });
      const imageUrl = attachData?.data?.attributes?.next_action?.code?.image_url ?? null;
      if (!imageUrl) throw new Error('QR image not returned by PayMongo');

      setQrUrl(imageUrl);
      setPhase('ready');

      // 4. Poll PayMongo every 3s for payment confirmation
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.get<any>(`/payment/intent/${id}`);
          const s = status?.data?.attributes?.status;
          if (s === 'succeeded') {
            stopPolling();
            try {
              const saleData = await api.post<any>('/sales', {
                machineId,
                paymentMethod: 'QR PH',
                status: 'completed',
                paymentIntentId: id,
                items: cart.map(item => ({
                  productId: item.product.id,
                  quantity: item.quantity,
                  unitPrice: item.product.price,
                })),
              });
              onSuccess(saleData?.id ?? '');
            } catch (err: any) {
              setErrorMsg(err?.message || 'Payment succeeded but saving transaction failed');
              setPhase('error');
            }
          } else if (s === 'failed') {
            stopPolling();
            setErrorMsg('Payment failed. Please try again.');
            setPhase('error');
          }
        } catch { /* silently ignore poll errors */ }
      }, 3000);

      // Elapsed timer for UX
      tickRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to generate QR code');
      setPhase('error');
    }
  }, [totalAmount, machineId, cart, onSuccess]);

  useEffect(() => {
    generateQR();
    return stopPolling;
  }, [generateQR]);

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full bg-background text-primary"
    >
      <header className="bg-primary text-white p-4 flex items-center shadow-md z-10">
        <Button variant="ghost" onClick={onBack} className="text-white hover:bg-white/10 mr-4">
          <ChevronLeft className="mr-2" /> Back
        </Button>
        <h1 className="font-bold text-xl">Payment</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Card className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border-2 border-primary/10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">
              {isTestMode ? 'Test Payment' : 'Scan to Pay'}
            </h2>
            <p className="text-primary/60 text-sm">
              {isTestMode
                ? 'Testing mode is active — payment will be simulated'
                : 'Use GCash, Maya, or any QR Ph\u2011enabled app'}
            </p>
          </div>

          {/* QR area */}
          <div className="bg-primary/5 p-6 rounded-2xl mb-6 flex items-center justify-center relative min-h-[220px]">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl -mt-1 -ml-1" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl -mt-1 -mr-1" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl -mb-1 -ml-1" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl -mb-1 -mr-1" />

            {phase === 'generating' && (
              <div className="flex flex-col items-center gap-3 text-primary/60">
                <Loader2 size={40} className="animate-spin" />
                <p className="text-sm font-medium">
                  {isTestMode ? 'Setting up test payment\u2026' : 'Generating QR code\u2026'}
                </p>
              </div>
            )}

            {/* Test-mode countdown display */}
            {isTestMode && phase === 'ready' && (
              <div className="flex flex-col items-center gap-4 text-primary">
                <div className="relative flex items-center justify-center w-28 h-28">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="#1F4D3A" strokeOpacity="0.1" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="44" fill="none"
                      stroke="#F59E0B" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 44}`}
                      strokeDashoffset={`${2 * Math.PI * 44 * (testCountdown / 5)}`}
                      style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                    />
                  </svg>
                  <span className="text-4xl font-black text-amber-500">{testCountdown}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                  <FlaskConical size={13} />
                  <span>Simulating payment\u2026</span>
                </div>
              </div>
            )}

            {/* Real QR code */}
            {!isTestMode && phase === 'ready' && qrUrl && (
              <img
                src={qrUrl}
                alt="QR Ph payment code"
                className="w-52 h-52 object-contain"
              />
            )}

            {phase === 'error' && (
              <div className="flex flex-col items-center gap-3 text-rose-500">
                <AlertCircle size={40} />
                <p className="text-sm font-medium">{errorMsg}</p>
                <Button size="sm" variant="outline" onClick={generateQR} className="mt-1 border-rose-200 text-rose-600 hover:bg-rose-50">
                  <RefreshCw size={13} className="mr-1.5" />Try Again
                </Button>
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between bg-background p-4 rounded-xl mb-5">
            <span className="font-medium text-primary/70">Total Amount</span>
            <span className="text-3xl font-black text-primary">₱{totalAmount.toLocaleString()}</span>
          </div>

          {/* Status */}
          {isTestMode && phase === 'ready' && (
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-amber-500">
              <FlaskConical size={15} className="animate-pulse" />
              <span>Auto-approving in {testCountdown}s\u2026</span>
            </div>
          )}
          {!isTestMode && phase === 'ready' && (
            <div className="flex items-center justify-center gap-2 text-sm text-primary/50">
              <Smartphone size={15} className="animate-pulse" />
              <span>Waiting for payment\u2026 <span className="font-mono">{minutes}:{seconds}</span></span>
            </div>
          )}
          {phase === 'generating' && (
            <div className="flex items-center justify-center gap-2 text-sm text-primary/40">
              <QrCode size={15} />
              <span>{isTestMode ? 'Preparing test mode\u2026' : 'Connecting to PayMongo\u2026'}</span>
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}
