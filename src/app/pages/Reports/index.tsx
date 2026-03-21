import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  MessageSquareWarning,
  ListTodo,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../lib/api';
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
  const [activeTab, setActiveTab] = useState<'reports' | 'todos'>('reports');
  const [todos, setTodos] = useState<TodoItem[]>([]);

  const loadTodos = React.useCallback(async () => {
    if (!user) return;
    try {
      const raw = await api.get<any[]>('/todos');
      const mapped: TodoItem[] = raw.map((t: any) => ({
        id: t.id,
        reportId: t.reportId,
        title: t.title,
        description: t.description,
        machineId: t.machineId,
        category: t.category,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
        completed: Boolean(t.completed),
      }));
      setTodos(mapped);
    } catch (error) {
      console.error('[Reports] Failed to load todos:', error);
      toast.error('Failed to load to-do list');
    }
  }, [user]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  if (!user) return null;

  const handleAddTodo = async (report: Report) => {
    if (todos.some(t => t.reportId === report.id)) {
      toast.info('A to-do already exists for this report.');
      return;
    }

    try {
      const created = await api.post<any>('/todos', { reportId: report.id });
      const mapped: TodoItem = {
        id: created.id,
        reportId: created.reportId,
        title: created.title,
        description: created.description,
        machineId: created.machineId,
        category: created.category,
        createdAt: created.createdAt ? new Date(created.createdAt).toISOString() : new Date().toISOString(),
        completed: Boolean(created.completed),
      };
      setTodos(prev => [mapped, ...prev]);
      setActiveTab('todos');
      toast.success('Action item added to your to-do list');
    } catch (error: any) {
      if (error?.message?.toLowerCase()?.includes('already exists')) {
        toast.info('A to-do already exists for this report.');
        loadTodos();
        return;
      }
      toast.error(error?.message || 'Failed to add to-do item');
    }
  };

  const toggleTodo = async (id: string) => {
    const current = todos.find(t => t.id === id);
    if (!current) return;

    const nextCompleted = !current.completed;
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, completed: nextCompleted } : t)));

    try {
      await api.patch(`/todos/${id}`, { completed: nextCompleted });
    } catch (error: any) {
      setTodos(prev => prev.map(t => (t.id === id ? { ...t, completed: current.completed } : t)));
      toast.error(error?.message || 'Failed to update to-do');
    }
  };

  const deleteTodo = async (id: string) => {
    const previous = todos;
    setTodos(prev => prev.filter(t => t.id !== id));
    try {
      await api.delete(`/todos/${id}`);
      toast.success('To-do item removed');
    } catch (error: any) {
      setTodos(previous);
      toast.error(error?.message || 'Failed to remove to-do');
    }
  };

  const pendingTodosCount = todos.filter(t => !t.completed).length;

  return (
    <div className="space-y-6 pb-24 md:pb-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Support & Operations</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">Manage machine reports and maintenance tasks</p>
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
        <ReportsListView onAddTodo={handleAddTodo} todos={todos} />
      ) : (
        <TodoListView todos={todos} onToggle={toggleTodo} onDelete={deleteTodo} />
      )}
    </div>
  );
}
