import React from 'react';

interface ProcessingPageProps {
  paymentMethod: string;
  onComplete: () => void;
}

export function ProcessingPage({ paymentMethod, onComplete }: ProcessingPageProps) {
  React.useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#1F4D3A] text-white p-8">
      <div className="w-24 h-24 border-8 border-[#C9A441] border-t-transparent rounded-full animate-spin mb-8" />
      <h2 className="text-3xl font-bold mb-4">Processing {paymentMethod.toUpperCase()}...</h2>
      <p className="opacity-70">Verifying your transaction with the network</p>
    </div>
  );
}
