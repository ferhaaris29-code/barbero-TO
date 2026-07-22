import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Download, Scissors, Users, Loader2, Baby, User, Plus, X, BadgeCheck } from 'lucide-react';
import BarberChairIcon from './BarberChairIcon';
import html2canvas from 'html2canvas';
import Modal from './Modal';
import { useSalon, fmtDA } from '../lib/store';
import type { Booking, PersonProfile } from '../lib/types';
import { downloadTicket } from '../lib/ticket';

const STEPS = ['Prestations & Personnes', 'Coiffeur & Coordonnées'];
const MAX_GROUP = 6;

interface PersonDraft {
  profile: PersonProfile;
  serviceIds: string[];
  barberId: string | null;
}

const newPerson = (): PersonDraft => ({ profile: 'adulte', serviceIds: [], barberId: null });

export default function BookingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, addGroupBooking } = useSalon();
  const [step, setStep] = useState(0);
  const [persons, setPersons] = useState<PersonDraft[]>([newPerson()]);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [tel, setTel] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState<Booking[] | null>(null);
  const [telError, setTelError] = useState('');

  const queueAhead = state.bookings.filter((b) => b.status === 'attente').length + state.walkIns;

  /** Coiffeurs actifs (non en pause) — seuls eux apparaissent côté client. */
  const activeBarbers = state.barbers.filter((b) => b.active && !b.paused);

  /** Nombre de clients en attente pour un coiffeur donné. */
  const waitingFor = (name: string) =>
    state.bookings.filter(
      (x) =>
        x.status === 'attente' &&
        (x.barberName === name ||
          (!x.barberName && x.chairId !== null && state.chairs.find((c) => c.id === x.chairId)?.barber === name)),
    ).length;

  const total = useMemo(
    () =>
      persons.reduce(
        (sum, p) =>
          sum + state.services.filter((s) => p.serviceIds.includes(s.id)).reduce((a, s) => a + s.price, 0),
        0,
      ),
    [persons, state.services],
  );

  const addPerson = () =>
    setPersons((prev) => (prev.length >= MAX_GROUP ? prev : [...prev, newPerson()]));

  const removePerson = (i: number) =>
    setPersons((prev) => (prev.length <= 1 ? prev : prev.filter((_, k) => k !== i)));

  const patchPerson = (i: number, p: Partial<PersonDraft>) =>
    setPersons((prev) => prev.map((x, k) => (k === i ? { ...x, ...p } : x)));

  const personLabel = (i: number) => (i === 0 ? '1re personne' : `${i + 1}e personne`);

  const reset = () => {
    setStep(0); setPersons([newPerson()]);
    setNom(''); setPrenom(''); setTel(''); setNotes('');
    setDone(null); setTelError('');
  };

  const close = () => { onClose(); setTimeout(reset, 350); };

  const validTel = (t: string) => /^0[567](\s?\d{2}){4}$/.test(t.trim());

  const canNext =
    step === 0
      ? persons.every((p) => p.serviceIds.length > 0)
      : Boolean(nom.trim() && prenom.trim() && tel.trim());

  const submit = () => {
    if (!validTel(tel)) {
      setTelError('Format attendu : 06/07/05 XX XX XX XX');
      return;
    }
    const payload = persons.map((p, i) => {
      const chosen = p.barberId ? state.barbers.find((x) => x.id === p.barberId) : null;
      return {
        profile: p.profile,
        serviceIds: p.serviceIds,
        chairId: chosen?.chairId ?? null,
        barberName: chosen?.name,
        personLabel:
          persons.length > 1
            ? `Personne ${i + 1} (${p.profile === 'enfant' ? 'Enfant' : 'Adulte'})`
            : undefined,
      };
    });
    const created = addGroupBooking(
      { nom: nom.trim(), prenom: prenom.trim(), tel: tel.trim(), notes: notes.trim() },
      payload,
    );
    setDone(created);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={done ? (done.length > 1 ? 'Votre groupe est dans la file !' : 'Vous êtes dans la file !') : 'Prendre un ticket'}
      wide
    >
      {done ? (
        <ConfirmView bookings={done} onClose={close} />
      ) : (
        <>
          {/* Stepper */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 shrink-0">
                <div
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                    i === step
                      ? 'border-gold/60 text-gold-soft bg-gold/10'
                      : i < step
                      ? 'border-emerald-glow/40 text-emerald-glow bg-emerald-glow/5'
                      : 'border-line text-muted'
                  }`}
                >
                  {i < step ? <Check size={13} /> : <span>{i + 1}</span>}
                  <span className="hidden sm:inline">{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className="w-4 h-px bg-line" />}
              </div>
            ))}
          </div>

          <div className="mb-5 rounded-xl border border-gold/25 bg-gold/5 px-4 py-2.5 text-sm text-gold-soft inline-flex items-center gap-2">
            <Users size={15} />
            {queueAhead === 0
              ? 'File vide — vous passerez immédiatement !'
              : `${queueAhead} personne${queueAhead > 1 ? 's' : ''} devant vous`}
            {persons.length > 1
              ? ` · vos tickets seront les N° ${state.nextTicket} à ${state.nextTicket + persons.length - 1}`
              : ` · votre ticket sera le N° ${state.nextTicket}`}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {step === 0 && (
                <div className="space-y-6">
                  {persons.map((p, i) => (
                    <motion.div
                      key={i}
                      initial={i > 0 ? { opacity: 0, y: 16 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                      className={persons.length > 1 ? 'card-lux p-4' : ''}
                    >
                      {/* En-tête de section (visible dès 2 personnes) */}
                      {persons.length > 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                          <div className="font-medium text-cream flex items-center gap-2">
                            <span className="h-7 w-7 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center text-gold-soft text-sm font-bold">
                              {i + 1}
                            </span>
                            {personLabel(i)}
                            <span className="text-xs text-muted">· Ticket N° {state.nextTicket + i}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Profil Adulte / Enfant */}
                            <div className="flex rounded-full border border-line overflow-hidden">
                              <button
                                type="button"
                                onClick={() => patchPerson(i, { profile: 'adulte' })}
                                className={`px-3.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                                  p.profile === 'adulte' ? 'bg-gold/15 text-gold-soft' : 'text-muted hover:text-cream'
                                }`}
                              >
                                <User size={13} /> Adulte
                              </button>
                              <button
                                type="button"
                                onClick={() => patchPerson(i, { profile: 'enfant' })}
                                className={`px-3.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border-l border-line ${
                                  p.profile === 'enfant' ? 'bg-gold/15 text-gold-soft' : 'text-muted hover:text-cream'
                                }`}
                              >
                                <Baby size={13} /> Enfant
                              </button>
                            </div>
                            {i > 0 && (
                              <button
                                type="button"
                                onClick={() => removePerson(i)}
                                aria-label={`Retirer la ${personLabel(i)}`}
                                className="h-8 w-8 rounded-full border border-ruby/40 text-ruby/80 flex items-center justify-center hover:bg-ruby/10 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Prestations — cartes directes (design épuré) */}
                      <div className="grid sm:grid-cols-2 gap-3">
                        {state.services.map((s) => {
                          const on = p.serviceIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() =>
                                patchPerson(i, {
                                  serviceIds: on
                                    ? p.serviceIds.filter((x) => x !== s.id)
                                    : [...p.serviceIds, s.id],
                                })
                              }
                              className={`card-lux card-lux-hover p-4 text-left flex items-center justify-between gap-3 ${on ? '!border-gold/60 glow-gold' : ''}`}
                            >
                              <div>
                                <div className="flex items-center gap-2 font-medium text-cream">
                                  <Scissors size={15} className="text-gold" /> {s.name}
                                </div>
                                {s.description && <div className="text-xs text-muted mt-1">{s.description}</div>}
                              </div>
                              <div className="text-right">
                                <div className="text-gold-soft font-semibold">{fmtDA(s.price)}</div>
                                {on && <Check size={16} className="text-emerald-glow ml-auto mt-1" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {p.serviceIds.length === 0 && (
                        <p className="text-[11px] text-ruby mt-2">Sélectionnez au moins une prestation.</p>
                      )}

                      {persons.length > 1 && (
                        <div className="mt-3 text-right text-sm text-gold-soft font-semibold">
                          {fmtDA(state.services.filter((s) => p.serviceIds.includes(s.id)).reduce((a, s) => a + s.price, 0))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-7">
                  {/* ── Choix du coiffeur — cartes cliquables haut de gamme ── */}
                  <div>
                    <div className="font-medium text-cream mb-1">Choisissez votre coiffeur</div>
                    <p className="text-xs text-muted mb-3">
                      {persons.length > 1
                        ? 'Attribuez un coiffeur à chaque personne, ou laissez « Sans préférence » pour le groupe.'
                        : 'Sélectionnez un coiffeur disponible ou laissez « Sans préférence ».'}
                    </p>

                    {persons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPersons((prev) => prev.map((x) => ({ ...x, barberId: null })))}
                        className={`mb-4 rounded-full px-4 py-1.5 text-xs font-semibold border transition-colors ${
                          persons.every((x) => x.barberId === null)
                            ? 'border-gold/70 bg-gold/15 text-gold-soft'
                            : 'border-line text-muted hover:border-gold/40 hover:text-cream'
                        }`}
                      >
                        Sans préférence pour tout le groupe
                      </button>
                    )}

                    <div className="space-y-5">
                      {persons.map((p, i) => (
                        <div key={i}>
                          {persons.length > 1 && (
                            <div className="flex items-center gap-2 mb-2 text-sm text-cream">
                              <span className="h-6 w-6 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center text-gold-soft text-xs font-bold">
                                {i + 1}
                              </span>
                              {personLabel(i)}
                              <span className="text-xs text-muted">
                                ({p.profile === 'enfant' ? 'Enfant' : 'Adulte'} · Ticket N° {state.nextTicket + i})
                              </span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {/* Carte Sans préférence */}
                            <button
                              type="button"
                              onClick={() => patchPerson(i, { barberId: null })}
                              className={`card-lux card-lux-hover p-4 text-center ${p.barberId === null ? '!border-gold/60 glow-gold' : ''}`}
                            >
                              <BadgeCheck size={24} className="mx-auto text-gold" />
                              <div className="mt-2 text-sm font-medium text-cream">Sans préférence</div>
                              <div className="text-[11px] text-muted mt-0.5">Premier disponible</div>
                            </button>
                            {/* Cartes coiffeurs actifs */}
                            {activeBarbers.map((b) => {
                              const waiting = waitingFor(b.name);
                              const selected = p.barberId === b.id;
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => patchPerson(i, { barberId: b.id })}
                                  className={`card-lux card-lux-hover p-4 text-center ${selected ? '!border-gold/60 glow-gold' : ''}`}
                                >
                                  <BarberChairIcon size={26} className="mx-auto text-gold" />
                                  <div className="mt-2 text-sm font-semibold text-cream">{b.name}</div>
                                  {b.chairId && (
                                    <div className="text-[11px] text-muted mt-0.5">Siège {b.chairId}</div>
                                  )}
                                  <div className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold ${
                                    waiting === 0 ? 'text-emerald-glow' : 'text-gold-soft'
                                  }`}>
                                    <Users size={11} />
                                    {waiting === 0 ? 'Disponible' : `${waiting} en attente`}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    {activeBarbers.length === 0 && (
                      <p className="text-xs text-muted mt-2">
                        Aucun coiffeur actif pour le moment — votre réservation sera « Sans préférence ».
                      </p>
                    )}
                  </div>

                  <div className="divider-gold" />

                  {/* ── Formulaire de contact épuré ── */}
                  <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <div className="font-medium text-cream">Vos coordonnées</div>
                    <p className="text-xs text-muted mt-0.5">
                      {persons.length > 1
                        ? `Utilisées pour les ${persons.length} tickets du groupe.`
                        : 'Elles figurent sur votre ticket.'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-muted">Nom *</label>
                    <input className="input-lux mt-1.5" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Haddad" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-muted">Prénom *</label>
                    <input className="input-lux mt-1.5" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ex : Lyes" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs uppercase tracking-wide text-muted">Téléphone * (06/07/05 XX XX XX XX)</label>
                    <input
                      className="input-lux mt-1.5"
                      value={tel}
                      onChange={(e) => { setTel(e.target.value); setTelError(''); }}
                      placeholder="06 55 12 34 78"
                      inputMode="tel"
                    />
                    {telError && <p className="text-ruby text-xs mt-1.5">{telError}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs uppercase tracking-wide text-muted">Notes (optionnel)</label>
                    <textarea className="input-lux mt-1.5 resize-none" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Précisions sur les coupes souhaitées…" />
                  </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <div className="flex flex-wrap items-center gap-4">
              {step === 0 && (
                <button
                  type="button"
                  onClick={addPerson}
                  disabled={persons.length >= MAX_GROUP}
                  className="btn-ghost rounded-xl px-4 py-2.5 text-sm font-semibold text-gold-soft inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={15} /> Ajouter une personne
                </button>
              )}
              <div className="text-sm text-muted">
                {persons.length > 1 && <span className="mr-2 text-xs">{persons.length} personnes ·</span>}
                Total : <span className="text-gold-soft font-semibold text-base">{fmtDA(total)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              {step > 0 && (
                <button onClick={() => setStep((s) => s - 1)} className="btn-ghost rounded-xl px-5 py-2.5 text-sm">
                  Retour
                </button>
              )}
              {step < 1 ? (
                <button
                  disabled={!canNext}
                  onClick={() => setStep((s) => s + 1)}
                  className="btn-gold rounded-xl px-6 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuer →
                </button>
              ) : (
                <button
                  disabled={!canNext}
                  onClick={submit}
                  className="btn-gold rounded-xl px-6 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {persons.length > 1 ? `Confirmer la réservation (${persons.length} tickets)` : 'Confirmer la réservation'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ── Confirmation : un reçu téléchargeable par personne ── */
function ConfirmView({ bookings, onClose }: { bookings: Booking[]; onClose: () => void }) {
  const { state } = useSalon();
  const first = bookings[0];
  const ahead = state.bookings.filter(
    (b) => b.status === 'attente' && b.createdAt < first.createdAt,
  ).length + state.walkIns;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.15 }}
        className="mx-auto h-16 w-16 rounded-full bg-emerald-glow/15 border border-emerald-glow/40 flex items-center justify-center glow-green"
      >
        <Check size={30} className="text-emerald-glow" />
      </motion.div>
      <h3 className="font-display text-2xl mt-4 text-cream">Merci, {first.prenom} !</h3>
      <p className="text-muted text-sm mt-1">
        {bookings.length > 1
          ? `${bookings.length} tickets générés (N° ${bookings[0].ticketNo} à ${bookings[bookings.length - 1].ticketNo}).`
          : ahead > 0
          ? `${ahead} personne${ahead > 1 ? 's' : ''} avant vous.`
          : 'C’est votre tour dès qu’un siège se libère.'}
      </p>

      <div className={`mt-6 grid gap-5 ${bookings.length > 1 ? 'md:grid-cols-2' : ''} justify-center`}>
        {bookings.map((b) => (
          <DownloadableReceipt key={b.id} booking={b} />
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <button type="button" onClick={onClose} className="btn-ghost rounded-xl px-8 py-2.5">Fermer</button>
      </div>
    </motion.div>
  );
}

/** Reçu blanc individuel + bouton de téléchargement (html2canvas → PNG). */
function DownloadableReceipt({ booking }: { booking: Booking }) {
  const { state } = useSalon();
  const services = state.services.filter((s) => booking.serviceIds.includes(s.id));
  const total = services.reduce((a, s) => a + s.price, 0);
  const chair = booking.chairId ? state.chairs.find((c) => c.id === booking.chairId) : null;
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [dlStatus, setDlStatus] = useState('');

  const handleDownload = async () => {
    const node = ref.current;
    if (!node || downloading) return;
    setDownloading(true);
    setDlStatus('');

    const triggerAnchor = (href: string, revoke?: string) => {
      const a = document.createElement('a');
      a.href = href;
      a.download = `ticket-${booking.ticketNo}.png`;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); if (revoke) URL.revokeObjectURL(revoke); }, 4000);
    };

    try {
      const canvas = await html2canvas(node, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (doc) => {
          doc.querySelectorAll<HTMLElement>('.ticket-receipt').forEach((t) => {
            t.style.backgroundColor = '#ffffff';
            t.style.boxShadow = 'none';
            t.querySelectorAll<HTMLElement>('*').forEach((el) => {
              el.style.color = '#111111';
              el.style.borderColor = '#cccccc';
              el.style.textShadow = 'none';
              el.style.boxShadow = 'none';
              el.style.backgroundImage = 'none';
            });
          });
        },
      });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (blob) {
        const url = URL.createObjectURL(blob);
        triggerAnchor(url, url);
      } else {
        triggerAnchor(canvas.toDataURL('image/png'));
      }
      setDlStatus('Ticket téléchargé ✓');
      setTimeout(() => setDlStatus(''), 4000);
    } catch {
      try {
        await downloadTicket(booking, state);
        setDlStatus('Ticket téléchargé ✓');
        setTimeout(() => setDlStatus(''), 4000);
      } catch {
        setDlStatus('Échec du téléchargement — réessayez.');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <div ref={ref} className="ticket-receipt rounded-2xl p-6 text-left shadow-[0_10px_40px_rgba(0,0,0,0.5)] ring-1 ring-black/10">
        <div className="text-center">
          <img src="/logo.png" alt="Barbero Salon" className="h-16 w-auto mx-auto mb-2 drop-shadow-sm" />
          <div className="font-display text-xl tracking-wide text-zinc-900">BARBERO SALON</div>
          <div className="text-[11px] text-zinc-800 uppercase tracking-[0.25em] mt-0.5">Tizi Ouzou</div>
          <div className="text-[11px] text-zinc-800 mt-0.5">Tél : 05 49 45 20 36</div>
        </div>
        <div className="my-4 border-t border-dashed border-zinc-400" />
        <div className="text-center">
          <div className="text-[11px] text-zinc-800 uppercase tracking-[0.3em]">Votre numéro</div>
          <div className="font-display text-5xl mt-1 text-zinc-900">N° {booking.ticketNo}</div>
          {booking.groupSize && booking.groupSize > 1 && (
            <div className="text-[11px] text-zinc-800 mt-1">
              Groupe ({booking.groupIndex}/{booking.groupSize}) · {booking.profile === 'enfant' ? 'Enfant' : 'Adulte'}
            </div>
          )}
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <TicketRow l="Client" v={`${booking.prenom} ${booking.nom}`} />
          {booking.groupSize && booking.groupSize > 1 && booking.personLabel && (
            <TicketRow l="Pour" v={booking.personLabel} />
          )}
          <TicketRow l="Arrivée" v={new Date(booking.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} />
          <TicketRow
            l="Coiffeur"
            v={
              booking.barberName
                ? `${booking.barberName}${chair ? ` — Siège ${chair.id}` : ''}`
                : chair
                ? `Siège ${chair.id} — ${chair.barber}`
                : 'Sans préférence'
            }
          />
        </div>
        <div className="my-4 border-t border-dashed border-zinc-400" />
        <div className="space-y-1.5 text-sm">
          {services.map((s) => <TicketRow key={s.id} l={s.name} v={fmtDA(s.price)} />)}
        </div>
        <div className="my-4 border-t border-dashed border-zinc-400" />
        <div className="flex justify-between font-bold text-lg">
          <span className="text-zinc-900">TOTAL</span>
          <span className="text-zinc-900">{fmtDA(total)}</span>
        </div>
        <p className="mt-4 text-center text-[11px] italic text-zinc-700">
          Merci de votre confiance — présentez ce ticket à votre arrivée
        </p>
      </div>

      {dlStatus && <p className="mt-3 text-sm text-emerald-glow font-medium">{dlStatus}</p>}
      <button
        type="button"
        onClick={handleDownload}
        className="btn-gold mt-3 w-full rounded-xl px-6 py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer"
      >
        {downloading ? (
          <><Loader2 size={17} className="animate-spin" /> Génération…</>
        ) : (
          <><Download size={17} /> Télécharger le Ticket N° {booking.ticketNo}</>
        )}
      </button>
    </div>
  );
}

function TicketRow({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-zinc-800">{l}</span>
      <span className="text-zinc-900 font-semibold text-right">{v}</span>
    </div>
  );
}
