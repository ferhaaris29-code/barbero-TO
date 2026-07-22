export interface Service {
  id: string;
  name: string;
  price: number; // DA
  description?: string; // ex : "Shampoing + Soin + Coiffage"
}

export interface Chair {
  id: number; // 1..6 — siège physique
  barber: string; // nom du coiffeur actif assigné ('—' si libre)
  active: boolean; // true = un coiffeur actif occupe ce siège
  paused: boolean; // true = le coiffeur assigné est en pause
}

/**
 * Coiffeur — liste illimitée. Le statut « Actif/Présent » est indépendant
 * de l'assignation d'un siège physique : un coiffeur peut être Actif sans
 * siège (chairId = null) si les 6 sièges sont occupés, et les sièges
 * peuvent être réattribués / échangés à tout moment.
 */
export interface Barber {
  id: string;
  name: string;
  active: boolean; // présent au salon (indépendant du siège)
  paused: boolean; // En Pause : conserve son siège mais indisponible à la réservation
  chairId: number | null; // siège physique occupé (null = actif sans siège)
}

/** Bannière d'annonce flash affichée en haut de la page publique. */
export interface Announcement {
  text: string;
  enabled: boolean;
}

/** Horodatage d'un changement de statut coiffeur (arrivée / départ). */
export interface PresenceEvent {
  id: string;
  chairId: number;
  barber: string; // nom au moment de l'événement
  action: 'actif' | 'inactif' | 'pause';
  at: number; // timestamp exact
}

export type BookingStatus = 'attente' | 'en_cours' | 'terminee';
export type ArchiveStatus = BookingStatus | 'annulee';

/** Profil d'une personne dans une réservation (tarification / affichage). */
export type PersonProfile = 'adulte' | 'enfant';

export interface Booking {
  id: string;
  ticketNo: number; // sequential #1, #2, #3…
  nom: string;
  prenom: string;
  tel: string;
  notes: string;
  serviceIds: string[];
  chairId: number | null; // null = sans préférence
  /** Coiffeur attribué à la clôture d'une prestation « Sans préférence ». */
  barberName?: string;
  status: BookingStatus;
  createdAt: number;
  /* ── Réservation multi-personnes (groupe / famille) ── */
  /** Identifiant commun à tous les tickets du même groupe. */
  groupId?: string;
  /** Position dans le groupe (1-basé) et taille totale du groupe. */
  groupIndex?: number;
  groupSize?: number;
  /** Profil de la personne : adulte ou enfant. */
  profile?: PersonProfile;
  /** Libellé optionnel de la personne (ex. « Enfant 1 »). */
  personLabel?: string;
}

/** Snapshot stored in the monthly history when a day is closed. */
export interface ArchiveEntry {
  id: string;
  ticketNo: number;
  nom: string;
  prenom: string;
  tel: string;
  chairId: number | null;
  barber: string; // snapshot of the barber name at archive time
  services: string[]; // snapshot of service names
  total: number; // snapshot of total DA
  status: ArchiveStatus;
  createdAt: number;
  archivedAt: number;
}

export interface GalleryCategory {
  id: string;
  name: string;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  categoryId: string;
  caption?: string;
}

export interface SalonState {
  open: boolean;
  hours: string;
  pin: string;
  /** Custom hero background (Base64 data-URL or path). Empty = default image. */
  heroImage: string;
  announcement: Announcement;
  walkIns: number;
  nextTicket: number; // auto-increment counter
  services: Service[];
  barbers: Barber[]; // liste dynamique illimitée de coiffeurs
  chairs: Chair[]; // 6 sièges physiques (dérivés des coiffeurs actifs)
  bookings: Booking[]; // live queue of the current day/session
  archive: ArchiveEntry[]; // full monthly history
  presence: PresenceEvent[]; // historique de présence des coiffeurs
  categories: GalleryCategory[];
  photos: GalleryPhoto[];
}
