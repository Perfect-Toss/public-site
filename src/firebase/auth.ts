import {
  ActionCodeSettings,
  AuthProvider,
  Unsubscribe,
  User,
  createUserWithEmailAndPassword,
  getRedirectResult,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from 'firebase/auth';
import { appleProvider, auth, googleProvider } from './config';
import { reportError, reportEvent, type TelemetryAttributes } from '../telemetry';

import { FirebaseError } from 'firebase/app';

interface AuthResult {
  user: User | null;
  error: string | null;
}

interface SuccessResult {
  success: boolean;
  error: string | null;
}

// Action code settings for magic link
const actionCodeSettings: ActionCodeSettings = {
  // URL you want to redirect back to after email link is clicked
  // Use the full URL including protocol
  url: `${window.location.origin}/login`,
  handleCodeInApp: true,
};

// Popup errors that mean the user backed out; nothing to report.
const CANCELLED_POPUP_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

/** Turn a Firebase sign-in error into a message for the login page. */
export const describeSignInError = (error: unknown, method: 'provider' | 'password' = 'provider'): string | null => {
  const code = error instanceof FirebaseError ? error.code : null;
  if (code && CANCELLED_POPUP_CODES.has(code)) return null;
  switch (code) {
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method. Please sign in that way first.';
    case 'auth/invalid-credential':
      // For Google/Apple this is the provider rejecting Firebase's own
      // configuration (e.g. a wrong client secret), not anything the user typed.
      return method === 'password'
        ? 'Incorrect email or password.'
        : 'Sign-in with this provider is not working right now. Please try another method or contact support.';
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/admin-restricted-operation':
      // The Firebase project refuses to create new users from the client
      // (Authentication → Settings → User actions → "Enable create (sign-up)"
      // is off), so only an identity Firebase already knows can sign in.
      return 'No account found for this email. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/unauthorized-domain':
      return 'Sign-in is not enabled for this site. Please contact support.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return (error as Error)?.message ?? 'Sign-in failed. Please try again.';
  }
};

/**
 * Firebase setup and session state for a sign-in failure. The error itself
 * (code, Firebase customData such as the email, stack) and the browser's state
 * are added by reportError.
 */
const authTelemetry = (step: string, startedAt?: number, extra: TelemetryAttributes = {}): TelemetryAttributes => ({
  'auth.step': step,
  'auth.duration_ms': startedAt === undefined ? undefined : Math.round(performance.now() - startedAt),
  'firebase.auth_domain': auth.config.authDomain,
  'firebase.project_id': auth.app.options.projectId,
  'firebase.sdk': auth.config.sdkClientVersion,
  // A user already signed in (e.g. linking a second provider) changes what Firebase does.
  'auth.current_uid': auth.currentUser?.uid,
  'auth.current_email': auth.currentUser?.email,
  ...extra,
});

// Popup sign-in. The auth domain (firebaseapp.com) differs from the site's
// domain, and browsers partition storage across sites, so a redirect sign-in
// returns with no result. A popup avoids that; a redirect is only the fallback
// when the browser blocks the popup.
const signInWithProvider = async (provider: AuthProvider, label: string): Promise<AuthResult> => {
  const startedAt = performance.now();
  const providerAttributes = { 'auth.provider': provider.providerId };
  try {
    const result = await signInWithPopup(auth, provider);
    return { user: result.user, error: null };
  } catch (error) {
    const code = error instanceof FirebaseError ? error.code : undefined;
    if (code === 'auth/popup-blocked') {
      reportEvent('Sign-in popup blocked; falling back to redirect', {
        ...providerAttributes,
        ...authTelemetry('popup', startedAt),
      }, 'warn');
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectError) {
        console.error(`Error starting ${label} redirect sign-in:`, redirectError);
        const userMessage = describeSignInError(redirectError);
        reportError(`${label} redirect sign-in could not start`, redirectError, {
          ...providerAttributes,
          ...authTelemetry('redirect', startedAt, { 'auth.user_message': userMessage }),
        });
        return { user: null, error: userMessage };
      }
      return { user: null, error: null };
    }
    if (code && CANCELLED_POPUP_CODES.has(code)) {
      // Not a failure, but a burst of these for one provider points at a broken popup.
      reportEvent(`${label} sign-in cancelled`, {
        ...providerAttributes,
        ...authTelemetry('popup', startedAt, { 'error.code': code }),
      });
      return { user: null, error: null };
    }
    console.error(`Error signing in with ${label}:`, error);
    const userMessage = describeSignInError(error);
    reportError(`${label} sign-in failed`, error, {
      ...providerAttributes,
      ...authTelemetry('popup', startedAt, { 'auth.user_message': userMessage }),
    });
    return { user: null, error: userMessage };
  }
};

export const signInWithGoogle = (): Promise<AuthResult> => signInWithProvider(googleProvider, 'Google');

