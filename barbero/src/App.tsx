import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, MapPin, Phone, Clock3, Instagram, DoorClosed, Megaphone } from 'lucide-react';
import Modal from './components/Modal';
import { SalonProvider, useSalon } from './lib/store';
import Header from './components/Header';
import QueueChairs from './components/QueueChairs';
import Services from './components/Services';
import Gallery from './components/Gallery';
import Contact, { TikTokIcon, SALON_PHONE, SALON_PHONE_DISPLAY, TIKTOK_URL, INSTAGRAM_URL } from './components/Contact';
import BookingModal from './components/BookingModal';
import StaffDashboard from './components/StaffDashboard';
import Preloader from './components/Preloader';

function AppInner() {
  const { state } = useSalon();
  const [booking, setBooking] = useState(false);
  const [staff, setStaff] = useState(false);
  const [closedAlert, setClosedAlert] = useState(false);

  /** Tous les boutons « Réserver » passent par ici : bloqué si salon fermé. */
  const tryBook = () => {
    if (!state.open) {
      setClosedAlert(true);
      return;
    }
    setBooking(true);
  };

  const showAnnouncement = state.announcement.enabled && state.announcement.text.trim().length > 0;

  return (
    <div className="min-h-screen">
      {/* Bannière d'annonce flash */}
      {showAnnouncement && (
        <div className="relative z-30 border-b border-gold/30 bg-gradient-to-r from-gold-dim/20 via-gold/15 to-gold-dim/20 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-center gap-2.5 text-center">
            <Megaphone size={15} className="text-gold shrink-0" />
            <p className="text-sm font-medium text-gold-soft">{state.announcement.text}</p>
          </div>
        </div>
      )}

      <Header onStaff={() => setStaff(true)} onBook={tryBook} />

      {!state.open && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 relative z-10">
          <div className="rounded-xl border border-ruby/40 bg-ruby/10 px-5 py-3 text-sm text-ruby text-center">
            Le salon est actuellement fermé pour le moment. Veuillez repatienter jusqu’à l’ouverture.
          </div>
        </div>
      )}

      <QueueChairs />
      <div className="divider-gold max-w-4xl mx-auto" />
      <Services onBook={tryBook} />
      <div className="divider-gold max-w-4xl mx-auto" />
      <Gallery />
      <div className="divider-gold max-w-4xl mx-auto" />
      <Contact />

      {/* Footer */}
      <footer className="border-t border-line mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Barbero المحطة" className="h-12 w-auto" />
              <div className="font-display text-lg gold-text">
                Barbero <span dir="rtl" lang="ar">المحطة</span>
              </div>
            </div>
            <p className="text-muted mt-2 italic">L’art du détail et de l’élégance.</p>
          </div>
          <div className="text-muted space-y-2">
            <div className="flex items-center gap-2"><MapPin size={14} className="text-gold shrink-0" /> En face de l’arrêt de bus des étudiants, Université Hasnaoua, Tizi Ouzou</div>
            <a href={`tel:${SALON_PHONE}`} className="flex items-center gap-2 text-gold-soft font-semibold hover:text-gold transition-colors">
              <Phone size={14} className="text-gold" /> {SALON_PHONE_DISPLAY}
            </a>
            <div className="flex items-center gap-2"><Clock3 size={14} className="text-gold" /> {state.hours} — 7j/7</div>
          </div>
          <div className="text-muted sm:text-right">
            <div className="flex sm:justify-end gap-2 mb-3">
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="h-9 w-9 rounded-full border border-line flex items-center justify-center text-cream hover:border-gold/50 hover:text-gold-soft transition-colors"
              >
                <TikTokIcon size={15} />
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="h-9 w-9 rounded-full border border-line flex items-center justify-center text-cream hover:border-gold/50 hover:text-gold-soft transition-colors"
              >
                <Instagram size={15} />
              </a>
            </div>
            <button onClick={() => setStaff(true)} className="btn-ghost rounded-full px-4 py-1.5 text-xs">
              Espace Staff
            </button>
            <p className="mt-3 text-xs text-muted/60">© {new Date().getFullYear()} Barbero <span dir="rtl" lang="ar">المحطة</span> — Tizi Ouzou</p>
          </div>
        </div>
      </footer>

      {/* Floating book button */}
      <motion.button
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.8 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={tryBook}
        className="btn-gold fixed bottom-5 right-5 z-40 rounded-full px-6 py-3.5 font-semibold inline-flex items-center gap-2 shadow-2xl"
      >
        <CalendarCheck size={18} /> Réserver
      </motion.button>

      {/* Alerte salon fermé */}
      <Modal open={closedAlert} onClose={() => setClosedAlert(false)} title="Salon fermé">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-ruby/10 border border-ruby/40 flex items-center justify-center glow-red">
            <DoorClosed size={28} className="text-ruby" />
          </div>
          <p className="mt-5 text-cream text-base leading-relaxed">
            Le salon est actuellement fermé pour le moment.
            <br />
            <span className="text-muted">Veuillez repatienter jusqu’à l’ouverture.</span>
          </p>
          <p className="mt-3 text-sm text-muted">Horaires habituels : <span className="text-gold-soft">{state.hours}</span></p>
          <button
            onClick={() => setClosedAlert(false)}
            className="btn-gold rounded-xl px-8 py-2.5 mt-6"
          >
            Compris
          </button>
        </div>
      </Modal>

      <BookingModal open={booking} onClose={() => setBooking(false)} />
      <StaffDashboard open={staff} onClose={() => setStaff(false)} />
    </div>
  );
}

export default function App() {
  return (
    <SalonProvider>
      <Preloader />
      <AppInner />
    </SalonProvider>
  );
}
