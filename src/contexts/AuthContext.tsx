import { ReactNode, useEffect, useState } from 'react';

import AuthContext from './useAuth';
import { User } from 'firebase/auth';
import { onAuthStateChange } from '../firebase/auth';
import { setAuthToken } from '../api/client';
import { useAuthStore } from '../stores/authStore';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const { setFirebaseUser, setAdmin } = useAuthStore();

  useEffect(() => {
    if (!currentUser) {
      setIsAdmin(false);
      setAdmin(false);
      return;
    }
    currentUser
      .getIdTokenResult()
      .then((tokenResult) => {
        const claims = tokenResult.claims;
        const admin = claims.role === 'Admin' ||
          claims.role === 'SuperUser' ||
          (Array.isArray(claims.roles) &&
            (claims.roles as string[]).some((r) => r === 'Admin' || r === 'SuperUser'));
        setIsAdmin(admin);
        setAdmin(admin);
      })
      .catch(() => {
        setIsAdmin(false);
        setAdmin(false);
      });
  }, [currentUser, setAdmin]);

  useEffect(() => {
    console.log('[AuthProvider] Setting up auth state listener...');
    
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
      await setFirebaseUser(user);
      setLoading(false);
    });

    return () => {
      console.log('[AuthProvider] Cleaning up auth listener');
      unsubscribe();
    };
  }, [setFirebaseUser]);

  const value = {
    currentUser,
    loading,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
