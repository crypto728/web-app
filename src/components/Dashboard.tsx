import React, { useState, useEffect } from 'react';
import { useTasks, useGoals } from '../useData';
import { useAuth } from '../AuthContext';
import { CheckCircle, Circle, Clock, AlertCircle, Sparkles, Loader2, ArrowRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { Task } from '../types';

export function Dashboard() {
  const { tasks, updateTask } = useTasks();
  const { goals } = useGoals();
  const { getAccessToken } = useAuth();
  const [aiData, setAiData] = useState<{
    recommendations: string[];
    prioritizedTaskIds: string[];
    dailyPlan: string;
  } | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => {
    if (tasks.length > 0 || goals.length > 0) {
      analyzeData();
    }
  }, [tasks.length, goals.length]);

  const analyzeData = async () => {
    setLoadingAI(true);
    try {
      const res = await fetch('/api/ai/analyze-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, goals }),
      });
      const data = await res.json();
      setAiData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAI(false);
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  
  // Sort tasks using AI prioritization if available
  const prioritizedTasks = [...pendingTasks].sort((a, b) => {
    if (aiData?.prioritizedTaskIds) {
      const aIdx = aiData.prioritizedTaskIds.indexOf(a.id);
      const bIdx = aiData.prioritizedTaskIds.indexOf(b.id);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
    }
    return 0; // fallback
  });

  const topTasks = prioritizedTasks.slice(0, 5);

  const handleToggleTask = (id: string, status: string) => {
    updateTask(id, { status: status === 'completed' ? 'pending' : 'completed' });
  };

  const handleSyncCalendar = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); // prevent toggling task
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
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

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
    } catch (err) {
      console.error(err);
      alert("Failed to sync to calendar.");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-white">Overview</h1>
        <div className="text-sm text-slate-400 font-mono">
          {format(new Date(), 'EEEE, MMM do')}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* AI Companion Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex items-start gap-4 relative z-10">
              <div className="p-3 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-lg font-medium text-white flex items-center gap-2">
                    AI Assistant
                    {loadingAI && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
                  </h2>
                  <p className="text-slate-300 mt-1">
                    {aiData?.dailyPlan || "Analyzing your focus areas and upcoming deadlines..."}
                  </p>
                </div>
                
                {aiData?.recommendations && aiData.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Recommendations</h3>
                    <ul className="space-y-2">
                      {aiData.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5">
                          <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Priority Actions</h2>
            </div>
            
            <div className="space-y-3">
              {topTasks.length === 0 ? (
                <div className="text-center p-8 border border-white/10 rounded-3xl text-slate-400 bg-white/5 backdrop-blur-md">
                  You're all caught up! Enjoy your free time or plan ahead.
                </div>
              ) : (
                topTasks.map(task => (
                  <div 
                    key={task.id}
                    className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group backdrop-blur-md"
                    onClick={() => handleToggleTask(task.id, task.status)}
                  >
                    <button className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center border transition-colors",
                      task.status === 'completed' 
                        ? "bg-cyan-500 border-cyan-500 text-slate-950" 
                        : "border-white/20 text-transparent group-hover:border-cyan-400"
                    )}>
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium truncate transition-colors",
                        task.status === 'completed' ? "text-slate-500 line-through" : "text-white"
                      )}>
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        {task.deadline && (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(task.deadline), 'MMM d, h:mm a')}
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
                      {task.deadline && !task.calendarEventId && (
                        <button
                          onClick={(e) => handleSyncCalendar(e, task)}
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
                        <span className="px-3 py-1 text-xs font-bold text-rose-400 bg-rose-500/20 border border-rose-500/30 rounded-full flex items-center gap-1 uppercase tracking-widest">
                          <AlertCircle className="w-3 h-3" />
                          High
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Side Panel for Goals */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
            <h2 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-4">Active Goals</h2>
            <div className="space-y-4">
              {goals.length === 0 ? (
                <p className="text-sm text-slate-400">No active goals set. Focus on something bigger!</p>
              ) : (
                goals.slice(0, 4).map(goal => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-white">{goal.title}</span>
                      <span className="text-cyan-400 font-bold">{goal.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
