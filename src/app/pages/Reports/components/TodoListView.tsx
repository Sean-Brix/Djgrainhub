import React, { useState } from 'react';
import { 
  ClipboardList, 
  Circle, 
  SquareCheckBig, 
  CheckCircle2, 
  Trash2, 
  MapPin, 
  Clock,
  ListTodo
} from 'lucide-react';
import { useData } from '../../../lib/DataContext';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './ReportDetailModal';

interface TodoListViewProps {
  todos: any[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TodoListView: React.FC<TodoListViewProps> = ({
  todos,
  onToggle,
  onDelete,
}) => {
  const data = useData();
  const [todoFilter, setTodoFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedTodo, setSelectedTodo] = useState<any | null>(null);

  const pendingCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;

  const filtered = todoFilter === 'all' ? todos : todoFilter === 'pending' ? todos.filter(t => !t.completed) : todos.filter(t => t.completed);

  const sorted = [...filtered].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setTodoFilter('all')} className={`bg-card border rounded-xl p-3.5 text-left transition-all cursor-pointer ${todoFilter === 'all' ? 'border-primary shadow-sm ring-1 ring-primary/20' : 'border-border hover:shadow-sm'}`}>
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><ClipboardList size={14} /><span className="text-xs">Total</span></div>
          <p className="text-xl font-bold">{todos.length}</p>
        </button>
        <button onClick={() => setTodoFilter(todoFilter === 'pending' ? 'all' : 'pending')} className={`bg-card border rounded-xl p-3.5 text-left transition-all cursor-pointer ${todoFilter === 'pending' ? 'border-indigo-400 shadow-sm ring-1 ring-indigo-200' : 'border-border hover:shadow-sm'}`}>
          <div className="flex items-center gap-2 text-indigo-600 mb-1"><Circle size={14} /><span className="text-xs">Pending</span></div>
          <p className="text-xl font-bold text-indigo-600">{pendingCount}</p>
        </button>
        <button onClick={() => setTodoFilter(todoFilter === 'completed' ? 'all' : 'completed')} className={`bg-card border rounded-xl p-3.5 text-left transition-all cursor-pointer ${todoFilter === 'completed' ? 'border-green-400 shadow-sm ring-1 ring-green-200' : 'border-border hover:shadow-sm'}`}>
          <div className="flex items-center gap-2 text-green-600 mb-1"><SquareCheckBig size={14} /><span className="text-xs">Done</span></div>
          <p className="text-xl font-bold text-green-600">{completedCount}</p>
        </button>
      </div>

      <div className="space-y-2">
        {sorted.map(todo => {
          const catColor = CATEGORY_COLORS[todo.category] || CATEGORY_COLORS['Other'];
          const catIcon = CATEGORY_ICONS[todo.category] || CATEGORY_ICONS['Other'];

          return (
            <div
              key={todo.id}
              onClick={() => setSelectedTodo(todo)}
              className={`bg-card border rounded-xl p-4 transition-all cursor-pointer ${todo.completed ? 'border-border opacity-60' : 'border-indigo-200/70'} hover:shadow-sm`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(todo.id);
                  }}
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                    todo.completed ? 'bg-green-500 border-green-500 text-white' : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50'
                  }`}
                >
                  {todo.completed && <CheckCircle2 size={14} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className={`font-bold text-sm ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>{todo.title}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(todo.id);
                      }}
                      className="p-1 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer shrink-0"
                      title="Delete to-do"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className={`text-xs mb-2.5 line-clamp-2 ${todo.completed ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>{todo.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${catColor.bg} ${catColor.text}`}>
                      {React.cloneElement(catIcon as React.ReactElement, { size: 10 })}
                      {todo.category}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin size={9} /> {data.getMachineName(todo.machineId)}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock size={9} /> {new Date(todo.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ListTodo size={40} className="mx-auto mb-3 opacity-30" />
          <p className="mb-1">
            {todoFilter === 'all' ? 'No to-dos yet.' : todoFilter === 'pending' ? 'No pending to-dos.' : 'No completed to-dos.'}
          </p>
          <p className="text-xs">Open a report and tap "Add To-Do" to create action items.</p>
        </div>
      )}

      {selectedTodo && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] p-4 flex items-center justify-center" onClick={() => setSelectedTodo(null)}>
          <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-xl p-5 md:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base md:text-lg font-bold text-foreground">{selectedTodo.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">Review full details before resolving this task.</p>
              </div>
              <button
                className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
                onClick={() => setSelectedTodo(null)}
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-xs">
              <div className="rounded-lg bg-muted/60 px-3 py-2">
                <span className="text-muted-foreground">Status:</span>{' '}
                <span className="font-semibold">{selectedTodo.completed ? 'Completed' : 'Pending'}</span>
              </div>
              <div className="rounded-lg bg-muted/60 px-3 py-2">
                <span className="text-muted-foreground">Category:</span>{' '}
                <span className="font-semibold">{selectedTodo.category}</span>
              </div>
              <div className="rounded-lg bg-muted/60 px-3 py-2">
                <span className="text-muted-foreground">Machine:</span>{' '}
                <span className="font-semibold">{data.getMachineName(selectedTodo.machineId)}</span>
              </div>
              <div className="rounded-lg bg-muted/60 px-3 py-2">
                <span className="text-muted-foreground">Created:</span>{' '}
                <span className="font-semibold">{new Date(selectedTodo.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 mb-4">
              <p className="text-xs text-muted-foreground mb-1">Details</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedTodo.description}</p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                className="text-xs px-3 py-2 rounded-md border border-border hover:bg-muted transition-colors"
                onClick={() => {
                  onDelete(selectedTodo.id);
                  setSelectedTodo(null);
                }}
              >
                Delete
              </button>
              <button
                className="text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                onClick={() => {
                  onToggle(selectedTodo.id);
                  setSelectedTodo((prev: any) => (prev ? { ...prev, completed: !prev.completed } : prev));
                }}
              >
                {selectedTodo.completed ? 'Mark As Pending' : 'Mark As Completed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
