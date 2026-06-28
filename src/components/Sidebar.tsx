import React from 'react';
import { NavLink } from 'react-router';
import { LayoutDashboard, CheckSquare, Target, LogOut, Brain, Activity } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { cn } from '../lib/utils';

export function Sidebar() {
  const { logout, user } = useAuth();

  const navItems = [
    { name: 'Overview', to: '/', icon: LayoutDashboard },
    { name: 'Tasks', to: '/tasks', icon: CheckSquare },
    { name: 'Habits', to: '/habits', icon: Activity },
    { name: 'Goals', to: '/goals', icon: Target },
  ];

  return (
    <div className="w-64 h-screen border-r border-white/10 bg-white/5 backdrop-blur-2xl flex flex-col hidden md:flex shrink-0 z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
          <Brain className="w-5 h-5" />
        </div>
        <span className="font-bold text-xl tracking-tight text-white">Remr<span className="text-cyan-400">.ai</span></span>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors",
              isActive 
                ? "bg-white/10 text-cyan-400 border border-white/10 font-medium" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-semibold text-xs">
              {user?.displayName?.[0] || user?.email?.[0] || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.displayName || 'User'}
            </p>
          </div>
          <button 
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
