import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from 'firebase/auth';

// Config is read from Vite env vars (set in .env.local locally and in Vercel's
// Project Settings -> Environment Variables for production). Firebase web API
// keys are not secrets, but env vars keep them out of source and per-env.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.appId
);

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
auth.useDeviceLanguage();

// Keep the session in IndexedDB/localStorage so a signed-in user stays signed in
// across reloads and browser restarts — they don't have to log in every visit.
// (browserLocalPersistence is Firebase's default, but we set it explicitly.)
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('[Auth] failed to set local persistence', err);
});

export const googleProvider = new GoogleAuthProvider();
