import { Printer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSalon, fmtDA } from '../lib/store';
import type { Booking } from '../lib/types';

/**
 * Modale du ticket client (Staff) :
 * s'ouvre au clic sur « Ticket » dans la file du jour, affiche le reçu blanc
 * complet (N°, nom, prestations, tarif) et propose « Imprimer / Télécharger »
 * via window.print() — seule la zone du ticket est imprimée grâce à la
 * classe CSS `.print-area` (@media print).
 */
export default function TicketModal({
  booking,
  onClose,
}: {
  booking: Booking | null;
  onClose: () => void;
}) {
  const { state } = useSalon();

  const services = booking
    ? state.services.filter((s) => booking.serviceIds.includes(s.id))
    : [];
  const total = services.reduce((a, s) => a + s.price, 0);
  const chair = booking?.chairId
    ? state.chairs.find((c) => c.id === booking.chairId)
    : null;
  const barberLabel = booking?.barberName
    ? booking.barberName + (booking.chairId ? ` — Siège ${booking.chairId}` : '')
    : chair
      ? `Siège ${chair.id} — ${chair.barber}`
      : 'Sans préférence';

  return (
    <AnimatePresence>
      {booking && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm print:hidden" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative w-full max-w-md max-h-[92vh] overflow-y-auto"
          >
            <div className="glass rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 print:hidden">
                <div className="font-display text-xl gold-text">
                  Ticket N° {booking.ticketNo}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Fermer"
                  className="rounded-full p-2 text-muted hover:text-cream hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Reçu blanc — zone imprimée par window.print() */}
              <div className="ticket-receipt print-area mx-auto max-w-sm rounded-2xl p-6 text-left shadow-[0_10px_40px_rgba(0,0,0,0.5)] ring-1 ring-black/10">
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
                  <Row l="Client" v={`${booking.prenom} ${booking.nom}`.trim()} />
                  {booking.tel && booking.tel !== '—' && <Row l="Téléphone" v={booking.tel} />}
                  <Row
                    l="Arrivée"
                    v={
                      new Date(booking.createdAt).toLocaleDateString('fr-FR') +
                      ' à ' +
                      new Date(booking.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    }
                  />
                  <Row l="Coiffeur" v={barberLabel} />
                </div>
                <div className="my-4 border-t border-dashed" />
                <div className="space-y-1.5 text-sm">
                  {services.map((s) => (
                    <Row key={s.id} l={s.name} v={fmtDA(s.price)} />
                  ))}
                  {services.length === 0 && <Row l="Prestation" v="—" />}
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

              <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-gold rounded-xl px-6 py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer size={17} /> Imprimer / Télécharger
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost rounded-xl px-6 py-2.5"
                >
                  Fermer
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
