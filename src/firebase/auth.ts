import {
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  User,
  ActionCodeSettings,
  Unsubscribe
} from 'firebase/auth';
import { auth, googleProvider, appleProvider } from './config';

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
  url: window.location.origin,
  handleCodeInApp: true,
};

// Sign in with Google (using redirect to avoid popup blockers)
export const signInWithGoogle = async (): Promise<AuthResult> => {
  try {
    await signInWithRedirect(auth, googleProvider);
    // The page will redirect, so we don't return anything here
    return { user: null, error: null };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return { user: null, error: (error as Error).message };
  }
};

// Sign in with Apple (using redirect to avoid popup blockers)
export const signInWithApple = async (): Promise<AuthResult> => {
  try {
    await signInWithRedirect(auth, appleProvider);
    // The page will redirect, so we don't return anything here
    return { user: null, error: null };
  } catch (error) {
    console.error('Error signing in with Apple:', error);
    return { user: null, error: (error as Error).message };
  }
};

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
    return { user: null, error: (error as Error).message };
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
    return { success: false, error: (error as Error).message };
  }
};

// Check if current URL is a sign-in with email link
export const checkIsSignInWithEmailLink = (): boolean => {
  return isSignInWithEmailLink(auth, window.location.href);
};

// Complete sign-in with email link
export const completeMagicLinkSignIn = async (email: string | null = null): Promise<AuthResult> => {
  try {
    // Get email from parameter or local storage
    let userEmail = email;
    if (!userEmail) {
      userEmail = window.localStorage.getItem('emailForSignIn');
    }
    
    if (!userEmail) {
      return { 
        user: null, 
        error: 'Please provide your email to complete sign-in' 
      };
    }

    const result = await signInWithEmailLink(auth, userEmail, window.location.href);
    
    // Clear email from local storage
    window.localStorage.removeItem('emailForSignIn');
    
    return { user: result.user, error: null };
  } catch (error) {
    console.error('Error completing magic link sign-in:', error);
    return { user: null, error: (error as Error).message };
  }
};

// Sign in with Email and Password
export const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    console.error('Error signing in with email:', error);
    return { user: null, error: (error as Error).message };
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
    return { success: false, error: (error as Error).message };
  }
};

// Sign Out
export const logout = async (): Promise<SuccessResult> => {
  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Auth State Observer
export const onAuthStateChange = (callback: (user: User | null) => void): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};
