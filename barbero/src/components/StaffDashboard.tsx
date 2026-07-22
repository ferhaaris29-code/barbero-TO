import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, LogOut, X, Check, Trash2, Clock3, Users, Banknote,
  BadgeCheck, Download, Phone, Lock, RotateCcw, BarChart3, ListOrdered,
  UserPlus, Volume2, VolumeX,
} from 'lucide-react';
import Modal from './Modal';
import StaffSettings from './StaffSettings';
import StatsHistory from './StatsHistory';
import WalkInModal from './WalkInModal';
import TicketModal from './TicketModal';
import { useSalon, fmtDA } from '../lib/store';
import type { Booking } from '../lib/types';
import { playBookingChime, ensureAudioReady } from '../lib/sound';

type Filter = 'toutes' | 'attente' | 'terminees';
type Tab = 'queue' | 'stats';

export default function StaffDashboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, resetDay, updateBooking } = useSalon();
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<Filter>('toutes');
  const [tab, setTab] = useState<Tab>('queue');
  const [showReset, setShowReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('barbero-staff-sound') !== 'off');
  const knownIds = useRef<Set<string> | null>(null);

  const toggleSound = () => {
    setSoundOn((v) => {
      localStorage.setItem('barbero-staff-sound', v ? 'off' : 'on');
      if (!v) playBookingChime(); // aperçu du son à la réactivation
      return !v;
    });
  };

  // 🔔 Alerte sonore : déclenchée dès qu'une NOUVELLE réservation arrive.
  useEffect(() => {
    const ids = new Set(state.bookings.map((b) => b.id));
    if (knownIds.current === null) {
      knownIds.current = ids; // première synchro : pas de bip
      return;
    }
    let hasNew = false;
    for (const id of ids) {
      if (!knownIds.current.has(id)) { hasNew = true; break; }
    }
    knownIds.current = ids;
    if (hasNew && authed && soundOn) playBookingChime();
  }, [state.bookings, authed, soundOn]);

  const stats = useMemo(() => {
    const attente = state.bookings.filter((b) => b.status === 'attente').length;
    const enCours = state.bookings.filter((b) => b.status === 'en_cours').length;
    const terminees = state.bookings.filter((b) => b.status === 'terminee');
    const recette = terminees.reduce(
      (sum, b) => sum + state.services.filter((s) => b.serviceIds.includes(s.id)).reduce((a, s) => a + s.price, 0),
      0,
    );
    return { attente, enCours, terminees: terminees.length, recette };
  }, [state.bookings, state.services]);

  const filtered = state.bookings
    .filter((b) =>
      filter === 'attente' ? b.status === 'attente' :
      filter === 'terminees' ? b.status === 'terminee' : true)
    .sort((a, b) => b.createdAt - a.createdAt);

  /**
   * Queue positions are recalculated on every state change (e.g. when staff
   * marks a booking as "Terminée"). The client currently in Position 2
   * (2 people remaining before their turn) is detected here.
   */
  const positionTwo = useMemo(() => {
    const waiting = state.bookings
      .filter((b) => b.status === 'attente')
      .sort((a, b) => a.createdAt - b.createdAt);
    return waiting.length >= 2 ? waiting[1] : null;
  }, [state.bookings]);


  const tryLogin = () => {
    // Geste utilisateur → débloque le contexte Web Audio (autoplay policy).
    ensureAudioReady();
    if (pin === state.pin) {
      setAuthed(true); setPin(''); setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const logout = () => { setAuthed(false); setShowSettings(false); onClose(); };

  const doReset = () => {
    resetDay();
    setShowReset(false);
    setResetDone(true);
    setTimeout(() => setResetDone(false), 4000);
  };

  if (!open) return null;

  // ── Login modal ──
  if (!authed) {
    return (
      <Modal open onClose={onClose} title="Accès Staff">
        <div className="text-center">
          <img src="/logo.png" alt="Barbero Salon" className="h-20 w-auto mx-auto mb-3" />
          <div className="mx-auto h-12 w-12 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center glow-gold">
            <Lock size={20} className="text-gold" />
          </div>
          <p className="text-muted text-sm mt-4">Entrez le code PIN pour accéder au tableau de bord.</p>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => { setPin(e.target.value); setPinError(false); }}
            onKeyDown={(e) => e.key === 'Enter' && tryLogin()}
            placeholder="••••"
            className="input-lux mt-5 text-center text-2xl tracking-[0.5em] max-w-[220px] mx-auto"
          />
          {pinError && <p className="text-ruby text-sm mt-2">Code PIN incorrect.</p>}
          <p className="text-muted/60 text-xs mt-3">(PIN de démonstration : 1234)</p>
          <button onClick={tryLogin} className="btn-gold rounded-xl px-8 py-2.5 mt-5 w-full max-w-[220px]">
            Se connecter
          </button>
        </div>
      </Modal>
    );
  }

  // ── Dashboard ──
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-obsidian/95 backdrop-blur-md"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-14 w-auto hidden sm:block" />
            <div>
            <h2 className="font-display text-2xl sm:text-3xl gold-text">Espace Staff & Admin</h2>
            <p className="text-muted text-sm mt-1 capitalize">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}Prochain ticket : <span className="text-gold-soft font-semibold">N° {state.nextTicket}</span>
            </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggleSound}
              title={soundOn ? 'Désactiver l’alerte sonore' : 'Activer l’alerte sonore'}
              aria-label={soundOn ? 'Couper le son' : 'Activer le son'}
              className={`rounded-xl border px-3 py-2 text-sm inline-flex items-center gap-2 transition-colors ${
                soundOn
                  ? 'border-emerald-glow/40 text-emerald-glow bg-emerald-glow/5 hover:bg-emerald-glow/10'
                  : 'border-line text-muted hover:border-gold/40 hover:text-cream'
              }`}
            >
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button onClick={() => setShowSettings(true)} className="btn-ghost rounded-xl px-4 py-2 text-sm inline-flex items-center gap-2">
              <Settings size={16} /> Paramètres
            </button>
            <button onClick={logout} className="btn-ghost rounded-xl px-4 py-2 text-sm inline-flex items-center gap-2">
              <LogOut size={16} /> Déconnexion
            </button>
            <button onClick={onClose} aria-label="Fermer" className="btn-ghost rounded-xl px-3 py-2 text-sm inline-flex items-center gap-2">
              <X size={16} /> Fermer
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Clock3 size={18} />} label="EN ATTENTE" value={String(stats.attente)} tone="text-gold-soft" />
          <StatCard icon={<Users size={18} />} label="EN COURS" value={String(stats.enCours)} tone="text-emerald-glow" />
          <StatCard icon={<BadgeCheck size={18} />} label="TERMINÉES" value={String(stats.terminees)} tone="text-cream" />
          <StatCard icon={<Banknote size={18} />} label="RECETTE DU JOUR" value={fmtDA(stats.recette)} tone="text-gold-soft" />
        </div>

        {/* Tabs + reset */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('queue')}
              className={`rounded-full px-4 py-1.5 text-sm border inline-flex items-center gap-1.5 transition-colors ${
                tab === 'queue'
                  ? 'border-gold/70 bg-gold/15 text-gold-soft font-semibold'
                  : 'border-line text-muted hover:border-gold/40 hover:text-cream'
              }`}
            >
              <ListOrdered size={14} /> File du jour
            </button>
            <button
              onClick={() => setTab('stats')}
              className={`rounded-full px-4 py-1.5 text-sm border inline-flex items-center gap-1.5 transition-colors ${
                tab === 'stats'
                  ? 'border-gold/70 bg-gold/15 text-gold-soft font-semibold'
                  : 'border-line text-muted hover:border-gold/40 hover:text-cream'
              }`}
            >
              <BarChart3 size={14} /> Statistiques & Historique
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowWalkIn(true)}
              className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold inline-flex items-center gap-2"
            >
              <UserPlus size={15} /> + Client Sur Place
            </button>
            <button
              onClick={() => setShowReset(true)}
              className="rounded-xl border border-ruby/50 bg-ruby/10 text-ruby px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 hover:bg-ruby/20 transition-colors glow-red"
            >
              <RotateCcw size={15} /> Réinitialiser la Journée / Clôturer la Caisse
            </button>
          </div>
        </div>

        <AnimatePresence>
          {resetDone && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-xl border border-emerald-glow/40 bg-emerald-glow/10 px-4 py-3 text-sm text-emerald-glow inline-flex items-center gap-2"
            >
              <Check size={15} /> Journée clôturée — recette remise à 0 DA et historique archivé.
            </motion.div>
          )}
        </AnimatePresence>

        {tab === 'queue' ? (
          <>
            {/* Position 2 notification panel */}
            <AnimatePresence>
              {positionTwo && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-6 card-lux !border-gold/40 p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-center glow-gold">
                      <div className="text-[9px] uppercase tracking-widest text-muted">Position</div>
                      <div className="font-display text-xl text-gold-soft leading-tight">2</div>
                    </div>
                    <div>
                      <div className="font-semibold text-cream">
                        {positionTwo.prenom} {positionTwo.nom}
                        <span className="text-muted font-normal text-sm"> · Ticket N° {positionTwo.ticketNo}</span>
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        Plus que 2 personnes avant son tour — prévenez-le à l’accueil ou par téléphone.
                      </div>
                    </div>
                  </div>
                  <a
                    href={`tel:${positionTwo.tel.replace(/\s/g, '')}`}
                    className="rounded-xl border border-gold/40 bg-gold/10 text-gold-soft px-4 py-2.5 text-xs font-semibold inline-flex items-center gap-2 hover:bg-gold/20 transition-colors"
                  >
                    <Phone size={14} /> Appeler le client
                  </a>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filters */}
            <div className="mt-6 flex flex-wrap gap-2">
              {(
                [['toutes', 'Toutes'], ['attente', 'En attente'], ['terminees', 'Terminées']] as [Filter, string][]
              ).map(([f, label]) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
                    filter === f
                      ? 'border-gold/70 bg-gold/15 text-gold-soft font-semibold'
                      : 'border-line text-muted hover:border-gold/40 hover:text-cream'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Bookings */}
            <div className="mt-5 space-y-3 pb-20">
              <AnimatePresence>
                {filtered.map((b) => (
                  <BookingCard key={b.id} booking={b} isPositionTwo={positionTwo?.id === b.id} />
                ))}
              </AnimatePresence>
              {filtered.length === 0 && (
                <p className="text-center text-muted py-14">Aucun ticket dans cette catégorie.</p>
              )}
            </div>
          </>
        ) : (
          <div className="mt-6 pb-20">
            <StatsHistory />
          </div>
        )}
      </div>

      {/* Reset confirmation */}
      <Modal open={showReset} onClose={() => setShowReset(false)} title="Clôturer la caisse ?">
        <div className="space-y-4">
          <p className="text-sm text-muted leading-relaxed">
            Cette action va :
          </p>
          <ul className="text-sm text-cream space-y-2">
            <li className="flex items-start gap-2"><Check size={15} className="text-emerald-glow mt-0.5 shrink-0" /> Archiver les <strong>{state.bookings.filter((b) => b.status === 'terminee').length} coupes terminées</strong> dans l'historique mensuel.</li>
            <li className="flex items-start gap-2"><Check size={15} className="text-emerald-glow mt-0.5 shrink-0" /> Archiver les tickets restants comme <strong>annulés</strong> ({state.bookings.filter((b) => b.status !== 'terminee').length}).</li>
            <li className="flex items-start gap-2"><Check size={15} className="text-emerald-glow mt-0.5 shrink-0" /> Remettre la <strong>recette du jour à 0 DA</strong> et vider la file d'attente.</li>
          </ul>
          <p className="text-xs text-muted">La numérotation des tickets continue (prochain : N° {state.nextTicket}).</p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowReset(false)} className="btn-ghost flex-1 rounded-xl px-4 py-2.5 text-sm">
              Annuler
            </button>
            <button
              onClick={doReset}
              className="flex-1 rounded-xl border border-ruby/60 bg-ruby/15 text-ruby px-4 py-2.5 text-sm font-bold hover:bg-ruby/25 transition-colors inline-flex items-center justify-center gap-2"
            >
              <RotateCcw size={15} /> Confirmer la clôture
            </button>
          </div>
        </div>
      </Modal>

      <StaffSettings open={showSettings} onClose={() => setShowSettings(false)} />
      <WalkInModal open={showWalkIn} onClose={() => setShowWalkIn(false)} />
    </motion.div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="card-lux p-4">
      <div className="flex items-center gap-2 text-muted text-[11px] font-semibold tracking-widest">
        <span className="text-gold">{icon}</span> {label}
      </div>
      <div className={`mt-2 font-display text-2xl ${tone}`}>{value}</div>
    </div>
  );
}

