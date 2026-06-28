import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './AuthContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TasksView } from './components/TasksView';
import { GoalsView } from './components/GoalsView';
import { HabitsView } from './components/HabitsView';
import { AssistantWidget } from './components/AssistantWidget';
import { Brain, LogIn } from 'lucide-react';

function LoginScreen() {
  const { login, loginError } = useAuth();
  
  return (
    <div className="min-h-screen bg-[#0c101b] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-xl text-center space-y-8 relative z-10">
        <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 mx-auto">
          <Brain className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome to Remr</h1>
          <p className="text-slate-400 mt-2">Your AI-powered productivity companion.</p>
        </div>
        
        {loginError && (
          <div className="bg-rose-500/20 border border-rose-500/30 text-rose-400 text-sm p-4 rounded-xl text-left">
            {loginError}
            <div className="mt-2 text-xs opacity-80">
              Tip: Right-click the app frame or use the menu to open this app in a new tab if you are viewing it inside an editor.
            </div>
          </div>
        )}
        
        <button 
          onClick={login}
          className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 py-3 px-4 rounded-xl font-bold shadow-lg shadow-cyan-500/40 transition-colors"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

function MainLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c101b] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-screen bg-[#0c101b] text-white overflow-hidden font-sans relative">
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto z-10 relative">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<TasksView />} />
          <Route path="/habits" element={<HabitsView />} />
          <Route path="/goals" element={<GoalsView />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      <AssistantWidget />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}
