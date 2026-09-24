import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  doc,
  getDoc,
  Firestore,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence transient network retry warnings from spamming the console
try {
  setLogLevel('error');
} catch {
  // Ignore if setLogLevel is already configured
}

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with pure in-memory cache and forced long polling
// Using experimentalForceLongPolling prevents WebSocket timeouts/unavailable errors
// in proxied, iframe, and containerized cloud environments
let firestoreInstance: Firestore;
const dbId = firebaseConfig.firestoreDatabaseId || '(default)';

try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true,
    },
    dbId
  );
} catch {
  // If already initialized, retrieve existing instance
  try {
    firestoreInstance = getFirestore(app, dbId);
  } catch {
    firestoreInstance = initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      dbId
    );
  }
}

export const db = firestoreInstance;

// Validate connection to Firestore on boot as per Firestore integration guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const healthDoc = await getDoc(doc(db, '_health', 'status'));
    return healthDoc.exists();
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline-first mode.');
    }
    return false;
  }
}
