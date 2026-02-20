import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
  MessageSquareWarning,
  ListTodo,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useData } from '../../lib/DataContext';
import type { Report } from '../../lib/dataHelpers';
import { ReportsListView } from './components/ReportsListView';
import { TodoListView } from './components/TodoListView';

export interface TodoItem {
  id: string;
  reportId: string;
  title: string;
  description: string;
  machineId: string;
  category: string;
  createdAt: string;
  completed: boolean;
}

export function Reports() {
  const { user } = useAuth();
  const data = useData();
  const [activeTab, setActiveTab] = useState<'reports' | 'todos'>('reports');
  const [todos, setTodos] = useState<TodoItem[]>([]);

  if (!user) return null;

  const handleStatusChange = (id: string, newStatus: Report['status']) => {
    data.updateReportStatus(id, newStatus);
    const statusLabel = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
    toast.success(`Report marked as ${statusLabel}`);
  };

  const handleAddTodo = (report: Report) => {
    if (todos.some(t => t.reportId === report.id)) {
      toast.info('A to-do already exists for this report.');
      return;
    }

    const contactStr = [report.name, report.mobileNumber].filter(Boolean).join(' | ');
    const description = contactStr ? `Contact: ${contactStr}\n\n${report.message}` : report.message;

    const newTodo: TodoItem = {
      id: Math.random().toString(36).substr(2, 9),
      reportId: report.id,
      title: `Fix ${report.category} at ${data.getMachineName(report.machineId)}`,
      description: description,
      machineId: report.machineId,
      category: report.category,
      createdAt: new Date().toISOString(),
      completed: false,
    };

    setTodos([newTodo, ...todos]);
    setActiveTab('todos');
    toast.success('Action item added to your to-do list');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
    toast.success('To-do item removed');
  };

  const pendingTodosCount = todos.filter(t => !t.completed).length;

  return (
    <div className="space-y-6 pb-24 md:pb-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Support & Operations</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage machine reports and maintenance tasks</p>
        </div>
      </div>

      <div className="flex bg-muted/50 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'reports' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquareWarning size={16} />
          Reports
        </button>
        <button
          onClick={() => setActiveTab('todos')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer relative ${
            activeTab === 'todos' ? 'bg-background text-indigo-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ListTodo size={16} />
          To-Do List
          {pendingTodosCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-background">
              {pendingTodosCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'reports' ? (
        <ReportsListView onAddTodo={handleAddTodo} todos={todos} onStatusChange={handleStatusChange} />
      ) : (
        <TodoListView todos={todos} onToggle={toggleTodo} onDelete={deleteTodo} />
      )}
    </div>
  );
}
