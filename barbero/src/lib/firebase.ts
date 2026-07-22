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
import type { SalonState } from './types';

export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: 'barbero-tizi-ouzou',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

const KEY = 'barbero-salon-state-v6';
const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(KEY) : null;

export function loadSalonState(): SalonState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SalonState) : null;
  } catch {
    return null;
  }
}

export function saveSalonState(state: SalonState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    channel?.postMessage(state);
  } catch {
    /* quota / private mode — ignore */
  }
}

/** Live subscription (multi-tab realtime sync — mirrors onValue()). */
export function subscribeSalonState(cb: (s: SalonState) => void): () => void {
  if (!channel) return () => {};
  const handler = (e: MessageEvent) => cb(e.data as SalonState);
  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
}
