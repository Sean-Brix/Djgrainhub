import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDownCircle, CheckCircle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ThankYouPageProps {
  onRestart: () => void;
}

export function ThankYouPage({ onRestart }: ThankYouPageProps) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Trigger confetti
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      onRestart();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, onRestart]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#F5F5F0] flex flex-col items-center justify-center p-8 select-none"
    >
      <motion.div 
        animate={{ y: [0, -20, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="w-32 h-32 md:w-40 md:h-40 bg-[#1F4D3A] rounded-full flex items-center justify-center mb-8 md:mb-12 shadow-2xl relative z-10"
      >
        <CheckCircle size={64} className="text-[#C9A441]" />
      </motion.div>

      <h1 className="text-4xl md:text-7xl font-black text-[#1F4D3A] mb-4 md:mb-8 tracking-tighter text-center uppercase">
        Order Complete
      </h1>
      
      <p className="text-lg md:text-2xl text-[#1F4D3A]/60 font-light mb-8 md:mb-16 max-w-2xl text-center px-4">
        Thank you for your purchase! Please collect your items from the dispenser below.
      </p>

      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        className="flex flex-col items-center gap-4 text-[#C9A441] mb-12"
      >
        <ArrowDownCircle size={56} md:size={64} strokeWidth={1.5} />
        <span className="text-xs md:text-sm font-bold tracking-widest uppercase">Collect Here</span>
      </motion.div>

      <div className="flex flex-col items-center gap-6 mt-auto mb-8 w-full max-w-xs">
        <div className="text-[#1F4D3A]/40 text-sm font-medium">
          Closing in <span className="text-[#1F4D3A] font-bold">{countdown}</span> seconds
        </div>
        
        <button
          onClick={onRestart}
          className="w-full bg-[#1F4D3A] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
        >
          Proceed Now
          <ArrowRight size={20} />
        </button>
      </div>
    </motion.div>
  );
}
