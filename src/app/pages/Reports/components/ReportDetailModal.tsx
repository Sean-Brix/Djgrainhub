import React from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Wrench, 
  CreditCard, 
  MonitorX, 
  Package, 
  HelpCircle, 
  User, 
  Phone, 
  ListTodo,
  Plus,
  X
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useData } from '../../../lib/DataContext';
import { type Report } from '../../../lib/dataHelpers';

export const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string; dot: string }> = {
  open: {
    label: 'Open',
    icon: <AlertCircle size={13} />,
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  resolved: {
    label: 'Resolved',
    icon: <CheckCircle2 size={13} />,
    bg: 'bg-green-50',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
};

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Machine Jam': <Wrench size={15} />,
  'Payment Issue': <CreditCard size={15} />,
  'Product Quality': <Package size={15} />,
  'Display Problem': <MonitorX size={15} />,
  'Other': <HelpCircle size={15} />,
};

export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Machine Jam': { bg: 'bg-orange-50', text: 'text-orange-600' },
  'Payment Issue': { bg: 'bg-blue-50', text: 'text-blue-600' },
  'Product Quality': { bg: 'bg-purple-50', text: 'text-purple-600' },
  'Display Problem': { bg: 'bg-rose-50', text: 'text-rose-600' },
  'Other': { bg: 'bg-gray-50', text: 'text-gray-600' },
};

interface ReportDetailModalProps {
  report: Report;
  onClose: () => void;
  onStatusChange: (id: string, status: Report['status']) => void;
  onAddTodo: (report: Report) => void;
  hasTodo: boolean;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  onClose,
  onStatusChange,
  onAddTodo,
  hasTodo,
}) => {
  const data = useData();
  const statusConfig = STATUS_CONFIG[report.status];
  const catColor = CATEGORY_COLORS[report.category] || CATEGORY_COLORS['Other'];
  const catIcon = CATEGORY_ICONS[report.category] || CATEGORY_ICONS['Other'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="text-lg font-bold">Report Details</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5 pb-24">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </span>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${catColor.bg} ${catColor.text}`}>
              {catIcon}
              {report.category}
            </span>
            {hasTodo && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                <ListTodo size={13} />
                Has To-Do
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={14} />
            <span>{data.getMachineName(report.machineId)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={14} />
            <span>
              {new Date(report.timestamp).toLocaleString('en-US', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </span>
          </div>

          {(report.name || report.mobileNumber) && (
            <div className="bg-primary/5 rounded-lg p-3 space-y-2 border border-primary/10">
              <label className="text-[10px] text-primary/60 font-black uppercase tracking-widest block">Contact Information</label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {report.name && (
                  <div className="flex items-center gap-2 text-sm font-bold text-primary">
                    <User size={14} />
                    <span>{report.name}</span>
                  </div>
                )}
                {report.mobileNumber && (
                  <div className="flex items-center gap-2 text-sm font-bold text-primary">
                    <Phone size={14} />
                    <span>{report.mobileNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2 block">Description</label>
            <div className="bg-muted/30 border border-border rounded-lg p-4 text-sm leading-relaxed">
              {report.message}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">Actions</label>
            <div className="flex gap-2 flex-wrap">
              {!hasTodo && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-[120px] border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  onClick={() => { onAddTodo(report); onClose(); }}
                >
                  <Plus size={14} className="mr-1.5" /> Add To-Do
                </Button>
              )}
              {report.status !== 'resolved' && (
                <Button
                  size="sm"
                  className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => onStatusChange(report.id, 'resolved')}
                >
                  <CheckCircle2 size={14} className="mr-1.5" /> Resolve
                </Button>
              )}
              {report.status === 'resolved' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-[120px] border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => onStatusChange(report.id, 'open')}
                >
                  <AlertCircle size={14} className="mr-1.5" /> Reopen
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
