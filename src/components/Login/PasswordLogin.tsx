import './Login.css';

import { FormEvent, useEffect, useState } from 'react';
import { resetPassword, signInWithEmail } from '../../firebase/auth';
import { useAuthStore } from '../../stores/authStore';

/**
 * Email/password sign-in. Deliberately not linked from anywhere in the app:
 * it is reached only by typing its URL. Invite-only, like the magic link —
 * the account must already exist in the API.
 */
function PasswordLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const authError = useAuthStore((s) => s.error);
  const setAuthError = useAuthStore((s) => s.setAuthError);

  // Keep the page out of search results.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  // AuthProvider reports a sign-in it rejected (e.g. no account) through the
  // store; show it instead of spinning.
  useEffect(() => {
    if (!authError) return;
    setError(authError);
    setLoading(false);
    setAuthError(null);
  }, [authError, setAuthError]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    const { user, error: signInError } = await signInWithEmail(email.trim(), password);

    if (signInError) {
      setError(signInError);
      setLoading(false);
    } else if (!user) {
      setLoading(false);
    }
    // Signed in: AuthProvider resolves the account and the route redirects.
  };

  const handleForgotPassword = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }

    const { error: resetError } = await resetPassword(email.trim());
    if (resetError) {
      setError(resetError);
    } else {
      setNotice(`If an account exists for ${email.trim()}, a password reset email is on its way.`);
    }
  };

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
          {loading ? (
            <div className="login-loading">
              <div className="login-spinner" />
              <p>Signing you in...</p>
            </div>
          ) : (
            <>
              {error && <div className="error-message">{error}</div>}
              {notice && (
                <div className="success-message">
                  <p>{notice}</p>
                </div>
              )}

              <form className="password-form" onSubmit={handleSubmit}>
                <input
                  type="email"
                  className="email-input"
                  placeholder="Email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <input
                  type="password"
                  className="email-input"
                  placeholder="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button type="submit" className="continue-button">
                  Sign in
                </button>
              </form>

              <button type="button" className="text-button" onClick={handleForgotPassword}>
                Forgot password?
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PasswordLogin;
