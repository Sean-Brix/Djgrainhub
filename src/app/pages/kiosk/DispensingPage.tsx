import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Check, Wheat } from 'lucide-react';

interface DispensingPageProps {
  onComplete: () => void;
}

export function DispensingPage({ onComplete }: DispensingPageProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 5000; // 5 seconds
    const interval = 50;
    const steps = duration / interval;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setProgress(Math.min(100, (step / steps) * 100));
      
      if (step >= steps) {
        clearInterval(timer);
        setTimeout(onComplete, 1000); // Wait 1s before switching
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div 
      className="fixed inset-0 flex flex-col items-center justify-center bg-[#2D6A4F] text-white z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Dynamic Background */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
        className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/5 rounded-full blur-[120px]"
      />
      <motion.div 
        animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-[#C9A441]/10 rounded-full blur-[120px]"
      />

      <div className="relative mb-12">
        {/* Animated Rings */}
        <motion.div 
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="absolute inset-0 bg-[#C9A441]/30 rounded-full blur-2xl"
        />
        
        <div className="w-56 h-56 border-8 border-white/10 rounded-full relative overflow-hidden bg-white/5 backdrop-blur-sm shadow-2xl">
          <motion.div 
            initial={{ height: "0%" }}
            animate={{ height: `${progress}%` }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#C9A441] to-[#D9B451] transition-all duration-100 ease-linear"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            {progress < 100 ? (
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Wheat size={80} className="text-white drop-shadow-lg" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1.2 }}
                className="text-white"
              >
                <Check size={100} strokeWidth={3} />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-4xl font-black mb-4 tracking-tight drop-shadow-md">
        {progress < 100 ? "DISPENSING..." : "COMPLETED!"}
      </h2>
      
      <p className="text-white/70 text-xl font-medium tracking-wide mb-12 text-center max-w-md">
        {progress < 100 ? "Please wait while we prepare your fresh grains" : "Your order is ready for collection"}
      </p>

      <div className="w-80 h-3 bg-white/10 rounded-full overflow-hidden shadow-inner p-[2px]">
        <motion.div 
          className="h-full bg-gradient-to-r from-[#C9A441] to-white rounded-full shadow-[0_0_15px_rgba(201,164,65,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear" }}
        />
      </div>

      {/* Floating progress percentage */}
      <motion.div 
        className="mt-6 text-2xl font-black text-[#C9A441] tabular-nums"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1 }}
      >
        {Math.round(progress)}%
      </motion.div>
    </motion.div>
  );
}
