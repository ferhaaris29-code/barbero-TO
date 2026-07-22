import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  ArchiveEntry,
  Barber,
  Booking,
  Chair,
  GalleryCategory,
  GalleryPhoto,
  PresenceEvent,
  SalonState,
  Service,
} from './types';
import { loadSalonState, saveSalonState, subscribeSalonState } from './firebase';
import {
  isFirebaseEnabled, subscribeFirebase,
  fbPushTicket, fbUpdateTicket, fbRemoveTicket, fbSetTickets,
  fbSetBarbers, fbSetMeta,
} from '../firebase';

const uid = () => Math.random().toString(36).slice(2, 9);

/** Dérive les 6 sièges physiques à partir de la liste des coiffeurs actifs. */
export function chairsFromBarbers(barbers: Barber[]): Chair[] {
  return Array.from({ length: 6 }, (_, i) => {
    const id = i + 1;
    const b = barbers.find((x) => x.active && x.chairId === id);
    return { id, barber: b ? b.name : '—', active: !!b, paused: !!b?.paused };
  });
}

export const DEFAULT_HERO = '/gallery/hero.jpg';

const DEFAULT_STATE: SalonState = {
  open: true,
  hours: '09:00 – 19:30',
  pin: '1234',
  heroImage: '',
  announcement: { text: '', enabled: false },
  walkIns: 0,
  nextTicket: 1,
  services: [
    { id: 's1', name: 'Coupe Classique', price: 500, description: 'Coupe aux ciseaux + finitions tondeuse' },
    { id: 's2', name: 'Dégradé / Taper Fade', price: 700, description: 'Dégradé précis + contours nets' },
    { id: 's3', name: 'Barbe & Contours', price: 400, description: 'Taille de barbe + rasage des contours' },
    { id: 's4', name: 'Coupe Classique + Barbe', price: 800, description: 'Coupe complète + taille de barbe' },
    { id: 's5', name: 'Soin Visage Premium', price: 1200, description: 'Nettoyage + serviette chaude + hydratation' },
    { id: 's6', name: 'Forfait VIP Complet', price: 2500, description: 'Coupe + barbe + soin visage complet' },
    { id: 's7', name: 'Coupe Enfant', price: 350, description: 'Coupe douce pour les petits (−12 ans)' },
  ],
  barbers: [
    { id: 'b1', name: 'Karim', active: true, paused: false, chairId: 1 },
    { id: 'b2', name: 'Amir', active: true, paused: false, chairId: 2 },
    { id: 'b3', name: 'Sofiane', active: true, paused: false, chairId: 3 },
    { id: 'b4', name: 'Mehdi', active: true, paused: false, chairId: 4 },
    { id: 'b5', name: 'Yassine', active: true, paused: false, chairId: 5 },
    { id: 'b6', name: 'Nassim', active: false, paused: false, chairId: null },
  ],
  chairs: [
    { id: 1, barber: 'Karim', active: true, paused: false },
    { id: 2, barber: 'Amir', active: true, paused: false },
    { id: 3, barber: 'Sofiane', active: true, paused: false },
    { id: 4, barber: 'Mehdi', active: true, paused: false },
    { id: 5, barber: 'Yassine', active: true, paused: false },
    { id: 6, barber: '—', active: false, paused: false },
  ],
  // Real data only: queue, history and stats all start EMPTY.
  bookings: [],
  archive: [],
  presence: [],
  categories: [
    { id: 'c1', name: 'Dégradés / Taper' },
    { id: 'c2', name: 'Barbe & Contours' },
    { id: 'c3', name: 'Soins Visage' },
    { id: 'c4', name: 'VIP / Ambiance' },
  ],
  photos: [
    { id: 'p1', url: '/gallery/fade1.jpg', categoryId: 'c1', caption: 'Taper fade précision' },
    { id: 'p2', url: '/gallery/fade2.jpg', categoryId: 'c1', caption: 'Dégradé bas net' },
    { id: 'p3', url: '/gallery/beard1.jpg', categoryId: 'c2', caption: 'Rasage au coupe-chou' },
    { id: 'p4', url: '/gallery/beard2.jpg', categoryId: 'c2', caption: 'Sculpture de barbe' },
    { id: 'p5', url: '/gallery/soin1.jpg', categoryId: 'c3', caption: 'Serviette chaude' },
    { id: 'p6', url: '/gallery/soin2.jpg', categoryId: 'c3', caption: 'Soin visage premium' },
    { id: 'p7', url: '/gallery/vip1.jpg', categoryId: 'c4', caption: 'Fauteuil signature' },
    { id: 'p8', url: '/gallery/vip2.jpg', categoryId: 'c4', caption: 'Outils du maître' },
  ],
};

