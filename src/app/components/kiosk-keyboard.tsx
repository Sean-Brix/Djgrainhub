import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Delete, ChevronDown, ArrowUp, CornerDownLeft } from 'lucide-react';

interface KioskKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  type?: 'text' | 'password' | 'number';
}

export const KioskKeyboard: React.FC<KioskKeyboardProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  onEnter,
  type = 'text'
}) => {
  const [isShift, setIsShift] = useState(false);
  const [layout, setLayout] = useState<'default' | 'numbers'>('default');

  const rows = {
    default: [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
      ['123', 'space', 'enter']
    ],
    numbers: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
      ['abc', '.', ',', '?', '!', "'", 'backspace'],
      ['123', 'space', 'enter']
    ]
  };

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
    } else if (key === 'shift') {
      setIsShift(!isShift);
    } else if (key === 'enter') {
      if (onEnter) onEnter();
      else onClose();
    } else if (key === 'space') {
      onChange(value + ' ');
    } else if (key === '123') {
      setLayout('numbers');
    } else if (key === 'abc') {
      setLayout('default');
    } else {
      let char = key;
      if (isShift && layout === 'default') {
        char = key.toUpperCase();
      }
      onChange(value + char);
      if (isShift) setIsShift(false);
    }
  };

  const currentRows = layout === 'default' ? rows.default : rows.numbers;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[2000] bg-[#1F4D3A] p-4 pb-8 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.3)] border-t border-white/10 lg:hidden"
        >
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="flex justify-center mb-4">
              <button 
                onClick={onClose}
                className="w-12 h-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors"
              />
            </div>

            {currentRows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-1.5">
                {row.map((key) => {
                  const isSpecial = ['shift', 'backspace', 'enter', 'space', '123', 'abc'].includes(key);
                  const isWide = ['space', 'enter'].includes(key);
                  
                  return (
                    <button
                      key={key}
                      onClick={() => handleKeyPress(key)}
                      className={`
                        h-14 sm:h-16 flex items-center justify-center rounded-xl font-black text-sm uppercase transition-all active:scale-95 active:bg-[#C9A441] active:text-white
                        ${isWide ? 'flex-[2]' : 'flex-1'}
                        ${key === 'space' ? 'flex-[4]' : ''}
                        ${isSpecial 
                          ? 'bg-white/10 text-white/80' 
                          : 'bg-white text-[#1F4D3A] shadow-sm'
                        }
                        ${key === 'enter' ? 'bg-[#C9A441] text-white' : ''}
                        ${key === 'shift' && isShift ? 'bg-[#C9A441] text-white' : ''}
                      `}
                    >
                      {key === 'shift' && <ArrowUp className="w-5 h-5" />}
                      {key === 'backspace' && <Delete className="w-5 h-5" />}
                      {key === 'enter' && <CornerDownLeft className="w-5 h-5" />}
                      {key === 'space' && <div className="w-12 h-1 bg-current opacity-20 rounded-full" />}
                      {key === '123' && '123'}
                      {key === 'abc' && 'ABC'}
                      {!isSpecial && (isShift && layout === 'default' ? key.toUpperCase() : key)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
