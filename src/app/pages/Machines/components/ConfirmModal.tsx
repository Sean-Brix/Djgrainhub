import React from 'react';
import { Button } from '../../../components/ui/button';
import { X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  confirmVariant?: 'default' | 'destructive';
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  icon,
  iconBg,
  title,
  message,
  confirmLabel,
  confirmVariant = 'default',
  onConfirm,
  onClose,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background w-[90%] max-w-sm rounded-xl shadow-2xl border border-border p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center mx-auto mb-3`}>
          {icon}
        </div>
        <h3 className="text-lg font-bold mb-1">{title}</h3>
        <div className="text-sm text-muted-foreground mb-5">{message}</div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant={confirmVariant} className="flex-1" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
};
