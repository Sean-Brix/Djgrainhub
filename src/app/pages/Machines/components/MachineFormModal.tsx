import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { X, Hash, Wifi, AlertTriangle, WifiOff } from 'lucide-react';
import { LocationPicker } from '../../../components/LocationPicker';
import { type Machine } from '../../../lib/dataHelpers';

export const STATUS_MAP: Record<string, { icon: React.ReactNode; label: string; dot: string; bg: string; text: string }> = {
  online: {
    icon: <Wifi className="h-3.5 w-3.5" />,
    label: 'Online',
    dot: 'bg-green-500',
    bg: 'bg-green-50',
    text: 'text-green-700',
  },
  warning: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    label: 'Warning',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
  offline: {
    icon: <WifiOff className="h-3.5 w-3.5" />,
    label: 'Offline',
    dot: 'bg-gray-400',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
  },
};

export interface MachineFormData {
  id: string;
  name: string;
  location: string;
  lat: number | null;
  lng: number | null;
  status: 'online' | 'warning' | 'offline';
  capacity: number;
}

interface MachineFormModalProps {
  open: boolean;
  machine: Machine | null;
  existingIds: string[];
  onSave: (data: MachineFormData) => void;
  onClose: () => void;
}

export const MachineFormModal: React.FC<MachineFormModalProps> = ({
  open,
  machine,
  existingIds,
  onSave,
  onClose,
}) => {
  const isEdit = !!machine;

  const [form, setForm] = useState<MachineFormData>(
    machine
      ? { id: machine.id, name: machine.name, location: machine.location, lat: machine.lat ?? null, lng: machine.lng ?? null, status: machine.status, capacity: machine.capacity }
      : { id: '', name: '', location: '', lat: null, lng: null, status: 'online', capacity: 100 }
  );
  const [idError, setIdError] = useState('');

  React.useEffect(() => {
    if (machine) {
      setForm({ id: machine.id, name: machine.name, location: machine.location, lat: machine.lat ?? null, lng: machine.lng ?? null, status: machine.status, capacity: machine.capacity });
    } else {
      setForm({ id: '', name: '', location: '', lat: null, lng: null, status: 'online', capacity: 100 });
    }
    setIdError('');
  }, [machine, open]);

  if (!open) return null;

  const handleIdChange = (value: string) => {
    const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, '');
    setForm(f => ({ ...f, id: sanitized }));
    if (!isEdit && existingIds.includes(sanitized)) {
      setIdError('This Machine ID already exists');
    } else {
      setIdError('');
    }
  };

  const canSave = form.id.trim() && form.name.trim() && form.location.trim() && form.capacity > 0 && !idError;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background w-full sm:max-w-md sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="text-lg font-bold">{isEdit ? 'Edit Machine' : 'Register New Machine'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="text-sm text-muted-foreground font-medium mb-1.5 block">
              Machine ID <span className="text-destructive">*</span>
            </label>
            {isEdit ? (
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted/30 text-sm text-muted-foreground">
                <Hash size={14} />
                <span className="font-mono">{form.id}</span>
                <span className="text-[10px] ml-auto">(fixed)</span>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={form.id}
                    onChange={e => handleIdChange(e.target.value)}
                    placeholder="e.g. m7 or machine-downtown"
                    className={`pl-9 font-mono h-10 ${idError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                </div>
                {idError && <p className="text-xs text-destructive mt-1">{idError}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">Unique ID. Use letters, numbers, dashes, and underscores.</p>
              </>
            )}
          </div>

          <div>
            <label className="text-sm text-muted-foreground font-medium mb-1.5 block">
              Machine Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Machine 07 - Downtown"
              className="h-10"
            />
          </div>

          <LocationPicker
            location={form.location}
            lat={form.lat}
            lng={form.lng}
            onLocationChange={(loc, lat, lng) => setForm(f => ({ ...f, location: loc, lat, lng }))}
          />

          <div>
            <label className="text-sm text-muted-foreground font-medium mb-1.5 block">Machine Status</label>
            <div className="flex gap-2">
              {(['online', 'warning', 'offline'] as const).map(s => {
                const cfg = STATUS_MAP[s];
                const isSelected = form.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setForm(f => ({ ...f, status: s }))}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? `${cfg.bg} ${cfg.text} border-current/30 shadow-sm ring-1 ring-current/10`
                        : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? cfg.dot : 'bg-muted-foreground/30'}`} />
                    {cfg.label.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground font-medium mb-1.5 block">
              Capacity (units) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              min={1}
              value={form.capacity || ''}
              onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
              placeholder="100"
              className="h-10"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Maximum stock pieces for percentage calculations.</p>
          </div>
        </div>

        <div className="px-5 py-4 md:pb-4 pb-24 border-t border-border flex gap-3 sticky bottom-0 bg-background z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!canSave} onClick={() => onSave(form)}>
            {isEdit ? 'Save Changes' : 'Register Machine'}
          </Button>
        </div>
      </div>
    </div>
  );
};