function BookingCard({ booking, isPositionTwo }: { booking: Booking; isPositionTwo?: boolean }) {
  const { state, updateBooking, deleteBooking } = useSalon();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [askBarber, setAskBarber] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const services = state.services.filter((s) => booking.serviceIds.includes(s.id));
  const total = services.reduce((a, s) => a + s.price, 0);
  const chair = booking.chairId ? state.chairs.find((c) => c.id === booking.chairId) : null;
  const activeBarbers = state.barbers.filter((b) => b.active);

  /**
   * Clôture d'une prestation : si la réservation est « Sans préférence »
   * (aucun coiffeur attribué), demande quel coiffeur l'a réalisée afin
   * d'attribuer précisément la recette et les statistiques.
   */
  const handleFinish = () => {
    if (booking.status === 'attente') {
      updateBooking(booking.id, { status: 'en_cours' });
      return;
    }
    // en_cours → terminee
    const hasBarber = !!booking.barberName || !!booking.chairId;
    if (!hasBarber && activeBarbers.length > 0) {
      setAskBarber(true);
      return;
    }
    updateBooking(booking.id, { status: 'terminee' });
  };

  const finishWithBarber = (name: string) => {
    const b = state.barbers.find((x) => x.name === name);
    updateBooking(booking.id, {
      status: 'terminee',
      barberName: name,
      chairId: booking.chairId ?? b?.chairId ?? null,
    });
    setAskBarber(false);
  };

  const STATUS: Record<Booking['status'], { label: string; cls: string }> = {
    attente: { label: 'En attente', cls: 'border-gold/40 text-gold-soft bg-gold/5' },
    en_cours: { label: 'En cours', cls: 'border-emerald-glow/40 text-emerald-glow bg-emerald-glow/5' },
    terminee: { label: 'Terminée', cls: 'border-line text-muted bg-onyx' },
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className={`card-lux p-4 sm:p-5 ${isPositionTwo ? '!border-gold/50' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-center">
            <div className="text-[9px] uppercase tracking-widest text-muted">Ticket</div>
            <div className="font-display text-xl text-gold-soft leading-tight">N° {booking.ticketNo}</div>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-cream">{booking.prenom} {booking.nom}</span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS[booking.status].cls}`}>
                {STATUS[booking.status].label}
              </span>
              {booking.groupSize && booking.groupSize > 1 && (
                <span className="rounded-full border border-sky-400/50 bg-sky-400/10 text-sky-300 px-2.5 py-0.5 text-[11px] font-semibold inline-flex items-center gap-1">
                  <Users size={11} /> Groupe ({booking.groupIndex}/{booking.groupSize})
                </span>
              )}
              {booking.profile === 'enfant' && (
                <span className="rounded-full border border-line bg-onyx text-muted px-2.5 py-0.5 text-[11px] font-semibold">
                  Enfant
                </span>
              )}
              {isPositionTwo && (
                <span className="rounded-full border border-gold/50 bg-gold/10 text-gold-soft px-2.5 py-0.5 text-[11px] font-semibold">
                  Position 2 — à prévenir
                </span>
              )}
            </div>
            <div className="mt-1.5 text-sm text-muted">
              {services.map((s) => s.name).join(' + ')} · <span className="text-gold-soft font-medium">{fmtDA(total)}</span>
              {booking.groupSize && booking.groupSize > 1 && (
                <span className="ml-2 text-xs text-sky-300/80">
                  Réservé par {booking.prenom} {booking.nom}{booking.personLabel ? ` · ${booking.personLabel}` : ''}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted">
              Arrivé à {new Date(booking.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              {' · '}
              {booking.barberName
                ? `${booking.barberName}${booking.chairId ? ` (Siège ${booking.chairId})` : ''}`
                : chair ? `Siège ${chair.id} (${chair.barber})` : 'Sans préférence'}
              {' · '}{booking.tel}
              {booking.notes && <span className="italic"> · « {booking.notes} »</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {booking.status !== 'terminee' && (
            <button
              onClick={handleFinish}
              title={booking.status === 'attente' ? 'Démarrer' : 'Marquer terminée'}
              className="rounded-lg border border-emerald-glow/40 text-emerald-glow px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-emerald-glow/10 transition-colors"
            >
              <Check size={14} />
              {booking.status === 'attente' ? 'Démarrer' : 'Marquer terminée'}
            </button>
          )}
          <a
            href={`tel:${booking.tel.replace(/\s/g, '')}`}
            className="rounded-lg border border-line text-cream px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 hover:border-gold/40 transition-colors"
          >
            <Phone size={14} /> Appeler client
          </a>
          <button
            type="button"
            onClick={() => setShowTicket(true)}
            className="rounded-lg border border-gold/40 text-gold-soft px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-gold/10 transition-colors cursor-pointer"
          >
            <Download size={14} /> Ticket
          </button>
          <button
            onClick={() => (confirmDelete ? deleteBooking(booking.id) : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              confirmDelete
                ? 'border-ruby bg-ruby/15 text-ruby'
                : 'border-ruby/40 text-ruby/80 hover:bg-ruby/10'
            }`}
          >
            <Trash2 size={14} /> {confirmDelete ? 'Confirmer ?' : 'Supprimer'}
          </button>
        </div>
      </div>

      {/* Pop-up d'attribution : quel coiffeur a réalisé cette prestation ? */}
      <Modal
        open={askBarber}
        onClose={() => setAskBarber(false)}
        title="Attribution de la prestation"
      >
        <p className="text-sm text-cream leading-relaxed">
          Ticket <span className="text-gold-soft font-semibold">N° {booking.ticketNo}</span> —{' '}
          {booking.prenom} {booking.nom} avait réservé <em className="text-muted">« Sans préférence »</em>.
        </p>
        <p className="text-sm text-muted mt-1.5 mb-4">
          Quel coiffeur a réalisé cette prestation ? (la recette et les
          statistiques lui seront attribuées)
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {activeBarbers.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => finishWithBarber(b.name)}
              className="card-lux card-lux-hover p-3.5 text-center"
            >
              <div className="font-medium text-cream text-sm">{b.name}</div>
              <div className="text-[11px] text-muted mt-0.5">
                {b.chairId ? `Siège ${b.chairId}` : 'Sans siège'}
              </div>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { updateBooking(booking.id, { status: 'terminee' }); setAskBarber(false); }}
          className="btn-ghost w-full rounded-xl px-4 py-2.5 text-sm mt-4"
        >
          Terminer sans attribution
        </button>
      </Modal>

      {/* Modale du ticket client — impression via window.print() */}
      <TicketModal booking={showTicket ? booking : null} onClose={() => setShowTicket(false)} />
    </motion.div>
  );
}
