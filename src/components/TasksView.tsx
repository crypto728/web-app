import React, { useState } from 'react';
import { useTasks } from '../useData';
import { useAuth } from '../AuthContext';
import { CheckCircle, Clock, AlertCircle, Plus, Calendar as CalendarIcon, Loader2, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Task } from '../types';

export function TasksView() {
  const { tasks, updateTask } = useTasks();
  const { getAccessToken } = useAuth();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [analyzingHabits, setAnalyzingHabits] = useState(false);

  const handleToggleTask = (id: string, status: string) => {
    updateTask(id, { status: status === 'completed' ? 'pending' : 'completed' });
  };

  const analyzeHabits = async () => {
    setAnalyzingHabits(true);
    try {
      const res = await fetch('/api/ai/habit-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks })
      });
      const data = await res.json();
      if (data.lockedTaskIds && data.lockedTaskIds.length > 0) {
        data.lockedTaskIds.forEach((id: string) => {
           updateTask(id, { locked: true });
        });
        alert(`Habit Coach has locked ${data.lockedTaskIds.length} tasks to prevent further snoozing.`);
      } else {
        alert("No habit patterns detected that require locking.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to analyze habits.");
    } finally {
      setAnalyzingHabits(false);
    }
  };

  const handleSyncCalendar = async (task: Task) => {
    const token = getAccessToken();
    if (!token) {
      alert("Please login with Google to sync to Calendar.");
      return;
    }

    if (!task.deadline) {
      alert("Task needs a deadline to be synced.");
      return;
    }

    setSyncingId(task.id);
    try {
      const startDateTime = new Date(task.deadline);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      const body = {
        summary: task.title,
        description: task.description || task.context || "Synced from Remr.ai",
        start: {
          dateTime: startDateTime.toISOString(),
        },
        end: {
          dateTime: endDateTime.toISOString(),
        }
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        throw new Error("Failed to create event");
      }

      const data = await res.json();
      await updateTask(task.id, { calendarEventId: data.id });
    } catch (e) {
      console.error(e);
      alert("Failed to sync to calendar.");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">All Tasks</h1>
          <p className="text-slate-400 mt-1">Manage and organize your action items.</p>
        </div>
        <button
          onClick={analyzeHabits}
          disabled={analyzingHabits}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl transition-all font-medium text-sm disabled:opacity-50"
        >
          {analyzingHabits ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          AI Habit Coach
        </button>
      </header>

      <div className="space-y-4">
        {tasks.map(task => (
          <div 
            key={task.id}
            className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all backdrop-blur-md"
          >
            <button 
              onClick={() => handleToggleTask(task.id, task.status)}
              className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center border transition-colors shrink-0",
              task.status === 'completed' 
                ? "bg-cyan-500 border-cyan-500 text-slate-950" 
                : "border-white/20 text-transparent hover:border-cyan-400"
            )}>
              <CheckCircle className="w-4 h-4" />
            </button>
            
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium text-base truncate transition-colors",
                task.status === 'completed' ? "text-slate-500 line-through" : "text-white"
              )}>
                {task.title}
              </p>
              {task.description && (
                 <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                {task.deadline && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(task.deadline), 'MMM d, yyyy h:mm a')}
                    {task.snoozeCount && task.snoozeCount > 0 ? ` (Snoozed ${task.snoozeCount}x)` : ''}
                  </p>
                )}
                {task.contextTrigger && (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    {task.contextTrigger}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {task.locked && (
                <span className="p-1.5 text-purple-400" title="Locked by AI Habit Coach">
                  <Lock className="w-4 h-4" />
                </span>
              )}
              {task.deadline && !task.calendarEventId && (
                <button
                  onClick={() => handleSyncCalendar(task)}
                  disabled={syncingId === task.id}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                  title="Add to Google Calendar"
                >
                  {syncingId === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarIcon className="w-4 h-4" />}
                </button>
              )}
              {task.calendarEventId && (
                <span className="p-1.5 text-cyan-400" title="Synced to Calendar">
                  <CalendarIcon className="w-4 h-4" />
                </span>
              )}

              {task.priority === 'high' && (
                <span className="px-3 py-1 text-xs font-bold text-rose-400 bg-rose-500/20 border border-rose-500/30 rounded-full tracking-widest uppercase">High</span>
              )}
               {task.priority === 'medium' && (
                <span className="px-3 py-1 text-xs font-bold text-amber-400 bg-amber-500/20 border border-amber-500/30 rounded-full tracking-widest uppercase">Med</span>
              )}
              <span className={cn(
                "px-3 py-1 text-xs font-bold rounded-full tracking-widest uppercase",
                task.status === 'completed' ? "text-emerald-400 bg-emerald-500/20 border border-emerald-500/30" : "text-slate-300 bg-white/10 border border-white/20"
              )}>
                {task.status}
              </span>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
           <div className="text-center p-12 border border-white/10 bg-white/5 backdrop-blur-md rounded-3xl">
             <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto text-slate-400 mb-3 border border-white/5">
               <CheckCircle className="w-6 h-6" />
             </div>
             <h3 className="text-lg font-medium text-white mb-1">No tasks found</h3>
             <p className="text-slate-400">Ask the AI assistant to add a new task for you!</p>
           </div>
        )}
      </div>
    </div>
  );
}
