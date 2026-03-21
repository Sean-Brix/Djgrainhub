import React from 'react';
import { motion } from 'motion/react';
import { MonitorSmartphone, MapPin, Wifi, WifiOff, AlertTriangle, ChevronRight, ArrowLeft } from 'lucide-react';
import type { Machine } from '@/app/lib/dataHelpers';

interface MachineSelectPageProps {
  machines: Machine[];
  onSelect: (machineId: string) => void;
  onBack: () => void;
}

const STATUS_CONFIG = {
  online: {
    color: 'bg-green-500',
    ringColor: 'ring-green-200',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Online',
    Icon: Wifi,
  },
  warning: {
    color: 'bg-amber-500',
    ringColor: 'ring-amber-200',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    label: 'Warning',
    Icon: AlertTriangle,
  },
  offline: {
    color: 'bg-gray-400',
    ringColor: 'ring-gray-200',
    textColor: 'text-gray-500',
    bgColor: 'bg-gray-100',
    label: 'Offline',
    Icon: WifiOff,
  },
};

export function MachineSelectPage({ machines, onSelect, onBack }: MachineSelectPageProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-background to-muted flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl text-gray-900 font-bold">Select Machine</h1>
            <p className="text-gray-500 text-sm mt-0.5">Choose which machine this kiosk will operate as</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2">
          <MonitorSmartphone size={16} className="text-primary" />
          <p className="text-primary text-xs">
            {machines.length} machine{machines.length !== 1 ? 's' : ''} available for your account
          </p>
        </div>
      </div>

      {/* Machine List */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-3">
          {machines.map((machine, index) => {
            const status = STATUS_CONFIG[machine.status];
            const StatusIcon = status.Icon;
            const isDisabled = machine.status === 'offline';

            return (
              <motion.button
                key={machine.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.3 }}
                onClick={() => !isDisabled && onSelect(machine.id)}
                disabled={isDisabled}
                className={`w-full text-left bg-white rounded-xl border transition-all cursor-pointer ${
                  isDisabled
                    ? 'border-gray-200 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-primary hover:shadow-md active:scale-[0.98]'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Machine Icon */}
                    <div className={`w-11 h-11 rounded-lg ${isDisabled ? 'bg-gray-100' : 'bg-primary/10'} flex items-center justify-center shrink-0`}>
                      <MonitorSmartphone size={22} className={isDisabled ? 'text-gray-400' : 'text-primary'} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-gray-900 font-semibold text-sm truncate">{machine.name}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{machine.location}</span>
                      </div>
                    </div>

                    {/* Status + Arrow */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${status.bgColor}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                        <span className={`text-xs font-medium ${status.textColor}`}>{status.label}</span>
                      </div>
                      {!isDisabled && (
                        <ChevronRight size={16} className="text-gray-300" />
                      )}
                    </div>
                  </div>

                  {/* Bottom meta row */}
                  {isDisabled && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5">
                      <WifiOff size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-400">Machine is offline and cannot be selected</span>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {machines.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <MonitorSmartphone size={28} className="text-gray-400" />
            </div>
            <h3 className="text-gray-700 font-semibold mb-1">No Machines Available</h3>
            <p className="text-gray-500 text-sm">There are no machines assigned to your account.</p>
          </div>
        )}
      </div>
    </div>
  );
}
