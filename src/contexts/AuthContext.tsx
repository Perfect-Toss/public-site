import { ReactNode, useEffect, useState } from 'react';

import AuthContext from './useAuth';
import { User } from 'firebase/auth';
import { onAuthStateChange } from '../firebase/auth';
import { setAuthToken } from '../api/client';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthProvider] Setting up auth state listener...');
    
    // Check localStorage for Firebase auth data (debugging)
    const localStorageKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('firebase:')
    );
    console.log('[AuthProvider] Firebase localStorage keys:', localStorageKeys);
    
    // onAuthStateChanged will automatically restore the session from persistence
    // It triggers immediately with null if no session, or with the User if session exists
    const unsubscribe = onAuthStateChange(async (user) => {
      console.log('[AuthProvider] Auth state changed:', {
        isLoggedIn: !!user,
        email: user?.email,
        uid: user?.uid
      });

      if (user) {
        const token = await user.getIdToken();
        setAuthToken(token);
      } else {
        setAuthToken(null);
      }

      setCurrentUser(user);
      setLoading(false);
    });

    // The unsubscribe function will be called when component unmounts
    return () => {
      console.log('[AuthProvider] Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
