import React from 'react';
import { MapPin, Box, Activity } from 'lucide-react';
import { Progress } from '../../../components/ui/progress';
import { type Machine, getMachineStockLevel, getMachineTotalStockKg, getMachineHealthScore } from '../../../lib/dataHelpers';
import { STATUS_MAP } from './MachineFormModal';

interface MachineCardProps {
  machine: Machine;
  onClick: (machine: Machine) => void;
}

export const MachineCard: React.FC<MachineCardProps> = ({ machine, onClick }) => {
  const stockLevel = getMachineStockLevel(machine);
  const totalKg = getMachineTotalStockKg(machine);
  const healthScore = getMachineHealthScore(machine, machine.alerts || 0);
  const status = STATUS_MAP[machine.status] || STATUS_MAP.offline;

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <div
      onClick={() => onClick(machine)}
      className="group bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold truncate group-hover:text-primary transition-colors">{machine.name}</h3>
            <div className={`flex items-center gap-0.5 text-[10px] font-bold ${getHealthColor(healthScore)}`}>
              <Activity size={10} className="shrink-0" />
              <span>{healthScore}%</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{machine.location}</span>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${status.bg} ${status.text}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Inventory Level</span>
            <span className={`text-[10px] font-bold ${stockLevel < 20 ? 'text-destructive' : stockLevel < 50 ? 'text-amber-600' : 'text-green-600'}`}>{stockLevel}%</span>
          </div>
          <Progress value={stockLevel} className="h-1.5" />
        </div>

        <div className="flex items-center justify-between pt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Box size={12} />
            <span>{totalKg} kg Stock</span>
          </div>
          <span>ID: {machine.id}</span>
        </div>
      </div>
    </div>
  );
};
