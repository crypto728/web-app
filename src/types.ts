export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  deadline: number | null;
  context: string;
  contextTrigger?: string;
  snoozeCount?: number;
  calendarEventId?: string;
  locked?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: number | null;
  status: 'active' | 'completed' | 'abandoned';
  progress: number;
  type: string;
  createdAt: number;
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  createdAt: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface Recommendation {
  id: string;
  content: string;
  type: string;
  createdAt: number;
}
