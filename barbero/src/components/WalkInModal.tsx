import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check, Download, Scissors, BadgeCheck, Printer, Loader2, UserPlus,
} from 'lucide-react';
import BarberChairIcon from './BarberChairIcon';
import html2canvas from 'html2canvas';
import Modal from './Modal';
import { useSalon, fmtDA } from '../lib/store';
import type { Booking } from '../lib/types';
import { downloadTicket, printTicket } from '../lib/ticket';

/**
 * Réservation Sur Place (staff) :
 * formulaire rapide → ticket auto-numéroté → téléchargement / impression.
 */
export default function WalkInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, addBooking } = useSalon();
  const [nom, setNom] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [done, setDone] = useState<Booking | null>(null);

  const activeBarbers = state.barbers.filter((b) => b.active && !b.paused);

  const waitingFor = (name: string) =>
    state.bookings.filter(
      (x) =>
        x.status === 'attente' &&
        (x.barberName === name ||
          (!x.barberName && x.chairId !== null && state.chairs.find((c) => c.id === x.chairId)?.barber === name)),
    ).length;

  const reset = () => {
    setNom(''); setServiceIds([]); setBarberId(null); setDone(null);
  };
  const close = () => { onClose(); setTimeout(reset, 350); };

  const canSubmit = nom.trim().length > 0 && serviceIds.length > 0;

  const submit = () => {
    if (!canSubmit) return;
    const chosen = barberId ? state.barbers.find((x) => x.id === barberId) : null;
    const b = addBooking({
      nom: nom.trim(),
      prenom: '',
      tel: '—',
      notes: 'Client sur place',
      serviceIds,
      chairId: chosen?.chairId ?? null,
      barberName: chosen?.name,
    });
    setDone(b);
  };

  const total = state.services
    .filter((s) => serviceIds.includes(s.id))
    .reduce((a, s) => a + s.price, 0);

  return (
    <Modal
      open={open}
      onClose={close}
      title={done ? `Ticket N° ${done.ticketNo} généré` : 'Client Sur Place'}
      wide
    >
      {done ? (
        <WalkInTicket booking={done} onClose={close} />
      ) : (
        <div className="space-y-6">
          {/* Nom du client */}
          <div>
            <label className="text-xs uppercase tracking-wide text-muted">Nom du client *</label>
            <input
              className="input-lux mt-1.5"
              value={nom}
              autoFocus
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex : Haddad Lyes"
            />
          </div>

          {/* Prestation */}
          <div>
            <label className="text-xs uppercase tracking-wide text-muted">Prestation / Coupe *</label>
            <div className="mt-2 grid sm:grid-cols-2 gap-3">
              {state.services.map((s) => {
                const on = serviceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setServiceIds((ids) => on ? ids.filter((x) => x !== s.id) : [...ids, s.id])}
                    className={`card-lux card-lux-hover p-3.5 text-left flex items-center justify-between gap-3 ${on ? '!border-gold/60 glow-gold' : ''}`}
                  >
                    <div className="flex items-center gap-2 font-medium text-cream text-sm">
                      <Scissors size={14} className="text-gold" /> {s.name}
                    </div>
                    <div className="text-right">
                      <span className="text-gold-soft font-semibold text-sm">{fmtDA(s.price)}</span>
                      {on && <Check size={15} className="text-emerald-glow ml-auto mt-0.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coiffeur — avec file d'attente individuelle */}
          <div>
            <label className="text-xs uppercase tracking-wide text-muted">Coiffeur</label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setBarberId(null)}
                className={`card-lux card-lux-hover p-3.5 text-center ${barberId === null ? '!border-gold/60 glow-gold' : ''}`}
              >
                <BadgeCheck size={22} className="mx-auto text-gold" />
                <div className="mt-1.5 text-xs font-medium text-cream">Sans préférence</div>
              </button>
              {activeBarbers.map((b) => {
                const waiting = waitingFor(b.name);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBarberId(b.id)}
                    className={`card-lux p-3.5 text-center card-lux-hover ${barberId === b.id ? '!border-gold/60 glow-gold' : ''}`}
                  >
                    <BarberChairIcon size={28} className="mx-auto text-gold" />
                    <div className="mt-1.5 text-xs font-medium text-cream">{b.name}</div>
                    <div className="text-[11px] text-muted">
                      {b.chairId ? `Siège ${b.chairId}` : 'Sans siège'} · {waiting} en attente
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <div className="text-sm text-muted">
              Total : <span className="text-gold-soft font-semibold text-base">{fmtDA(total)}</span>
              <span className="ml-3 text-xs">Ticket : <span className="text-gold-soft font-semibold">N° {state.nextTicket}</span></span>
            </div>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className="btn-gold rounded-xl px-6 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <UserPlus size={16} /> Valider & Générer le ticket
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function WalkInTicket({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { state } = useSalon();
  const services = state.services.filter((s) => booking.serviceIds.includes(s.id));
  const total = services.reduce((a, s) => a + s.price, 0);
  const chair = booking.chairId ? state.chairs.find((c) => c.id === booking.chairId) : null;

  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [dlStatus, setDlStatus] = useState('');

  const handleDownload = async () => {
    const node = ticketRef.current;
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
          const t = doc.querySelector('.ticket-receipt-staff') as HTMLElement | null;
          if (!t) return;
          t.style.backgroundColor = '#ffffff';
          t.style.boxShadow = 'none';
          t.querySelectorAll<HTMLElement>('*').forEach((el) => {
            el.style.color = '#111111';
            el.style.borderColor = '#cccccc';
            el.style.textShadow = 'none';
            el.style.boxShadow = 'none';
            el.style.backgroundImage = 'none';
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
        className="mx-auto h-14 w-14 rounded-full bg-emerald-glow/15 border border-emerald-glow/40 flex items-center justify-center glow-green"
      >
        <Check size={26} className="text-emerald-glow" />
      </motion.div>
      <p className="text-muted text-sm mt-3">Client ajouté à la file d’attente.</p>

      {/* Ticket blanc — texte noir forcé */}
      <div
        ref={ticketRef}
        className="ticket-receipt ticket-receipt-staff mx-auto mt-5 max-w-sm rounded-2xl p-6 text-left shadow-[0_10px_40px_rgba(0,0,0,0.5)] ring-1 ring-black/10"
      >
        <div className="text-center">
          <img src="/logo.png" alt="Barbero Salon" className="h-14 w-auto mx-auto mb-2" />
          <div className="font-display text-xl tracking-wide">BARBERO SALON</div>
          <div className="text-[11px] uppercase tracking-[0.25em] mt-0.5">Tizi Ouzou</div>
          <div className="text-[11px] mt-0.5">Tél : 05 49 45 20 36</div>
        </div>
        <div className="my-4 border-t border-dashed" />
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-[0.3em]">Numéro de passage</div>
          <div className="font-display text-5xl mt-1">N° {booking.ticketNo}</div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <Row l="Client" v={booking.nom} />
          <Row l="Arrivée" v={new Date(booking.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} />
          <Row l="Siège" v={chair ? `Siège ${chair.id} — ${chair.barber}` : 'Sans préférence'} />
        </div>
        <div className="my-4 border-t border-dashed" />
        <div className="space-y-1.5 text-sm">
          {services.map((s) => <Row key={s.id} l={s.name} v={fmtDA(s.price)} />)}
        </div>
        <div className="my-4 border-t border-dashed" />
        <div className="flex justify-between font-bold text-lg">
          <span>TOTAL</span>
          <span>{fmtDA(total)}</span>
        </div>
        <p className="mt-4 text-center text-[11px] italic">
          Merci de votre confiance — présentez ce ticket à votre arrivée
        </p>
      </div>

      {dlStatus && <p className="mt-4 text-sm text-emerald-glow font-medium">{dlStatus}</p>}

      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="btn-gold rounded-xl px-6 py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          {downloading ? (
            <><Loader2 size={17} className="animate-spin" /> Génération…</>
          ) : (
            <><Download size={17} /> Télécharger le Ticket</>
          )}
        </button>
        <button
          type="button"
          onClick={() => printTicket(booking, state)}
          className="btn-ghost rounded-xl px-6 py-2.5 inline-flex items-center justify-center gap-2"
        >
          <Printer size={17} /> Imprimer
        </button>
        <button type="button" onClick={onClose} className="btn-ghost rounded-xl px-6 py-2.5">
          Fermer
        </button>
      </div>
    </motion.div>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{l}</span>
      <span className="font-semibold text-right">{v}</span>
    </div>
  );
}
