import { ReactNode, useEffect, useRef } from 'react';

import { onAuthStateChange, logout as firebaseLogout, getIdToken } from '../firebase/auth';
import { setAuthTokenProvider, setMutationsBlocked } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { fetchUserById, isAdminUser, type User } from '../api/api.users';
import { AccountLinkedElsewhereError, createSession, fetchInvitedUser } from '../api/api.auth';
import {
  clearPersistedViewAs,
  readViewAsUserId,
  useViewAsStore,
} from '../stores/viewAsStore';
import { AuthContext, type AuthContextType } from './useAuth';
import { canCreateEvent } from '../utils/roles';
import { reportError, reportEvent, setTelemetryUser, type TelemetryAttributes } from '../telemetry';

/** Apple's "Hide My Email" relay addresses. */
const APPLE_PRIVATE_RELAY_DOMAIN = '@privaterelay.appleid.com';

const HIDDEN_EMAIL_MESSAGE =
  'Perfect Toss needs your email address. Please sign in with Apple again and choose "Share My Email" ' +
  '(if Apple doesn’t ask, remove Perfect Toss under Settings → Apple Account → Sign in with Apple first), ' +
  'or use Google or email instead.';

/** An identity the app refuses to sign in, or null when it may proceed. */
function rejectIdentity(fbUser: { email: string | null }): string | null {
  const email = fbUser.email?.trim().toLowerCase();
  if (!email || email.endsWith(APPLE_PRIVATE_RELAY_DOMAIN)) return HIDDEN_EMAIL_MESSAGE;
  return null;
}

/** Providers that may create an account on first sign-in. */
const SELF_REGISTERING_PROVIDERS = new Set(['google.com', 'apple.com']);

const NO_ACCOUNT_MESSAGE = 'No account found for this email. Please contact support.';

/**
 * Resolve the API account for a signed-in Firebase user.
 *
 * Google and Apple go through the session endpoint, which links or creates the
 * account. Every other method (magic link, password) is invite-only: the
 * account must already exist, so it is only looked up.
 */
