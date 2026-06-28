import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { useAuth } from './AuthContext';
import { Task, Goal, Habit, HabitLog } from './types';

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setHabitLogs([]);
      setLoading(false);
      return;
    }

    const db = getDb();
    
    // Listen to habits
    const hQuery = query(collection(db, `users/${user.uid}/habits`));
    const hUnsub = onSnapshot(hQuery, (snapshot) => {
      setHabits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit)));
      setLoading(false);
    });

    // Listen to logs
    const lQuery = query(collection(db, `users/${user.uid}/habitLogs`));
    const lUnsub = onSnapshot(lQuery, (snapshot) => {
      setHabitLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HabitLog)));
    });

    return () => {
      hUnsub();
      lUnsub();
    };
  }, [user]);

  const addHabit = async (habit: Omit<Habit, 'id' | 'createdAt'>) => {
    if (!user) return;
    const db = getDb();
    await addDoc(collection(db, `users/${user.uid}/habits`), {
      ...habit,
      createdAt: Date.now()
    });
  };

  const updateHabit = async (id: string, data: Partial<Habit>) => {
    if (!user) return;
    const db = getDb();
    await updateDoc(doc(db, `users/${user.uid}/habits/${id}`), data);
  };
  
  const deleteHabit = async (id: string) => {
    if (!user) return;
    const db = getDb();
    await deleteDoc(doc(db, `users/${user.uid}/habits/${id}`));
  };

  const toggleHabitLog = async (habitId: string, date: string) => {
    if (!user) return;
    const db = getDb();
    const existingLog = habitLogs.find(l => l.habitId === habitId && l.date === date);
    
    if (existingLog) {
      // Toggle it
      await updateDoc(doc(db, `users/${user.uid}/habitLogs/${existingLog.id}`), {
        completed: !existingLog.completed
      });
    } else {
      // Create it
      await addDoc(collection(db, `users/${user.uid}/habitLogs`), {
        habitId,
        date,
        completed: true
      });
    }
  };

  return { habits, habitLogs, loading, addHabit, updateHabit, deleteHabit, toggleHabitLog };
}

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const db = getDb();
    const q = query(collection(db, `users/${user.uid}/tasks`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(newTasks);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const db = getDb();
    await addDoc(collection(db, `users/${user.uid}/tasks`), {
      ...task,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    if (!user) return;
    const db = getDb();
    await updateDoc(doc(db, `users/${user.uid}/tasks/${id}`), {
      ...data,
      updatedAt: Date.now()
    });
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    const db = getDb();
    await deleteDoc(doc(db, `users/${user.uid}/tasks/${id}`));
  };

  return { tasks, loading, addTask, updateTask, deleteTask };
}

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const db = getDb();
    const q = query(collection(db, `users/${user.uid}/goals`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newGoals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
      setGoals(newGoals);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addGoal = async (goal: Omit<Goal, 'id' | 'createdAt'>) => {
    if (!user) return;
    const db = getDb();
    await addDoc(collection(db, `users/${user.uid}/goals`), {
      ...goal,
      createdAt: Date.now()
    });
  };

  const updateGoal = async (id: string, data: Partial<Goal>) => {
    if (!user) return;
    const db = getDb();
    await updateDoc(doc(db, `users/${user.uid}/goals/${id}`), data);
  };

  return { goals, loading, addGoal, updateGoal };
}
