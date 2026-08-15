import { useState, useEffect, useRef } from 'react';
import { loginWithGoogle } from '../services/api';
import { useToast } from './Toast';

let googleInitialized = false;

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const addToast = useToast();
  const [loading, setLoading] = useState(false);
  const [mockEmail, setMockEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const callbackRef = useRef();
  const modalRef = useRef(null);

  const handleGoogleCallback = async (response) => {
    setLoading(true);
    try {
      const data = await loginWithGoogle(response.credential);
      addToast('Successfully signed in with Google!', 'success');
      onLoginSuccess(data.data.token, data.data.user);
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to authenticate with Google', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    callbackRef.current = handleGoogleCallback;
  });

  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !clientId) return;

    const initGoogleSignIn = () => {
      if (window.google?.accounts?.id) {
        if (!googleInitialized) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (res) => {
              if (callbackRef.current) {
                callbackRef.current(res);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          googleInitialized = true;
        }
      }
    };

    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        initGoogleSignIn();
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isOpen, clientId]);

  const handleGoogleClick = () => {
    if (window.google?.accounts?.id) {
      setLoading(true);
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setLoading(false);
        }
      });
    }
  };

  const handleMockSubmit = async (e) => {
    e.preventDefault();
    if (!mockEmail) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mockEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');

    setLoading(true);
    try {
      const mockToken = `mock_token_${mockEmail}`;
      const data = await loginWithGoogle(mockToken);
      addToast('Logged in via Dev Mock Mode!', 'success');
      onLoginSuccess(data.data.token, data.data.user);
      onClose();
    } catch (err) {
      addToast(err.message || 'Dev Mock Sign-In failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div 
        ref={modalRef}
        className="modal-content login-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="modal-close" 
          onClick={onClose} 
          aria-label="Close login modal"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div className="modal-header">
          <div className="modal-brand">
            <div className="brand-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </div>
            <div className="brand-text">
              <h2 id="login-modal-title">Welcome to Shortify</h2>
              <p>Sign in to manage and analyze your links</p>
            </div>
          </div>
        </div>

        <div className="modal-divider"></div>

        <div className="modal-body">
          {clientId ? (
            <>
              <div className="auth-options">
                <button
                  ref={googleBtnRef}
                  type="button"
                  className="btn btn-google w-full"
                  onClick={handleGoogleClick}
                  disabled={loading}
                  aria-label="Sign in with Google"
                >
                  <svg className="google-icon" width="20" height="20" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
                </button>
                {loading && (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <span>Signing you in...</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="dev-mock-login">
              <div className="dev-notice">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>
                  <strong>Developer Mode:</strong> Google OAuth not configured. Using email simulation.
                </span>
              </div>
              
              <form onSubmit={handleMockSubmit} className="mock-login-form" noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="mock-email">Email Address</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <input
                      id="mock-email"
                      type="email"
                      className="form-input"
                      placeholder="name@example.com"
                      value={mockEmail}
                      onChange={(e) => {
                        setMockEmail(e.target.value);
                        if (emailError) setEmailError('');
                      }}
                      required
                      disabled={loading}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {emailError && <span className="form-error">{emailError}</span>}
                </div>
                
                <button
                  type="submit"
                  className="btn btn-primary btn-submit w-full"
                  disabled={loading || !mockEmail}
                >
                  {loading ? (
                    <>
                      <span className="btn-spinner"></span>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    'Continue with Email'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <p>By signing in, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</p>
        </div>
      </div>
    </div>
  );
}