async function resolveApiUser(signInProvider: string | null): Promise<User | null> {
  if (signInProvider && SELF_REGISTERING_PROVIDERS.has(signInProvider)) {
    return createSession();
  }
  return fetchInvitedUser();
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Apply the account selected for view-as.
 *
 * Only an admin may emulate another account, so a selection made by anyone
 * else — or one that no longer resolves — is dropped. Returns true when an
 * account is being emulated.
 */
async function applyViewAs(apiUser: User): Promise<boolean> {
  const targetId = readViewAsUserId();
  if (!targetId) return false;

  if (targetId === apiUser.id || !isAdminUser(apiUser)) {
    clearPersistedViewAs();
    return false;
  }

  try {
    const target = await fetchUserById(targetId);
    if (!target) {
      clearPersistedViewAs();
      return false;
    }
    // The list endpoints narrow themselves from this id, so nothing else about
    // the account has to be resolved up front.
    useViewAsStore.getState().setTarget(target);
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
  // True while the account behind a fresh sign-in is being resolved. A 401 then
  // means "no account", which the resolution reports itself — it is not an
  // expired session.
  const resolvingRef = useRef(false);

  // The API client asks for a token per request, so Firebase refreshes an
  // expired token instead of reusing it.
  useEffect(() => {
    setAuthTokenProvider({
      getToken: (forceRefresh) => getIdToken(forceRefresh),
      onUnauthorized: () => {
        if (resolvingRef.current) return;
        console.warn('[AuthProvider] Session rejected by the API — signing out');
        reportEvent('Session rejected by the API; signing out', { 'auth.step': 'session-expired' }, 'warn');
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

      setTelemetryUser(fbUser?.uid ?? null);

      if (fbUser) {
        const { creationTime, lastSignInTime } = fbUser.metadata;
        const telemetry: TelemetryAttributes = {
          'auth.uid': fbUser.uid,
          'auth.email': fbUser.email,
          'auth.email_verified': fbUser.emailVerified,
          'auth.display_name_present': Boolean(fbUser.displayName),
          // Every provider linked to the Firebase user, with that provider's own id
          // (e.g. Apple's stable user id), not necessarily the one just used.
          'auth.linked_providers':
            fbUser.providerData.map((p) => `${p.providerId}:${p.uid}${p.email ? ` <${p.email}>` : ''}`).join(', ') ||
            undefined,
          'auth.account_created': creationTime,
          'auth.last_sign_in': lastSignInTime,
          // Firebase created the user in this sign-in.
          'auth.new_firebase_user': Boolean(creationTime && creationTime === lastSignInTime),
        };
        // Where a failure happened: token, session or view-as.
        let step = 'identity-check';

        const rejection = rejectIdentity(fbUser);
        if (rejection) {
          // Checked before the session call, so no account is created for it.
          console.warn('[AuthProvider] Sign-in rejected — no shareable email');
          reportEvent(
            'Sign-in rejected: no shareable email',
            {
              ...telemetry,
              'auth.step': step,
              'auth.email_kind': fbUser.email ? 'apple-private-relay' : 'missing',
              'auth.user_message': rejection,
            },
            'warn',
          );
          await firebaseLogout();
          useViewAsStore.getState().clear();
          setAuthRef.current(null, null);
          setAuthErrorRef.current(rejection);
          return;
        }

        try {
          resolvingRef.current = true;
          let apiUser: User | null;
          try {
            step = 'token';
            const { signInProvider, authTime, claims } = await fbUser.getIdTokenResult();
            telemetry['auth.provider'] = signInProvider;
            telemetry['auth.auth_time'] = authTime;
            // What the API will see: it reads the email and its verification from the token.
            telemetry['auth.token_email'] = typeof claims.email === 'string' ? claims.email : undefined;
            telemetry['auth.token_email_verified'] =
              typeof claims.email_verified === 'boolean' ? claims.email_verified : undefined;
            step = 'session';
            telemetry['auth.session_endpoint'] =
              signInProvider && SELF_REGISTERING_PROVIDERS.has(signInProvider) ? 'create-session' : 'invited-user';
            apiUser = await resolveApiUser(signInProvider);
          } finally {
            resolvingRef.current = false;
          }

          if (apiUser === null) {
            // Invite-only sign-in for an email with no API account.
            console.error('[AuthProvider] No API user found — signing out');
            reportEvent(
              'Sign-in rejected: no account for this identity',
              { ...telemetry, 'auth.step': step, 'auth.user_message': NO_ACCOUNT_MESSAGE },
              'warn',
            );
            await firebaseLogout();
            useViewAsStore.getState().clear();
            setAuthRef.current(null, null);
            setAuthErrorRef.current(NO_ACCOUNT_MESSAGE);
            return;
          }

          // Resolve view-as before the shell mounts, so it never paints the
          // signed-in account first.
          step = 'view-as';
          if (!(await applyViewAs(apiUser))) useViewAsStore.getState().clear();
          // Both Firebase and API auth succeeded — atomically set both.
          setAuthRef.current(fbUser, apiUser);
        } catch (err) {
          // API call failed — keep state consistent by signing out of Firebase.
          console.error('[AuthProvider] Failed to resolve the API account — signing out:', err);
          const userMessage =
            err instanceof AccountLinkedElsewhereError
              ? err.message
              : 'Could not verify your account. Please try again.';
          // ApiRequestError adds the status, the server's message and the
          // correlation id that matches the API's own logs for the call.
          reportError('Sign-in failed: could not resolve the API account', err, {
            ...telemetry,
            'auth.step': step,
            'auth.user_message': userMessage,
          });
          await firebaseLogout();
          useViewAsStore.getState().clear();
          setAuthRef.current(null, null);
          setAuthErrorRef.current(userMessage);
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
