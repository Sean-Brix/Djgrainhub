import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Trash2,
  List,
  Map,
} from 'lucide-react';
import { useAuth } from '@/app/lib/AuthContext';
import { useData } from '@/app/lib/DataContext';
import {
  type Machine,
} from '@/app/lib/dataHelpers';
import { MachineMap } from '@/app/components/MachineMap';
import { MachineDetail } from './components/MachineDetail';
import { MachineCard } from './components/MachineCard';
import { MachineFormModal, type MachineFormData } from './components/MachineFormModal';
import { ConfirmModal } from './components/ConfirmModal';

export function Machines() {
  const { user } = useAuth();
  const data = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Machine | null>(null);

  if (!user) return null;

  const machines = data.getMachinesForUser(user);
  const filteredMachines = machines.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveMachine = (formData: MachineFormData) => {
    if (editMachine) {
      data.updateMachine(editMachine.id, formData);
      toast.success(`${formData.name} updated`);
    } else {
      const newMachine: Machine = {
        ...formData,
        ownerId: user.id,
      };
      data.addMachine(newMachine);
      toast.success(`${formData.name} registered successfully`);
    }
    setShowMachineForm(false);
    setEditMachine(null);
  };

  const handleDeleteMachine = () => {
    if (!deleteTarget) return;
    data.deleteMachine(deleteTarget.id);
    toast.success(`${deleteTarget.name} removed`);
    setDeleteTarget(null);
    setSelectedMachine(null);
  };

  const openEditMachine = (m: Machine) => {
    setEditMachine(m);
    setShowMachineForm(true);
  };

  const openCreateMachine = () => {
    setEditMachine(null);
    setShowMachineForm(true);
  };

  const handleSelectMachine = (machine: Machine) => {
    setSelectedMachine(machine);
    window.scrollTo(0, 0);
  };

  if (selectedMachine) {
    return (
      <MachineDetail
        machine={selectedMachine}
        onBack={() => setSelectedMachine(null)}
        onEditMachine={openEditMachine}
        onDeleteMachine={setDeleteTarget}
      />
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Machines</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage and monitor your vending units</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-md transition-all ${viewMode === 'map' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Map size={18} />
            </button>
          </div>
          <Button onClick={openCreateMachine}>
            <Plus size={18} className="mr-1.5" /> Register Unit
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, ID or location..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9 h-11 border-slate-200 focus-visible:ring-primary/20"
        />
      </div>

      {viewMode === 'map' ? (
        <div className="relative z-0 isolate bg-card border border-border rounded-xl overflow-hidden shadow-sm h-[calc(100vh-280px)] min-h-[400px]">
          <MachineMap machines={filteredMachines} onSelectMachine={handleSelectMachine} />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMachines.map(machine => (
            <MachineCard key={machine.id} machine={machine} onClick={handleSelectMachine} />
          ))}
          {filteredMachines.length === 0 && (
            <div className="col-span-full py-20 text-center bg-muted/20 rounded-xl border border-dashed border-border">
              <Search size={40} className="mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">No machines found matching your search</p>
            </div>
          )}
        </div>
      )}

      <MachineFormModal
        open={showMachineForm}
        machine={editMachine}
        existingIds={machines.map(m => m.id)}
        onSave={handleSaveMachine}
        onClose={() => {
          setShowMachineForm(false);
          setEditMachine(null);
        }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        icon={<Trash2 className="text-red-600" size={24} />}
        iconBg="bg-red-100"
        title="Delete Machine"
        message={<>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone and will remove all associated products.</>}
        confirmLabel="Delete Machine"
        confirmVariant="destructive"
        onConfirm={handleDeleteMachine}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
