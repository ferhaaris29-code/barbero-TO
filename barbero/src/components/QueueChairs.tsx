import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock3, Download, Phone, BadgeCheck, Ticket } from 'lucide-react';
import { useSalon, fmtDA } from '../lib/store';
import BarberChairIcon from './BarberChairIcon';
import type { Booking, Chair } from '../lib/types';
import { downloadTicket } from '../lib/ticket';
import Modal from './Modal';

type ChairStatus = 'disponible' | 'occupe' | 'pause' | 'inactif';

export default function QueueChairs() {
  const { state } = useSalon();
  const [selected, setSelected] = useState<Chair | null>(null);

  const chairBooking = useMemo(() => {
    const map = new Map<number, Booking>();
    for (const b of state.bookings) {
      if (b.status === 'en_cours' && b.chairId) map.set(b.chairId, b);
    }
    return map;
  }, [state.bookings]);

  const waitingList = state.bookings
    .filter((b) => b.status === 'attente')
    .sort((a, b) => a.createdAt - b.createdAt);
  const totalQueue = waitingList.length + state.walkIns;
  const avgDuration = 25;
  const activeChairs = Math.max(1, state.chairs.filter((c) => c.active && !c.paused).length);
  const waitMin = Math.round((totalQueue * avgDuration) / activeChairs);

  const statusOf = (c: Chair): ChairStatus =>
    !c.active ? 'inactif' : c.paused ? 'pause' : chairBooking.has(c.id) ? 'occupe' : 'disponible';

  const STYLE: Record<ChairStatus, { label: string; dot: string; ring: string; text: string }> = {
    disponible: { label: 'Disponible', dot: 'bg-emerald-glow', ring: 'border-emerald-glow/40', text: 'text-emerald-glow' },
    occupe: { label: 'Occupé', dot: 'bg-gold', ring: 'border-gold/50', text: 'text-gold-soft' },
    pause: { label: 'En Pause', dot: 'bg-amber-400', ring: 'border-amber-500/40', text: 'text-amber-400' },
    inactif: { label: 'Inactif', dot: 'bg-muted/50', ring: 'border-line', text: 'text-muted' },
  };

  return (
    <section id="coiffeurs" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 scroll-mt-16">
      <div className="text-center mb-10">
        <h2 className="font-display text-3xl sm:text-4xl gold-text">File d’attente en direct</h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-4 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-muted"
        >
          <span className="inline-flex items-center gap-2">
            <Users size={16} className="text-gold" />
            Sans réservation : <strong className="text-cream">{totalQueue} personne{totalQueue > 1 ? 's' : ''}</strong>
          </span>
          <span className="text-gold-dim">·</span>
          <span className="inline-flex items-center gap-2">
            <Clock3 size={16} className="text-gold" />
            ~<strong className="text-cream">{waitMin} min</strong> d’attente estimée
          </span>
        </motion.p>

        {/* Public ticket queue strip */}
        {waitingList.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {waitingList.map((b, i) => (
              <motion.span
                key={b.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: i * 0.05 }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                  i === 0
                    ? 'border-gold/60 bg-gold/10 text-gold-soft glow-gold'
                    : 'border-line bg-onyx/70 text-muted'
                }`}
              >
                <Ticket size={14} className={i === 0 ? 'text-gold' : ''} />
                N° {b.ticketNo}
                {i === 0 && <span className="text-[10px] uppercase tracking-widest ml-1">suivant</span>}
              </motion.span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {state.chairs.map((c, i) => {
          const st = statusOf(c);
          const s = STYLE[st];
          const b = chairBooking.get(c.id);
          return (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 200, damping: 22, delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelected(c)}
              className={`card-lux card-lux-hover ${s.ring} p-4 text-center cursor-pointer`}
            >
              <BarberChairIcon size={38} className={`mx-auto ${st === 'inactif' ? 'text-muted' : 'text-gold'}`} dimmed={st === 'inactif'} />
              <div className="mt-2 font-display text-lg text-cream">Siège {c.id}</div>
              <div className="text-sm text-muted">{c.barber !== '—' ? c.barber : 'Libre'}</div>
              <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold ${s.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${st !== 'inactif' ? 'pulse-dot' : ''}`} />
                {s.label}
              </div>
              {b && (
                <div className="mt-1.5 text-[11px] text-gold-soft font-semibold tracking-wide">
                  Ticket N° {b.ticketNo}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <ChairModal
        chair={selected}
        booking={selected ? chairBooking.get(selected.id) ?? null : null}
        status={selected ? statusOf(selected) : 'disponible'}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}

function ChairModal({
  chair, booking, status, onClose,
}: {
  chair: Chair | null;
  booking: Booking | null;
  status: ChairStatus;
  onClose: () => void;
}) {
  const { state } = useSalon();
  const services = booking ? state.services.filter((s) => booking.serviceIds.includes(s.id)) : [];
  const total = services.reduce((a, s) => a + s.price, 0);

  return (
    <Modal
      open={!!chair}
      onClose={onClose}
      title={chair ? `Siège ${chair.id} — ${chair.barber}` : ''}
    >
      {chair && (
        <div className="space-y-4">
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-semibold inline-flex items-center gap-2 ${
              status === 'occupe'
                ? 'border-gold/40 text-gold-soft bg-gold/5'
                : status === 'disponible'
                ? 'border-emerald-glow/40 text-emerald-glow bg-emerald-glow/5'
                : status === 'pause'
                ? 'border-amber-500/40 text-amber-400 bg-amber-500/5'
                : 'border-line text-muted bg-onyx'
            }`}
          >
            <BadgeCheck size={16} />
            {status === 'occupe'
              ? 'Occupé — prestation en cours'
              : status === 'disponible'
              ? 'Disponible maintenant'
              : status === 'pause'
              ? 'En pause — de retour bientôt'
              : 'Siège inactif aujourd’hui'}
          </div>

          {booking ? (
            <>
              <div className="card-lux p-4 space-y-3">
                <Row label="Ticket" value={`N° ${booking.ticketNo}`} gold />
                <Row label="Coiffeur" value={chair.barber} />
                <Row label="Prestation" value={services.map((s) => s.name).join(' + ') || '—'} />
                <Row label="Client" value={`${booking.prenom} ${booking.nom}`} />
                <Row label="Téléphone" value={booking.tel} />
                <Row label="Arrivée" value={new Date(booking.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} />
                <Row label="Total" value={fmtDA(total)} gold />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => downloadTicket(booking, state)}
                  className="btn-gold flex-1 rounded-xl px-4 py-2.5 inline-flex items-center justify-center gap-2"
                >
                  <Download size={17} /> Télécharger le Ticket
                </button>
                <a
                  href={`tel:${booking.tel.replace(/\s/g, '')}`}
                  className="btn-ghost flex-1 rounded-xl px-4 py-2.5 inline-flex items-center justify-center gap-2"
                >
                  <Phone size={17} /> Appeler client
                </a>
              </div>
            </>
          ) : (
            <p className="text-muted text-sm">
              {status === 'inactif'
                ? 'Aucun coiffeur n’est en service sur ce siège actuellement.'
                : status === 'pause'
                ? `${chair.barber} est en pause — il sera de retour très bientôt.`
                : `${chair.barber} est libre — prenez un ticket via le bouton « Réserver ».`}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted uppercase tracking-wide text-xs">{label}</span>
      <span className={`text-right font-medium ${gold ? 'text-gold-soft text-base' : 'text-cream'}`}>{value}</span>
    </div>
  );
}
