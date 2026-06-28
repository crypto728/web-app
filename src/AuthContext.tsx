import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { initFirebase, getFirebaseAuth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginError: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
}

let cachedAccessToken: string | null = null;

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginError: null,
  login: async () => {},
  logout: async () => {},
  getAccessToken: () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: () => void;

    const setup = async () => {
      await initFirebase();
      const auth = getFirebaseAuth();
      unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (!u) cachedAccessToken = null;
        setLoading(false);
      });
    };

    setup();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const login = async () => {
    setLoginError(null);
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
      }
    } catch (e: any) {
      if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user' || e.code === 'auth/unauthorized-domain' || e.message.includes('popup')) {
        console.warn('Login popup closed by user or cancelled.');
        setLoginError('Login was blocked or cancelled. If you are using the app inside a preview iframe, please open it in a new tab.');
      } else {
        console.error('Login error:', e);
        setLoginError(e.message || 'An error occurred during login. Please try opening the app in a new tab.');
      }
    }
  };

  const logout = async () => {
    const auth = getFirebaseAuth();
    cachedAccessToken = null;
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginError, login, logout, getAccessToken: () => cachedAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
