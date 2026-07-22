import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock3, MapPin, Phone, Menu, X } from 'lucide-react';
import { useSalon, DEFAULT_HERO } from '../lib/store';
import { SALON_PHONE, SALON_PHONE_DISPLAY } from './Contact';

const NAV_LINKS: { label: string; sectionId: string }[] = [
  { label: 'ACCUEIL', sectionId: 'hero' },
  { label: 'SERVICES', sectionId: 'services' },
  { label: 'COIFFEURS', sectionId: 'coiffeurs' },
  { label: 'GALERIE', sectionId: 'galerie' },
  { label: 'CONTACT', sectionId: 'contact' },
];

export default function Header({ onStaff, onBook }: { onStaff: () => void; onBook: () => void }) {
  const { state } = useSalon();
  const [menuOpen, setMenuOpen] = useState(false);

  /**
   * Navigation mobile fiable :
   * 1. Ferme le menu mobile immédiatement.
   * 2. Attend 100 ms (le temps que le menu se ferme) avant de scroller,
   *    sinon le scroll est cassé par l'animation de fermeture.
   */
  const handleNavClick = (id: string) => {
    setMenuOpen(false); // 1. Ferme le menu mobile immédiatement
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100); // 2. Laisse le temps au menu de se fermer avant de scroller
  };

  return (
    <header id="hero" className="relative overflow-hidden scroll-mt-0">
      {/* Dynamic hero background — staff-configurable, default fallback */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-[background-image] duration-500"
        style={{ backgroundImage: `url('${state.heroImage || DEFAULT_HERO}')` }}
      />
      {/* ~60% dark overlay kept on top of any uploaded image for text legibility */}
      <div className="absolute inset-0 bg-obsidian/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian/30 via-obsidian/55 to-obsidian" />

      {/* ── Top navigation bar ── */}
      <nav className="relative z-20 border-b border-gold/15 bg-obsidian/55 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleNavClick('hero')}
            className="font-display text-base sm:text-lg tracking-[0.2em] gold-text whitespace-nowrap cursor-pointer"
          >
            Barbero <span dir="rtl" lang="ar" className="tracking-normal">المحطة</span>
          </button>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <button
                key={l.sectionId}
                type="button"
                onClick={() => handleNavClick(l.sectionId)}
                className="px-3.5 py-2 text-[13px] font-semibold tracking-widest text-muted hover:text-gold-soft transition-colors cursor-pointer"
              >
                {l.label}
              </button>
            ))}
            <button
              onClick={onBook}
              className="btn-gold ml-2 rounded-full px-5 py-2 text-[13px] font-bold tracking-widest"
            >
              RÉSERVER
            </button>
            <button
              onClick={onStaff}
              className="btn-ghost ml-2 rounded-full px-4 py-2 text-[13px] font-medium"
            >
              Espace Staff
            </button>
          </div>

          {/* Mobile: call + burger */}
          <div className="flex lg:hidden items-center gap-2">
            <a
              href={`tel:${SALON_PHONE}`}
              aria-label="Appeler le salon"
              className="h-10 w-10 rounded-full border border-gold/40 bg-gold/10 flex items-center justify-center text-gold-soft"
            >
              <Phone size={16} />
            </a>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              className="h-10 w-10 rounded-full border border-line flex items-center justify-center text-cream"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="lg:hidden overflow-hidden border-t border-line bg-obsidian/90 backdrop-blur-lg"
            >
              <div className="px-4 py-4 flex flex-col gap-1">
                {NAV_LINKS.map((l) => (
                  <button
                    key={l.sectionId}
                    type="button"
                    onClick={() => handleNavClick(l.sectionId)}
                    className="rounded-lg px-4 py-3 text-sm font-semibold tracking-widest text-cream text-left hover:bg-gold/10 hover:text-gold-soft transition-colors cursor-pointer"
                  >
                    {l.label}
                  </button>
                ))}
                <button
                  onClick={() => { setMenuOpen(false); onBook(); }}
                  className="btn-gold mt-2 rounded-xl px-4 py-3 text-sm font-bold tracking-widest"
                >
                  RÉSERVER
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onStaff(); }}
                  className="btn-ghost mt-1 rounded-xl px-4 py-3 text-sm"
                >
                  Espace Staff
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero content ── */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-14 sm:pb-20 text-center">
        {/* Headline ABOVE the logo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl leading-[1.08]">
            <span className="text-cream">Plus qu’une coupe,</span>
            <span className="block gold-text mt-1">une signature.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-muted text-base sm:text-lg leading-relaxed">
            Découvrez le meilleur salon de coiffure de Tizi Ouzou. Une équipe de
            professionnels sérieux, patients et à l’écoute pour vos dégradés,
            tailles de barbe et soins.
          </p>
        </motion.div>

        {/* Central Barbero logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.2 }}
          className="relative inline-block mt-8"
        >
          <div className="absolute inset-0 -m-8 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
          <img
            src="/logo.png"
            alt="Barbero Salon — Tizi Ouzou"
            className="relative mx-auto h-36 sm:h-48 md:h-56 w-auto drop-shadow-[0_6px_24px_rgba(212,175,55,0.3)]"
          />
        </motion.div>

        {/* Action badges */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.4 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <span
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold tracking-widest ${
              state.open
                ? 'bg-emerald-glow/15 text-emerald-glow border border-emerald-glow/40 glow-green'
                : 'bg-ruby/10 text-ruby border border-ruby/40 glow-red'
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full pulse-dot ${state.open ? 'bg-emerald-glow' : 'bg-ruby'}`} />
            {state.open ? 'OUVERT' : 'FERMÉ'}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-onyx/70 px-5 py-2 text-sm text-cream">
            <Clock3 size={15} className="text-gold" />
            {state.hours}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-onyx/70 px-5 py-2 text-sm text-muted">
            <MapPin size={15} className="text-gold" />
            En face de l’arrêt de bus des étudiants, Université Hasnaoua, Tizi Ouzou
          </span>
          <a
            href={`tel:${SALON_PHONE}`}
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-sm font-semibold text-gold-soft hover:bg-gold/20 transition-colors glow-gold"
          >
            <Phone size={15} />
            {SALON_PHONE_DISPLAY}
          </a>
          <button
            onClick={onBook}
            className="btn-gold rounded-full px-6 py-2 text-sm font-bold tracking-wide"
          >
            Réserver
          </button>
        </motion.div>
      </div>
      <div className="divider-gold relative z-10" />
    </header>
  );
}
