/**
 * ─── Sync layer: Firebase Realtime Database adapter ─────────────────────────
 *
 * This module abstracts the persistence/synchronisation of the whole salon
 * state (bookings, chair states, services, gallery & salon status).
 *
 * Currently it runs on a local adapter (localStorage + BroadcastChannel) so
 * the app is fully functional out-of-the-box and syncs live across tabs.
 *
 * To plug real Firebase:
 *   1. `npm i firebase`
 *   2. Fill FIREBASE_CONFIG below with your project keys.
 *   3. Replace the LocalAdapter methods with:
 *        import { initializeApp } from 'firebase/app';
 *        import { getDatabase, ref, set, onValue } from 'firebase/database';
 *        const app = initializeApp(FIREBASE_CONFIG);
 *        const db  = getDatabase(app);
 *        write : set(ref(db, 'salon'), state)
 *        listen: onValue(ref(db, 'salon'), snap => cb(snap.val()))
 *   The rest of the app (useSalon store) needs zero changes.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, type Database } from 'firebase/database';
import type { SalonState } from '../types';
import { DEFAULT_STATE } from '../defaultState';

export const FIREBASE_CONFIG = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || '',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || '',
  databaseURL: 'https://berbero-el-mahata-to-default-rtdb.firebaseio.com',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || 'berbero-el-mahata-to',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || '',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || '',
};

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
const db: Database = getDatabase(app);

export function loadSalonState(): SalonState | null {
  return DEFAULT_STATE as SalonState;
}

export function saveSalonState(state: SalonState): void {
  if (!state) return;
  try {
    set(ref(db, 'salon'), state);
  } catch (e) {
    console.error('Erreur Firebase :', e);
  }
}

export function subscribeSalonState(cb: (s: SalonState) => void): () => void {
  const salonRef = ref(db, 'salon');
  const unsubscribe = onValue(salonRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      cb(data as SalonState);
    }
  });
  return () => unsubscribe();
}
