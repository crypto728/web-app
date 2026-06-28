import React, { useState, useMemo } from 'react';
import { useHabits } from '../useData';
import { Plus, Check, Trash2, Activity, TrendingUp } from 'lucide-react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function HabitsView() {
  const { habits, habitLogs, addHabit, deleteHabit, toggleHabitLog } = useHabits();
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFreq, setNewFreq] = useState<'daily' | 'weekly'>('daily');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await addHabit({ title: newTitle.trim(), frequency: newFreq });
    setNewTitle('');
    setShowForm(false);
  };

  // Generate last 14 days
  const today = new Date();
  const last14Days = useMemo(() => {
    return eachDayOfInterval({
      start: subDays(today, 13),
      end: today
    }).map(d => format(d, 'yyyy-MM-dd'));
  }, [today]);

  const chartData = useMemo(() => {
    return last14Days.map(date => {
      const completedCount = habitLogs.filter(l => l.date === date && l.completed).length;
      return {
        dateStr: date,
        displayDate: format(new Date(date), 'MMM d'),
        completed: completedCount
      };
    });
  }, [last14Days, habitLogs]);

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-cyan-400" />
            Habit Tracker
          </h1>
          <p className="text-slate-400 mt-1">Build better routines over time.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl transition-colors font-bold shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-5 h-5" />
          New Habit
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-8 p-4 bg-white/5 border border-white/10 rounded-2xl flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-400 mb-1">Habit Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Read 10 pages"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-cyan-400 outline-none transition-colors"
              autoFocus
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-slate-400 mb-1">Frequency</label>
            <select
              value={newFreq}
              onChange={(e) => setNewFreq(e.target.value as any)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-cyan-400 outline-none transition-colors"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <button type="submit" className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-medium border border-white/10">
            Add
          </button>
        </form>
      )}

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {habits.map(habit => {
          // Calculate streak
          let streak = 0;
          for (let i = last14Days.length - 1; i >= 0; i--) {
            const isCompleted = habitLogs.some(l => l.habitId === habit.id && l.date === last14Days[i] && l.completed);
            if (isCompleted) streak++;
            else if (i !== last14Days.length - 1) break; // If it's not today and it's missed, streak broken
          }

          return (
            <div key={habit.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{habit.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-medium uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      {habit.frequency}
                    </span>
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {streak} day streak
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
                {last14Days.slice(-7).map(date => {
                  const isCompleted = habitLogs.some(l => l.habitId === habit.id && l.date === date && l.completed);
                  const isToday = date === format(today, 'yyyy-MM-dd');
                  return (
                    <div key={date} className="flex flex-col items-center gap-2">
                      <span className={cn("text-[10px] font-medium uppercase tracking-wider", isToday ? "text-cyan-400" : "text-slate-500")}>
                        {format(new Date(date), 'EEE')}
                      </span>
                      <button
                        onClick={() => toggleHabitLog(habit.id, date)}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                          isCompleted
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            : "bg-black/20 border-white/10 text-transparent hover:border-white/30"
                        )}
                      >
                        <Check className={cn("w-5 h-5 transition-transform", isCompleted ? "scale-100" : "scale-50 opacity-0")} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {habits.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-2xl">
            <Activity className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No habits yet.</p>
            <p className="text-sm text-slate-500 mt-1">Add one above to start tracking.</p>
          </div>
        )}
      </div>

      {/* Graph Section */}
      {habits.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Completion History (14 Days)
            </h2>
            <p className="text-sm text-slate-400">Total habits completed each day</p>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#475569" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#22d3ee' }}
                />
                <Bar dataKey="completed" name="Habits Completed" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.completed > 0 ? '#22d3ee' : '#1e293b'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
