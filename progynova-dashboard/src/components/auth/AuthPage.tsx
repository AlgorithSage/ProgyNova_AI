import { useRef, useState } from 'react';
import {
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import './AuthPage.css';

interface AuthPageProps {
  /** Called once the user is successfully signed in (Google or phone). */
  onAuthenticated: () => void;
  /** Called when the user dismisses the auth page (back to landing). */
  onClose: () => void;
}

type Panel = 'choose' | 'phone';

/** Map Firebase auth error codes to human-friendly messages. */
function friendlyError(code?: string): string {
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google popup. Allow popups and retry.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/invalid-phone-number':
      return 'Enter a valid phone number with country code, e.g. +9198...';
    case 'auth/missing-phone-number':
      return 'Please enter your phone number.';
    case 'auth/invalid-verification-code':
      return 'That verification code is incorrect.';
    case 'auth/code-expired':
      return 'That code has expired. Request a new one.';
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA verification failed. Please try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for sign-in. Add it in the Firebase console.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'Authentication is not configured yet. Add your Firebase keys to .env.local.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

function errCode(e: unknown): string | undefined {
  return typeof e === 'object' && e !== null && 'code' in e
    ? String((e as { code: unknown }).code)
    : undefined;
}

export function AuthPage({ onAuthenticated, onClose }: AuthPageProps) {
  const [panel, setPanel] = useState<Panel>('choose');

  // Phone flow
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<'enter' | 'verify'>('enter');
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Google ────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onAuthenticated();
    } catch (err) {
      setError(friendlyError(errCode(err)));
    } finally {
      setLoading(false);
    }
  };

  // ── Phone (OTP) ───────────────────────────────────────────────
  const getRecaptcha = () => {
    if (!recaptchaRef.current) {
      // Invisible reCAPTCHA — Firebase auto-creates the keys; we only mount it.
      recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
    return recaptchaRef.current;
  };

  const resetRecaptcha = () => {
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const verifier = getRecaptcha();
      confirmationRef.current = await signInWithPhoneNumber(auth, phone.trim(), verifier);
      setPhoneStep('verify');
    } catch (err) {
      setError(friendlyError(errCode(err)));
      resetRecaptcha(); // allow a fresh attempt
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationRef.current) return;
    setError('');
    setLoading(true);
    try {
      await confirmationRef.current.confirm(otp.trim());
      onAuthenticated();
    } catch (err) {
      setError(friendlyError(errCode(err)));
    } finally {
      setLoading(false);
    }
  };

  const openPhone = () => {
    setError('');
    setPhone('');
    setOtp('');
    setPhoneStep('enter');
    setPanel('phone');
  };

  const backToChoose = () => {
    setError('');
    resetRecaptcha();
    confirmationRef.current = null;
    setPanel('choose');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* ── Left: form panel ─────────────────────────────── */}
        <section className="auth-panel">
          <div className="auth-brand">
            <div className="auth-brand__logo-container">
              <img className="auth-brand__logo" src="/logos/i3.png" alt="ProgyNova AI" />
            </div>
          </div>

          <div className="auth-form-wrap">
            <header className="auth-form__head">
              <h1 className="auth-form__title">
                {panel === 'phone' ? 'Sign in with phone' : 'Welcome to ProgyNova AI'}
              </h1>
              <p className="auth-form__subtitle">
                {panel === 'phone'
                  ? 'We will text you a one-time verification code. Standard messaging rates may apply.'
                  : 'Sign in to start forecasting demand and preventing stockouts.'}
              </p>
            </header>

            {error && <div className="auth-error" role="alert">{error}</div>}

            {panel === 'choose' ? (
              <>
                <div className="auth-social auth-social--stack">
                  <button type="button" className="auth-social-btn" onClick={handleGoogle} disabled={loading}>
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                    </svg>
                    Continue with Google
                  </button>
                  <button type="button" className="auth-social-btn" onClick={openPhone} disabled={loading}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    Continue with phone number
                  </button>
                </div>

                <p className="auth-foot">
                  By continuing you agree to our
                  {' '}
                  <button type="button" className="auth-foot__link auth-foot__link--muted">Terms &amp; Conditions</button>.
                </p>
              </>
            ) : (
              /* ── Phone flow ─────────────────────────────── */
              <>
                {phoneStep === 'enter' ? (
                  <form className="auth-form" onSubmit={handleSendOtp}>
                    <label className="auth-field">
                      <span className="auth-field__label">Phone number</span>
                      <input
                        className="auth-input"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="tel"
                        required
                      />
                    </label>
                    <button type="submit" className="auth-submit" disabled={loading}>
                      {loading ? 'Sending…' : 'Send code'}
                    </button>
                  </form>
                ) : (
                  <form className="auth-form" onSubmit={handleVerifyOtp}>
                    <label className="auth-field">
                      <span className="auth-field__label">Verification code</span>
                      <input
                        className="auth-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        autoComplete="one-time-code"
                        required
                      />
                    </label>
                    <button type="submit" className="auth-submit" disabled={loading}>
                      {loading ? 'Verifying…' : 'Verify & continue'}
                    </button>
                  </form>
                )}

                <p className="auth-foot">
                  <button type="button" className="auth-foot__link" onClick={backToChoose}>
                    ← Back to sign-in options
                  </button>
                </p>
              </>
            )}
          </div>
          {/* Invisible reCAPTCHA mount point for phone auth */}
          <div id="recaptcha-container" />
        </section>

        {/* ── Right: media panel (image on mobile, video on desktop) ── */}
        <section className="auth-visual">
          <video
            className="auth-visual__video"
            src="/Images_videos/login%20modal%20video.mp4"
            poster="/Images_videos/login%20BG.png"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          />
          <button
            type="button"
            className="auth-visual__close"
            onClick={onClose}
            aria-label="Back to home"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </section>
      </div>
    </div>
  );
}
