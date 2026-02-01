import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// --- CONFIGURATION ---
// 1. Go to Firebase Console -> Project Settings
// 2. Scroll to "Your apps" -> Select Web
// 3. Copy the `firebaseConfig` object properties below

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// --- DATABASE CONFIGURATION ---
// The ID of your second database.
// Change 'guardian-db-v2' to the actual name of your second database.
export const FIREBASE_DB_ID = 'security-company';

// ---------------------

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize the Main Firestore instance (Connected to your second DB)
export const firestore = getFirestore(app as any, FIREBASE_DB_ID);

// Initialize the Default Firestore instance (For migration purposes)
// We use getFirestore(app) without ID to target the default database explicitly
export const defaultFirestore = getFirestore(app as any);

export const auth = getAuth(app as any);