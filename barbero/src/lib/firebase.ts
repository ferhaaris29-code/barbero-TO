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
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import { DEFAULT_STATE } from './defaultState';

export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: 'https://berbero-el-mahata-to-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'berbero-el-mahata-to',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
const db = getDatabase(app);

// 1. Charger l'état au démarrage (charge DEFAULT_STATE si la base est vide)
export function loadSalonState() {
  return DEFAULT_STATE;
}

// 2. Envoyer chaque réservation / changement directement à Firebase
export function saveSalonState(state) {
  if (!state) return;
  try {
    set(ref(db, 'salon'), state);
  } catch (e) {
    console.error("Erreur d'écriture Firebase :", e);
  }
}

// 3. Écouter en direct depuis n'importe quel téléphone
export function subscribeSalonState(cb) {
  const salonRef = ref(db, 'salon');
  return onValue(salonRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      cb(data);
    }
  });
}
