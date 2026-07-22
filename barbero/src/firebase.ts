/**
 * ─── Firebase Realtime Database — synchronisation temps réel ───────────────
 *
 * Gère la file d'attente (tickets), les coiffeurs/sièges et les réglages du
 * salon en temps réel, sans backend Node :
 *
 *   • tickets/  → un nœud par ticket (push / update / remove)
 *   • barbers/  → statut Actif/Inactif + siège de chaque coiffeur
 *   • salon/    → réglages (ouvert/fermé, horaires, services, galerie…)
 *
 * ▸ ACTIVATION : renseignez firebaseConfig ci-dessous (console Firebase →
 *   Paramètres du projet → Vos applications). Dès que databaseURL est rempli,
 *   toute l'application bascule automatiquement en synchronisation Firebase
 *   multi-appareils. Sans config, un adaptateur local (localStorage +
 *   BroadcastChannel) prend le relais — l'app reste 100 % fonctionnelle.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getDatabase, ref, onValue, set, update, remove, push,
  type Database,
} from 'firebase/database';
import type { Barber, Booking, SalonState } from './lib/types';

/** ⚙️ Config Firebase — à remplir pour activer le temps réel multi-appareils. */
const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  databaseURL: '', // ex: https://barbero-tiziouzou-default-rtdb.europe-west1.firebasedatabase.app
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

let app: FirebaseApp | null = null;
let db: Database | null = null;

if (firebaseConfig.databaseURL && firebaseConfig.apiKey) {
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  } catch (e) {
    console.warn('[Barbero] Initialisation Firebase impossible :', e);
    db = null;
  }
}

export const isFirebaseEnabled = (): boolean => db !== null;

/** RTDB rejette `undefined` : nettoie récursivement les objets avant écriture. */
function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/* ────────────────────────── TICKETS (file d'attente) ─────────────────── */

/** Ajoute un ticket dans Firebase (push) et retourne son id. */
export function fbPushTicket(ticket: Booking): string {
  if (!db) return ticket.id;
  const node = push(ref(db, 'tickets'));
  const id = node.key ?? ticket.id;
  void set(node, clean({ ...ticket, id }));
  return id;
}

/** Met à jour un ticket ("Démarrer", "Terminer", notification…). */
export function fbUpdateTicket(id: string, patch: Partial<Booking>): void {
  if (!db) return;
  void update(ref(db, `tickets/${id}`), clean(patch));
}

/** Supprime un ticket. */
export function fbRemoveTicket(id: string): void {
  if (!db) return;
  void remove(ref(db, `tickets/${id}`));
}

/** Remplace toute la file (clôture de caisse → vide). */
export function fbSetTickets(bookings: Booking[]): void {
  if (!db) return;
  const map: Record<string, Booking> = {};
  for (const b of bookings) map[b.id] = b;
  void set(ref(db, 'tickets'), clean(map));
}

/* ─────────────────────────── BARBERS (coiffeurs) ─────────────────────── */

/** Synchronise l'état complet des coiffeurs (Actif/Inactif, siège). */
export function fbSetBarbers(barbers: Barber[]): void {
  if (!db) return;
  const map: Record<string, Barber> = {};
  for (const b of barbers) map[b.id] = b;
  void set(ref(db, 'barbers'), clean(map));
}

/* ─────────────────────────── SALON (réglages) ────────────────────────── */

type SalonMeta = Omit<SalonState, 'bookings' | 'barbers' | 'chairs'>;

export function fbSetMeta(meta: SalonMeta): void {
  if (!db) return;
  void set(ref(db, 'salon'), clean(meta));
}

/* ─────────────────────────── ÉCOUTEURS TEMPS RÉEL ────────────────────── */

export interface FirebaseCallbacks {
  onTickets: (bookings: Booking[]) => void;
  onBarbers: (barbers: Barber[]) => void;
  onMeta: (meta: Partial<SalonMeta>) => void;
}

/**
 * Attache les écouteurs onValue sur tickets/, barbers/ et salon/.
 * Retourne une fonction de désabonnement.
 */
export function subscribeFirebase(cb: FirebaseCallbacks): () => void {
  if (!db) return () => {};

  const offTickets = onValue(ref(db, 'tickets'), (snap) => {
    const val = (snap.val() ?? {}) as Record<string, Booking>;
    cb.onTickets(Object.values(val).sort((a, b) => b.createdAt - a.createdAt));
  });

  const offBarbers = onValue(ref(db, 'barbers'), (snap) => {
    const val = (snap.val() ?? {}) as Record<string, Barber>;
    cb.onBarbers(
      Object.values(val).map((b) => ({
        ...b,
        chairId: b.chairId ?? null,
        paused: b.paused ?? false,
      })),
    );
  });

  const offMeta = onValue(ref(db, 'salon'), (snap) => {
    const val = snap.val() as Partial<SalonMeta> | null;
    if (val) cb.onMeta(val);
  });

  return () => { offTickets(); offBarbers(); offMeta(); };
}