interface SalonContextValue {
  state: SalonState;
  setOpen: (open: boolean) => void;
  setHours: (h: string) => void;
  setPin: (pin: string) => void;
  setHeroImage: (url: string) => void;
  setAnnouncement: (a: { text: string; enabled: boolean }) => void;
  setWalkIns: (n: number) => void;
  addBooking: (b: Omit<Booking, 'id' | 'ticketNo' | 'status' | 'createdAt'>) => Booking;
  /**
   * Réservation multi-personnes : crée N tickets individuels CONSÉCUTIFS
   * (même groupId, mêmes coordonnées de contact) — un par personne.
   * Chaque ticket est poussé séparément dans Firebase avec son propre id.
   */
  addGroupBooking: (
    contact: { nom: string; prenom: string; tel: string; notes: string },
    persons: {
      profile: import('./types').PersonProfile;
      serviceIds: string[];
      chairId: number | null;
      barberName?: string;
      personLabel?: string;
    }[],
  ) => Booking[];
  updateBooking: (id: string, patch: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;
  /** Clôture de caisse : archive the day, reset revenue to 0 DA and ticket counter to N° 1. */
  resetDay: () => void;
  addService: (s: Omit<Service, 'id'>) => void;
  updateService: (id: string, patch: Partial<Service>) => void;
  deleteService: (id: string) => void;
  updateChair: (id: number, patch: Partial<Chair>) => void;
  /** ── Gestion dynamique des coiffeurs ── */
  addBarber: (name: string) => void;
  renameBarber: (id: string, name: string) => void;
  deleteBarber: (id: string) => void;
  /**
   * Passe un coiffeur en Actif, horodaté. chairId optionnel :
   * null = actif SANS siège (tous occupés) — le statut Présent est
   * indépendant de l'assignation d'un siège physique.
   */
  activateBarber: (id: string, chairId: number | null) => void;
  /** Passe un coiffeur en Inactif — libère immédiatement son siège, horodaté. */
  deactivateBarber: (id: string) => void;
  /**
   * (Ré)attribue un siège à un coiffeur actif. Si le siège est occupé par
   * un autre coiffeur, les sièges sont échangés (l'autre récupère l'ancien
   * siège, ou passe « sans siège »). chairId = null → libère le siège.
   */
  assignChair: (barberId: string, chairId: number | null) => void;
  /** Bascule En Pause (conserve le siège mais indisponible), horodaté. */
  togglePauseBarber: (id: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (id: string) => void;
  addPhoto: (p: Omit<GalleryPhoto, 'id'>) => void;
  deletePhoto: (id: string) => void;
}

const SalonContext = createContext<SalonContextValue | null>(null);

export function SalonProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SalonState>(() => {
    const loaded = loadSalonState();
    if (!loaded) return DEFAULT_STATE;
    // Migration douce : garantit la présence des nouveaux champs.
    const merged: SalonState = {
      ...DEFAULT_STATE,
      ...loaded,
      presence: loaded.presence ?? [],
      announcement: loaded.announcement ?? { text: '', enabled: false },
    };
    if (!loaded.barbers || loaded.barbers.length === 0) {
      // Migration depuis l'ancien modèle « chairs » → liste de coiffeurs.
      merged.barbers = (loaded.chairs ?? DEFAULT_STATE.chairs)
        .filter((c) => c.barber && c.barber !== '—')
        .map((c) => ({ id: uid(), name: c.barber, active: c.active, paused: false, chairId: c.active ? c.id : null }));
    }
    merged.barbers = merged.barbers.map((b) => ({ ...b, paused: b.paused ?? false }));
    merged.chairs = chairsFromBarbers(merged.barbers);
    return merged;
  });
  const remote = useRef(false);

  // ── Adaptateur local (multi-onglets) ──
  useEffect(() => subscribeSalonState((s) => { remote.current = true; setState(s); }), []);

  // ── Écouteurs Firebase temps réel : tickets/, barbers/, salon/ ──
  useEffect(() => {
    if (!isFirebaseEnabled()) return;
    return subscribeFirebase({
      onTickets: (bookings) => {
        remote.current = true;
        setState((s) => ({ ...s, bookings }));
      },
      onBarbers: (barbers) => {
        remote.current = true;
        setState((s) => ({ ...s, barbers, chairs: chairsFromBarbers(barbers) }));
      },
      onMeta: (meta) => {
        remote.current = true;
        setState((s) => ({ ...s, ...meta }));
      },
    });
  }, []);

  useEffect(() => {
    if (remote.current) { remote.current = false; return; }
    saveSalonState(state);
    // Réglages salon synchronisés vers Firebase (tickets & barbers sont
    // poussés au fil des actions via push/update/remove).
    if (isFirebaseEnabled()) {
      const { bookings: _b, barbers: _ba, chairs: _c, ...meta } = state;
      fbSetMeta(meta);
    }
  }, [state]);

  const patch = useCallback((p: Partial<SalonState> | ((s: SalonState) => Partial<SalonState>)) => {
    setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) }));
  }, []);

  const value: SalonContextValue = {
    state,
    setOpen: (open) =>
      patch((s) => {
        if (open) return { open };
        // Salon fermé → tous les coiffeurs passent automatiquement en Inactif,
        // leurs sièges sont libérés, avec horodatage de départ.
        const now = Date.now();
        const departures: PresenceEvent[] = s.barbers
          .filter((b) => b.active)
          .map((b) => ({
            id: uid(), chairId: b.chairId ?? 0, barber: b.name,
            action: 'inactif' as const, at: now,
          }));
        const barbers = s.barbers.map((b) => ({ ...b, active: false, paused: false, chairId: null }));
        fbSetBarbers(barbers);
        return {
          open,
          barbers,
          chairs: chairsFromBarbers(barbers),
          presence: [...departures, ...s.presence],
        };
      }),
    setHours: (hours) => patch({ hours }),
    setPin: (pin) => patch({ pin }),
    setHeroImage: (heroImage) => patch({ heroImage }),
    setAnnouncement: (announcement) => patch({ announcement }),
    setWalkIns: (walkIns) => patch({ walkIns: Math.max(0, walkIns) }),
    addBooking: (b) => {
      const draft: Booking = {
        ...b, id: uid(), ticketNo: state.nextTicket, status: 'attente', createdAt: Date.now(),
      };
      // Push Firebase : l'id devient la clé du nœud tickets/ (updates/removes fiables).
      const id = fbPushTicket(draft);
      const booking: Booking = { ...draft, id };
      patch((s) => ({
        bookings: [{ ...booking, ticketNo: s.nextTicket }, ...s.bookings],
        nextTicket: s.nextTicket + 1,
      }));
      return booking;
    },
    addGroupBooking: (contact, persons) => {
      const groupId = uid();
      const base = Date.now();
      const created: Booking[] = persons.map((p, i) => {
        const draft: Booking = {
          id: uid(),
          ticketNo: state.nextTicket + i, // numéros consécutifs (ex. N°12, N°13)
          nom: contact.nom,
          prenom: contact.prenom,
          tel: contact.tel,
          notes: contact.notes,
          serviceIds: p.serviceIds,
          chairId: p.chairId,
          barberName: p.barberName,
          status: 'attente',
          createdAt: base + i, // préserve l'ordre dans la file
          groupId,
          groupIndex: i + 1,
          groupSize: persons.length,
          profile: p.profile,
          personLabel: p.personLabel,
        };
        // Chaque membre = un ticket distinct dans Firebase avec son propre id.
        const id = fbPushTicket(draft);
        return { ...draft, id };
      });
      patch((s) => ({
        bookings: [
          ...created.map((b, i) => ({ ...b, ticketNo: s.nextTicket + i })).reverse(),
          ...s.bookings,
        ],
        nextTicket: s.nextTicket + persons.length,
      }));
      return created;
    },
    updateBooking: (id, p) => {
      fbUpdateTicket(id, p);
      patch((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? { ...b, ...p } : b)) }));
    },
    deleteBooking: (id) => {
      fbRemoveTicket(id);
      patch((s) => ({ bookings: s.bookings.filter((b) => b.id !== id) }));
    },
    resetDay: () =>
      patch((s) => {
        const now = Date.now();
        const entries: ArchiveEntry[] = s.bookings.map((b) => {
          const services = s.services.filter((sv) => b.serviceIds.includes(sv.id));
          const chair = b.chairId ? s.chairs.find((c) => c.id === b.chairId) : null;
          const done = b.status === 'terminee';
          return {
            id: b.id,
            ticketNo: b.ticketNo,
            nom: b.nom,
            prenom: b.prenom,
            tel: b.tel,
            chairId: b.chairId,
            barber: b.barberName ?? (chair ? chair.barber : 'Sans préférence'),
            services: services.map((sv) => sv.name),
            total: done ? services.reduce((a, sv) => a + sv.price, 0) : 0,
            status: done ? 'terminee' : 'annulee',
            createdAt: b.createdAt,
            archivedAt: now,
          };
        });
        fbSetTickets([]); // vide la file côté Firebase
        return {
          archive: [...entries, ...s.archive],
          bookings: [],
          walkIns: 0,
          nextTicket: 1, // counter restarts at Ticket N° 1 for the next session
        };
      }),
    addService: (sv) => patch((s) => ({ services: [...s.services, { ...sv, id: uid() }] })),
    updateService: (id, p) =>
      patch((s) => ({ services: s.services.map((sv) => (sv.id === id ? { ...sv, ...p } : sv)) })),
    deleteService: (id) =>
      patch((s) => ({ services: s.services.filter((sv) => sv.id !== id) })),
    updateChair: (id, p) =>
      patch((s) => ({ chairs: s.chairs.map((c) => (c.id === id ? { ...c, ...p } : c)) })),
    addBarber: (name) =>
      patch((s) => {
        const barbers = [...s.barbers, { id: uid(), name: name.trim(), active: false, paused: false, chairId: null }];
        fbSetBarbers(barbers);
        return { barbers };
      }),
    togglePauseBarber: (id) =>
      patch((s) => {
        const barber = s.barbers.find((b) => b.id === id);
        if (!barber || !barber.active) return {};
        const nextPaused = !barber.paused;
        const barbers = s.barbers.map((b) =>
          b.id === id ? { ...b, paused: nextPaused } : b,
        );
        fbSetBarbers(barbers);
        const event: PresenceEvent = {
          id: uid(),
          chairId: barber.chairId ?? 0,
          barber: barber.name,
          action: nextPaused ? 'pause' : 'actif',
          at: Date.now(),
        };
        return {
          barbers,
          chairs: chairsFromBarbers(barbers),
          presence: [event, ...s.presence].slice(0, 2000),
        };
      }),
    renameBarber: (id, name) =>
      patch((s) => {
        const barbers = s.barbers.map((b) => (b.id === id ? { ...b, name } : b));
        fbSetBarbers(barbers);
        return { barbers, chairs: chairsFromBarbers(barbers) };
      }),
    deleteBarber: (id) =>
      patch((s) => {
        const barbers = s.barbers.filter((b) => b.id !== id);
        fbSetBarbers(barbers);
        return { barbers, chairs: chairsFromBarbers(barbers) };
      }),
    activateBarber: (id, chairId) =>
      patch((s) => {
        const barber = s.barbers.find((b) => b.id === id);
        if (!barber) return {};
        // Siège demandé déjà occupé → le coiffeur devient Actif sans siège.
        const chairTaken = chairId !== null &&
          s.barbers.some((b) => b.active && b.chairId === chairId && b.id !== id);
        const finalChair = chairTaken ? null : chairId;
        const barbers = s.barbers.map((b) =>
          b.id === id ? { ...b, active: true, paused: false, chairId: finalChair } : b,
        );
        fbSetBarbers(barbers);
        const event: PresenceEvent = {
          id: uid(), chairId: finalChair ?? 0, barber: barber.name, action: 'actif', at: Date.now(),
        };
        return {
          barbers,
          chairs: chairsFromBarbers(barbers),
          presence: [event, ...s.presence].slice(0, 2000),
        };
      }),
    assignChair: (barberId, chairId) =>
      patch((s) => {
        const barber = s.barbers.find((b) => b.id === barberId);
        if (!barber || !barber.active) return {};
        const previousChair = barber.chairId;
        let barbers = s.barbers;
        if (chairId !== null) {
          // Échange : l'occupant actuel du siège cible récupère l'ancien siège
          // du coiffeur déplacé (ou passe « sans siège »).
          const occupant = s.barbers.find(
            (b) => b.active && b.chairId === chairId && b.id !== barberId,
          );
          barbers = s.barbers.map((b) => {
            if (b.id === barberId) return { ...b, chairId };
            if (occupant && b.id === occupant.id) return { ...b, chairId: previousChair };
            return b;
          });
        } else {
          barbers = s.barbers.map((b) =>
            b.id === barberId ? { ...b, chairId: null } : b,
          );
        }
        fbSetBarbers(barbers);
        return { barbers, chairs: chairsFromBarbers(barbers) };
      }),
    deactivateBarber: (id) =>
      patch((s) => {
        const barber = s.barbers.find((b) => b.id === id);
        if (!barber) return {};
        const freedChair = barber.chairId ?? 0;
        const barbers = s.barbers.map((b) =>
          b.id === id ? { ...b, active: false, paused: false, chairId: null } : b,
        );
        fbSetBarbers(barbers);
        const event: PresenceEvent = {
          id: uid(), chairId: freedChair, barber: barber.name, action: 'inactif', at: Date.now(),
        };
        return {
          barbers,
          chairs: chairsFromBarbers(barbers),
          presence: [event, ...s.presence].slice(0, 2000),
        };
      }),
    addCategory: (name) =>
      patch((s) => ({ categories: [...s.categories, { id: uid(), name }] })),
    deleteCategory: (id) =>
      patch((s) => ({
        categories: s.categories.filter((c) => c.id !== id),
        photos: s.photos.filter((p) => p.categoryId !== id),
      })),
    addPhoto: (p) => patch((s) => ({ photos: [{ ...p, id: uid() }, ...s.photos] })),
    deletePhoto: (id) => patch((s) => ({ photos: s.photos.filter((p) => p.id !== id) })),
  };

  return <SalonContext.Provider value={value}>{children}</SalonContext.Provider>;
}

export function useSalon(): SalonContextValue {
  const ctx = useContext(SalonContext);
  if (!ctx) throw new Error('useSalon must be used within SalonProvider');
  return ctx;
}

export const fmtDA = (n: number) => n.toLocaleString('fr-DZ') + ' DA';
