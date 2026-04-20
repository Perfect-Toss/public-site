import './Login.css';

import { useState, useEffect, FormEvent } from 'react';
import { 
  signInWithGoogle, 
  signInWithApple, 
  handleRedirectResult,
  sendMagicLink,
  checkIsSignInWithEmailLink,
  completeMagicLinkSignIn
} from '../../firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple, faGoogle } from '@fortawesome/free-brands-svg-icons';

function Login() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Handle redirect result and magic link when component mounts
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      
      // First check if this is a magic link callback
      if (checkIsSignInWithEmailLink()) {
        console.log('Detected magic link sign-in');
        
        // Check if we have the email in localStorage
        const savedEmail = window.localStorage.getItem('emailForSignIn');
        console.log('Saved email from localStorage:', savedEmail);
        
        if (!savedEmail) {
          // If no email in localStorage, prompt the user
          const userEmail = window.prompt('Please confirm your email address to complete sign-in:');
          if (userEmail) {
            const { user, error: authError } = await completeMagicLinkSignIn(userEmail);
            
            if (authError) {
              setError(authError);
              console.error('Magic Link Error:', authError);
              setLoading(false);
            } else if (user) {
              console.log('Successfully signed in with magic link:', user);
              // Clean up the URL to remove the email link parameters
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          } else {
            setError('Email is required to complete sign-in');
            setLoading(false);
          }
        } else {
          const { user, error: authError } = await completeMagicLinkSignIn();
          
          if (authError) {
            setError(authError);
            console.error('Magic Link Error:', authError);
            setLoading(false);
          } else if (user) {
            console.log('Successfully signed in with magic link:', user);
            // Clean up the URL to remove the email link parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            // Note: Don't set loading to false here - let AuthContext handle the redirect
            // The auth state change will trigger navigation via AuthProvider
          }
        }
      } else {
        // Otherwise check for redirect result (Google/Apple)
        const { user, error: authError } = await handleRedirectResult();
        
        if (authError) {
          setError(authError);
          console.error('Redirect Error:', authError);
          setLoading(false);
        } else if (user) {
          console.log('Successfully signed in:', user);
          // Don't set loading to false - let the redirect happen
        } else {
          // No redirect result and no magic link
          setLoading(false);
        }
      }
    };
    
    checkAuth();
  }, []);

  const handleContinueWithApple = async () => {
    setLoading(true);
    setError('');
    const { error: authError } = await signInWithApple();
    
    if (authError) {
      setError(authError);
      console.error('Apple Sign-In Error:', authError);
      setLoading(false);
    }
    // If no error, the page will redirect
  };

  const handleContinueWithGoogle = async () => {
    setLoading(true);
    setError('');
    const { error: authError } = await signInWithGoogle();
    
    if (authError) {
      setError(authError);
      console.error('Google Sign-In Error:', authError);
      setLoading(false);
    }
    // If no error, the page will redirect
  };

  const handleEmailContinue = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const { success, error: authError } = await sendMagicLink(email);
    
    if (authError) {
      setError(authError);
      console.error('Magic Link Error:', authError);
      setLoading(false);
    } else if (success) {
      setEmailSent(true);
      setLoading(false);
      console.log('Magic link sent to:', email);
    }
  };

  // If email was sent, show confirmation
  if (emailSent) {
    return (
      <div className="login-container">
        <div className="login-content">
          <div className="logo-container">
            <div className="tennis-ball"></div>
            <h1 className="logo-text">
              PERFECT<span className="logo-toss">TOSS</span>
            </h1>
          </div>
          <div className="login-form">
            <div className="success-message">
              <h2>Check your email!</h2>
              <p>We&apos;ve sent a magic link to <strong>{email}</strong></p>
              <p>Click the link in the email to sign in.</p>
            </div>
            <button 
              className="continue-button" 
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
            >
              Try a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="logo-container">
          <div className="tennis-ball"></div>
          <h1 className="logo-text">
            PERFECT<span className="logo-toss">TOSS</span>
          </h1>
        </div>

        <div className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            className="social-button apple-button" 
            onClick={handleContinueWithApple}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faApple} className="social-icon" />
            Continue with Apple
          </button>

          <button 
            className="social-button google-button" 
            onClick={handleContinueWithGoogle}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faGoogle} className="social-icon" />
            Continue with Google
          </button>

          <div className="divider">
            <span>OR CONTINUE WITH EMAIL</span>
          </div>

          <form onSubmit={handleEmailContinue}>
            <input
              type="email"
              className="email-input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button type="submit" className="continue-button" disabled={loading}>
              {loading ? 'Loading...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
