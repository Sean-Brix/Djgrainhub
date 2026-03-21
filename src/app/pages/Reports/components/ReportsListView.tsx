import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  MessageSquareWarning, 
  AlertCircle, 
  CheckCircle2,
  MapPin,
  Clock,
  ListTodo,
  User,
  Phone
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useAuth } from '../../../lib/AuthContext';
import { useData } from '../../../lib/DataContext';
import { type Report } from '../../../lib/dataHelpers';
import { STATUS_CONFIG, CATEGORY_ICONS, CATEGORY_COLORS, ReportDetailModal } from './ReportDetailModal';

interface ReportsListViewProps {
  onAddTodo: (report: Report) => void;
  todos: any[];
  onStatusChange: (id: string, status: Report['status']) => void;
}

function getTimeAgo(date: string | Date) {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return then.toLocaleDateString();
}

export const ReportsListView: React.FC<ReportsListViewProps> = ({
  onAddTodo,
  todos,
  onStatusChange,
}) => {
  const { user } = useAuth();
  const data = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [machineFilter, setMachineFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  if (!user) return null;

  const reports = data.getReportsForUser(user);
  const machines = data.getMachinesForUser(user);

  const totalReports = reports.length;
  const openCount = reports.filter(r => r.status === 'open').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;

  const categories = ['Machine Jam', 'Payment Issue', 'Product Quality', 'Display Problem', 'Other'];
  const categoryCounts: Record<string, number> = {};
  categories.forEach(c => {
    categoryCounts[c] = reports.filter(r => r.category === c).length;
  });

  let filtered = reports;

  if (searchTerm) {
    const s = searchTerm.toLowerCase();
    filtered = filtered.filter(r =>
      r.message.toLowerCase().includes(s) ||
      r.category.toLowerCase().includes(s) ||
      (r.name && r.name.toLowerCase().includes(s)) ||
      (r.mobileNumber && r.mobileNumber.includes(s)) ||
      data.getMachineName(r.machineId).toLowerCase().includes(s)
    );
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter(r => r.status === statusFilter);
  }

  if (categoryFilter !== 'all') {
    filtered = filtered.filter(r => r.category === categoryFilter);
  }

  if (machineFilter !== 'all') {
    filtered = filtered.filter(r => r.machineId === machineFilter);
  }

  filtered = [...filtered].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    return sortOrder === 'newest' ? tb - ta : ta - tb;
  });

  const activeFilterCount = [statusFilter, categoryFilter, machineFilter].filter(f => f !== 'all').length;

  const todoReportIds = new Set(todos.map(t => t.reportId));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <button
          className={`bg-card border rounded-xl p-3.5 text-left transition-all cursor-pointer ${
            statusFilter === 'all' ? 'border-primary shadow-sm ring-1 ring-primary/20' : 'border-border hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
          </div>
          <p className="text-xl font-bold">{totalReports}</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'open' ? 'all' : 'open')}
          className={`bg-card border rounded-xl p-3.5 text-left transition-all cursor-pointer ${
            statusFilter === 'open' ? 'border-red-400 shadow-sm ring-1 ring-red-200' : 'border-border hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <AlertCircle size={14} /><span className="text-xs">Open</span>
          </div>
          <p className="text-xl font-bold text-red-600">{openCount}</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'resolved' ? 'all' : 'resolved')}
          className={`bg-card border rounded-xl p-3.5 text-left transition-all cursor-pointer ${
            statusFilter === 'resolved' ? 'border-green-400 shadow-sm ring-1 ring-green-200' : 'border-border hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle2 size={14} /><span className="text-xs">Resolved</span>
          </div>
          <p className="text-xl font-bold text-green-600">{resolvedCount}</p>
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-bold mb-3">By Category</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => {
            const count = categoryCounts[cat];
            if (count === 0) return null;
            const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other'];
            const icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS['Other'];
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(isActive ? 'all' : cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? `${colors.bg} ${colors.text} ring-1 ring-current/20 shadow-sm`
                    : `${colors.bg} ${colors.text} hover:shadow-sm`
                }`}
              >
                {icon}
                {cat}
                <span className="ml-0.5 opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search reports..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" className="relative" onClick={() => setShowFilters(!showFilters)}>
          <Filter size={14} className="mr-1.5" /> Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')} title={sortOrder === 'newest' ? 'Showing newest first' : 'Showing oldest first'}>
          <ArrowUpDown size={14} className="mr-1.5" /> {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
        </Button>
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filter Reports</span>
            {activeFilterCount > 0 && (
              <button onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); setMachineFilter('all'); }} className="text-xs text-primary hover:underline cursor-pointer">
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm cursor-pointer">
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm cursor-pointer">
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Machine</label>
              <select value={machineFilter} onChange={e => setMachineFilter(e.target.value)} className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm cursor-pointer">
                <option value="all">All Machines</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Showing {filtered.length} of {totalReports} report{totalReports !== 1 ? 's' : ''}
      </div>

      <div className="space-y-2.5">
        {filtered.map(report => {
          const statusCfg = STATUS_CONFIG[report.status];
          const catColor = CATEGORY_COLORS[report.category] || CATEGORY_COLORS['Other'];
          const catIcon = CATEGORY_ICONS[report.category] || CATEGORY_ICONS['Other'];
          const timeAgo = getTimeAgo(report.timestamp);
          const hasLinkedTodo = todoReportIds.has(report.id);

          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className={`w-full text-left bg-card border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer active:scale-[0.99] ${
                report.status === 'open' ? 'border-red-200/70 hover:border-red-300' : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${catColor.bg} flex items-center justify-center shrink-0 mt-0.5 ${catColor.text}`}>
                  {catIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="font-bold text-sm truncate">{report.category}</h3>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${statusCfg.bg} ${statusCfg.text}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                      {hasLinkedTodo && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 bg-indigo-50 text-indigo-600">
                          <ListTodo size={10} />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">{timeAgo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{report.message}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin size={10} /><span>{data.getMachineName(report.machineId)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{new Date(report.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                  {(report.name || report.mobileNumber) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 mb-2 pt-1 border-t border-slate-100/50">
                      {report.name && (
                        <div className="flex items-center gap-1.5 text-primary/80 font-bold text-[10.5px]">
                          <User size={11} className="shrink-0" />
                          <span className="truncate max-w-[120px]">{report.name}</span>
                        </div>
                      )}
                      {report.mobileNumber && (
                        <div className="flex items-center gap-1.5 text-primary/80 font-bold text-[10.5px]">
                          <Phone size={11} className="shrink-0" />
                          <span>{report.mobileNumber}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquareWarning size={40} className="mx-auto mb-3 opacity-30" />
          <p className="mb-1">No reports found.</p>
          <p className="text-xs">
            {activeFilterCount > 0 || searchTerm ? 'Try adjusting your filters or search term.' : 'No issues have been reported yet.'}
          </p>
        </div>
      )}

      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onStatusChange={onStatusChange}
          onAddTodo={onAddTodo}
          hasTodo={todoReportIds.has(selectedReport.id)}
        />
      )}
    </div>
  );
};
