import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, QrCode, Smartphone, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { api } from '../../lib/api';

interface PaymentPageProps {
  totalAmount: number;
  onBack: () => void;
  onSuccess: () => void;
}

type Phase = 'generating' | 'ready' | 'error';

export function PaymentPage({ totalAmount, onBack, onSuccess }: PaymentPageProps) {
  const [phase, setPhase] = useState<Phase>('generating');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);
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
    stopPolling();
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

      // 4. Poll for payment confirmation every 3s
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.get<any>(`/payment/intent/${id}`);
          const s = status?.data?.attributes?.status;
          if (s === 'succeeded') {
            stopPolling();
            onSuccess();
          } else if (s === 'failed') {
            stopPolling();
            setErrorMsg('Payment failed. Please try again.');
            setPhase('error');
          }
        } catch { /* silently ignore poll errors */ }
      }, 3000);

      // TODO: remove — simulates a successful webhook after 7s for demo
      setTimeout(() => {
        stopPolling();
        onSuccess();
      }, 7000);

      // Elapsed timer for UX
      tickRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to generate QR code');
      setPhase('error');
    }
  }, [totalAmount, onSuccess]);

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
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Scan to Pay</h2>
            <p className="text-[#1F4D3A]/60 text-sm">Use GCash, Maya, or any QR Ph‑enabled app</p>
          </div>

          {/* QR area */}
          <div className="bg-[#1F4D3A]/5 p-6 rounded-2xl mb-6 flex items-center justify-center relative min-h-[220px]">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#1F4D3A] rounded-tl-xl -mt-1 -ml-1" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#1F4D3A] rounded-tr-xl -mt-1 -mr-1" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#1F4D3A] rounded-bl-xl -mb-1 -ml-1" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#1F4D3A] rounded-br-xl -mb-1 -mr-1" />

            {phase === 'generating' && (
              <div className="flex flex-col items-center gap-3 text-[#1F4D3A]/60">
                <Loader2 size={40} className="animate-spin" />
                <p className="text-sm font-medium">Generating QR code…</p>
              </div>
            )}

            {phase === 'ready' && qrUrl && (
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
          <div className="flex items-center justify-between bg-[#F5F5F0] p-4 rounded-xl mb-5">
            <span className="font-medium text-[#1F4D3A]/70">Total Amount</span>
            <span className="text-3xl font-black text-[#1F4D3A]">₱{totalAmount.toLocaleString()}</span>
          </div>

          {/* Status */}
          {phase === 'ready' && (
            <div className="flex items-center justify-center gap-2 text-sm text-[#1F4D3A]/50">
              <Smartphone size={15} className="animate-pulse" />
              <span>Waiting for payment… <span className="font-mono">{minutes}:{seconds}</span></span>
            </div>
          )}
          {phase === 'generating' && (
            <div className="flex items-center justify-center gap-2 text-sm text-[#1F4D3A]/40">
              <QrCode size={15} />
              <span>Connecting to PayMongo…</span>
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}