export const signInWithApple = (): Promise<AuthResult> => signInWithProvider(appleProvider, 'Apple');

// Get redirect result (call this on page load)
export const handleRedirectResult = async (): Promise<AuthResult> => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      return { user: result.user, error: null };
    }
    return { user: null, error: null };
  } catch (error) {
    console.error('Error handling redirect result:', error);
    const userMessage = describeSignInError(error);
    // The provider is not known here: a failed result carries no credential.
    reportError('Redirect sign-in failed', error, authTelemetry('redirect-result', undefined, { 'auth.user_message': userMessage }));
    return { user: null, error: userMessage };
  }
};

// Send Magic Link (Passwordless Email Authentication)
export const sendMagicLink = async (email: string): Promise<SuccessResult> => {
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    // Save the email locally so we can complete sign-in when user returns
    window.localStorage.setItem('emailForSignIn', email);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error sending magic link:', error);
    reportError('Sending magic link failed', error, authTelemetry('send-link', undefined, {
      'auth.provider': 'emailLink',
      'auth.email': email,
      'auth.continue_url': actionCodeSettings.url,
    }));
    return { success: false, error: (error as Error).message };
  }
};

// Check if current URL is a sign-in with email link
export const checkIsSignInWithEmailLink = (): boolean => {
  return isSignInWithEmailLink(auth, window.location.href);
};

// Complete sign-in with email link
export const completeMagicLinkSignIn = async (email: string | null = null): Promise<AuthResult> => {
  const storedEmail = window.localStorage.getItem('emailForSignIn');
  const linkAttributes: TelemetryAttributes = {
    'auth.provider': 'emailLink',
    'auth.email': email ?? storedEmail,
    // Typed in at the prompt: the link was opened in a different browser than the one that asked for it.
    'auth.email_source': email ? 'prompt' : storedEmail ? 'local-storage' : 'none',
  };
  try {
    console.log('Starting magic link sign-in completion...');
    console.log('Current URL:', window.location.href);
    
    // Get email from parameter or local storage
    let userEmail = email;
    if (!userEmail) {
      userEmail = window.localStorage.getItem('emailForSignIn');
      console.log('Retrieved email from localStorage:', userEmail);
    } else {
      console.log('Using provided email:', userEmail);
    }
    
    if (!userEmail) {
      console.error('No email available for sign-in');
      reportEvent('Magic link opened with no email to complete it', authTelemetry('complete-link', undefined, linkAttributes), 'warn');
      return {
        user: null, 
        error: 'Please provide your email to complete sign-in' 
      };
    }

    console.log('Attempting to sign in with email link...');
    const result = await signInWithEmailLink(auth, userEmail, window.location.href);
    console.log('Sign-in successful:', result.user.email);
    
    // Clear email from local storage
    window.localStorage.removeItem('emailForSignIn');
    console.log('Cleared email from localStorage');
    
    return { user: result.user, error: null };
  } catch (error) {
    console.error('Error completing magic link sign-in:', error);
    // auth/invalid-action-code: the link was already used, expired, or is not the latest one sent.
    reportError('Magic link sign-in failed', error, authTelemetry('complete-link', undefined, linkAttributes));
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { user: null, error: errorMessage };
  }
};

// Sign in with Email and Password
export const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    console.error('Error signing in with email:', error);
    const userMessage = describeSignInError(error, 'password');
    reportError('Password sign-in failed', error, authTelemetry('password', undefined, {
      'auth.provider': 'password',
      'auth.email': email,
      'auth.user_message': userMessage,
    }));
    return { user: null, error: userMessage };
  }
};

// Create new account with Email and Password
export const signUpWithEmail = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Optionally send email verification
    await sendEmailVerification(result.user);
    return { user: result.user, error: null };
  } catch (error) {
    console.error('Error signing up with email:', error);
    reportError('Password sign-up failed', error, authTelemetry('sign-up', undefined, {
      'auth.provider': 'password',
      'auth.email': email,
    }));
    return { user: null, error: (error as Error).message };
  }
};

// Reset Password
export const resetPassword = async (email: string): Promise<SuccessResult> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error resetting password:', error);
    reportError('Password reset failed', error, authTelemetry('password-reset', undefined, {
      'auth.provider': 'password',
      'auth.email': email,
    }));
    return { success: false, error: (error as Error).message };
  }
};

// Current user's ID token. The SDK refreshes it once it is expired, and
// `forceRefresh` mints one regardless of the cached token.
export const getIdToken = async (forceRefresh = false): Promise<string | null> => {
  const user = auth.currentUser;
  return user ? user.getIdToken(forceRefresh) : null;
};

// Sign Out
export const logout = async (): Promise<SuccessResult> => {
  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    reportError('Sign-out failed', error, authTelemetry('sign-out'));
    return { success: false, error: (error as Error).message };
  }
};

// Auth State Observer
export const onAuthStateChange = (callback: (user: User | null) => void): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};
