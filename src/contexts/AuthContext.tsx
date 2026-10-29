import { ReactNode, useEffect, useRef } from 'react';

import { onAuthStateChange, logout as firebaseLogout, getIdToken } from '../firebase/auth';
import { setAuthTokenProvider, setMutationsBlocked } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { fetchCurrentUser, fetchUserById, isAdminUser, type User } from '../api/api.users';
import { fetchEntitiesForUser } from '../api/api.entities';
import {
  clearPersistedViewAs,
  readViewAsUserId,
  useViewAsStore,
} from '../stores/viewAsStore';
import { AuthContext, type AuthContextType } from './useAuth';
import { canCreateEvent, isSuperUser } from '../utils/roles';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Apply the account selected for view-as.
 *
 * Only a super user may emulate another account, so a selection made by anyone
 * else — or one that no longer resolves — is dropped. Returns true when an
 * account is being emulated.
 */
async function applyViewAs(apiUser: User): Promise<boolean> {
  const targetId = readViewAsUserId();
  if (!targetId) return false;

  if (targetId === apiUser.id || !isSuperUser(apiUser)) {
    clearPersistedViewAs();
    return false;
  }

  try {
    const [target, entities] = await Promise.all([
      fetchUserById(targetId),
      fetchEntitiesForUser(targetId),
    ]);
    if (!target) {
      clearPersistedViewAs();
      return false;
    }
    useViewAsStore.getState().setTarget(target, entities.map((entity) => entity.id));
    return true;
  } catch (error) {
    console.error('[AuthProvider] Failed to resolve the view-as account:', error);
    clearPersistedViewAs();
    return false;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const signedInUser = useAuthStore((s) => s.user);
  const initializing = useAuthStore((s) => s.initializing);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setAuthError = useAuthStore((s) => s.setAuthError);
  const viewAsTarget = useViewAsStore((s) => s.target);
  // Everything derived from the user follows the emulated account, so the shell,
  // the route guards and every role-gated action match what that account sees.
  // Signing out outranks any leftover target, so a rejected session still ends.
  const currentUser = signedInUser ? (viewAsTarget ?? signedInUser) : null;
  const isAdmin = isAdminUser(currentUser);
  const canCreateEvents = canCreateEvent(currentUser?.roles);

  // Stale-safe ref so the useEffect (empty deps) always calls the latest action.
  const setAuthRef = useRef(setAuth);
  setAuthRef.current = setAuth;
  const setAuthErrorRef = useRef(setAuthError);
  setAuthErrorRef.current = setAuthError;

  // The API client asks for a token per request, so Firebase refreshes an
  // expired token instead of reusing it.
  useEffect(() => {
    setAuthTokenProvider({
      getToken: (forceRefresh) => getIdToken(forceRefresh),
      onUnauthorized: () => {
        console.warn('[AuthProvider] Session rejected by the API — signing out');
        setAuth(null, null);
        setAuthError('Your session has expired. Please sign in again.');
        void firebaseLogout();
      },
    });

    return () => setAuthTokenProvider(null);
  }, [setAuth, setAuthError]);

  // A view-as session is read-only: a write would be attributed to the account
  // actually signed in, not the one on screen.
  useEffect(() => {
    setMutationsBlocked(viewAsTarget !== null);
    return () => setMutationsBlocked(false);
  }, [viewAsTarget]);

  useEffect(() => {
    console.log('[AuthProvider] Setting up auth state listener...');

    const unsubscribe = onAuthStateChange(async (fbUser) => {
      console.log('[AuthProvider] Auth state changed:', {
        isLoggedIn: !!fbUser,
        email: fbUser?.email,
        uid: fbUser?.uid,
      });

      if (fbUser) {
        try {
          // Fetch the API user profile — failure means we sign out entirely.
          const apiUser = await fetchCurrentUser();

          if (apiUser === null) {
            // Firebase user exists but no matching API profile — invalid state.
            console.error('[AuthProvider] No API user found — signing out');
            await firebaseLogout();
            useViewAsStore.getState().clear();
            setAuthRef.current(null, null);
            setAuthErrorRef.current('No account found for this email. Please contact support.');
          } else {
            // Resolve view-as before the shell mounts, so it never paints the
            // signed-in account first.
            if (!(await applyViewAs(apiUser))) useViewAsStore.getState().clear();
            // Both Firebase and API auth succeeded — atomically set both.
            setAuthRef.current(fbUser, apiUser);
          }
        } catch (err) {
          // API call failed — keep state consistent by signing out of Firebase.
          console.error('[AuthProvider] Failed to fetch API user — signing out:', err);
          await firebaseLogout();
          useViewAsStore.getState().clear();
          setAuthRef.current(null, null);
          setAuthErrorRef.current('Could not verify your account. Please try again.');
        }
      } else {
        useViewAsStore.getState().clear();
        setAuthRef.current(null, null);
      }
    });

    return () => {
      console.log('[AuthProvider] Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    currentUser,
    firebaseUser,
    initializing,
    isAdmin,
    canCreateEvents,
  };

  return (
    <AuthContext.Provider value={value}>
      {initializing ? (
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
