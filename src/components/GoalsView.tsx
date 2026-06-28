import React from 'react';
import { useGoals } from '../useData';
import { Target } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export function GoalsView() {
  const { goals, updateGoal } = useGoals();

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Long-term Goals</h1>
          <p className="text-slate-400 mt-1">Track your big-picture progress.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map(goal => (
          <div key={goal.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
            <div className="flex justify-between items-start mb-4">
               <div>
                 <h3 className="text-lg font-medium text-white">{goal.title}</h3>
                 <p className="text-sm text-slate-400 mt-1">{goal.description}</p>
               </div>
               <span className="px-3 py-1 text-xs font-bold text-cyan-400 bg-cyan-500/20 border border-cyan-500/30 rounded-full uppercase tracking-widest">
                 {goal.type}
               </span>
            </div>

            <div className="space-y-2 mt-6">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="font-medium text-slate-400">Progress</span>
                <span className="font-mono text-cyan-400 font-bold">{goal.progress}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => updateGoal(goal.id, { progress: Math.max(0, (goal.progress || 0) - 10) })}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors font-mono font-bold"
                >
                  -
                </button>
                <div className="h-2.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${goal.progress || 0}%` }}
                  />
                </div>
                <button 
                  onClick={() => updateGoal(goal.id, { progress: Math.min(100, (goal.progress || 0) + 10) })}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors font-mono font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {goal.targetDate && (
               <div className="mt-6 pt-4 border-t border-white/10 text-sm text-slate-400">
                 Target: {format(new Date(goal.targetDate), 'MMMM d, yyyy')}
               </div>
            )}
          </div>
        ))}

        {goals.length === 0 && (
           <div className="md:col-span-2 text-center p-12 border border-white/10 bg-white/5 backdrop-blur-md rounded-3xl">
             <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto text-slate-400 mb-3 border border-white/5">
               <Target className="w-6 h-6" />
             </div>
             <h3 className="text-lg font-medium text-white mb-1">No goals set</h3>
             <p className="text-slate-400">Use the AI assistant to help define your goals.</p>
           </div>
        )}
      </div>
    </div>
  );
}
