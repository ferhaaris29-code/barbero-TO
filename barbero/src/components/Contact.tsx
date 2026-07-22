import { motion } from 'framer-motion';
import { Phone, MapPin, Clock3, Instagram } from 'lucide-react';
import { useSalon } from '../lib/store';

export const SALON_PHONE = '0549452036';
export const SALON_PHONE_DISPLAY = '05 49 45 20 36';
export const TIKTOK_URL = 'https://www.tiktok.com/@yanisbarberotiziouzou';
export const INSTAGRAM_URL = 'https://www.instagram.com/barbero_tiziouzou/';

export function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298 0 .595.045.88.133V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.44 6.37 6.37 0 0 0 1.87-4.5v-6.98a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.91-.05z" />
    </svg>
  );
}

export default function Contact() {
  const { state } = useSalon();

  return (
    <section id="contact" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 scroll-mt-16">
      <div className="text-center mb-10">
        <h2 className="font-display text-3xl sm:text-4xl gold-text">Contact & Localisation</h2>
        <p className="text-muted mt-2">Retrouvez-nous au cœur de Tizi Ouzou</p>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-5">
        {/* Contact card */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 160, damping: 22 }}
          className="card-lux p-6 flex flex-col gap-5"
        >
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted mb-2">Téléphone</div>
            <a
              href={`tel:${SALON_PHONE}`}
              className="inline-flex items-center gap-3 group"
            >
              <span className="h-11 w-11 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center glow-gold group-hover:bg-gold/20 transition-colors">
                <Phone size={18} className="text-gold" />
              </span>
              <span className="font-display text-2xl text-gold-soft tracking-wide group-hover:text-gold transition-colors">
                {SALON_PHONE_DISPLAY}
              </span>
            </a>
            <p className="text-xs text-muted mt-1.5">Appuyez pour appeler directement</p>
          </div>

          <div className="divider-gold" />

          <div className="space-y-2.5 text-sm text-muted">
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-gold shrink-0" /> En face de l’arrêt de bus des étudiants, Université Hasnaoua, Tizi Ouzou
            </div>
            <div className="flex items-center gap-2">
              <Clock3 size={15} className="text-gold shrink-0" /> {state.hours} — 7j/7
            </div>
          </div>

          <div className="divider-gold" />

          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted mb-3">Suivez-nous</div>
            <div className="flex gap-3">
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-xl border border-line bg-obsidian/60 px-4 py-3 flex items-center justify-center gap-2 text-cream text-sm font-semibold hover:border-gold/50 hover:text-gold-soft transition-colors"
              >
                <TikTokIcon size={17} /> TikTok
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-xl border border-line bg-obsidian/60 px-4 py-3 flex items-center justify-center gap-2 text-cream text-sm font-semibold hover:border-gold/50 hover:text-gold-soft transition-colors"
              >
                <Instagram size={17} /> Instagram
              </a>
            </div>
          </div>
        </motion.div>

        {/* Interactive map */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.1 }}
          className="card-lux overflow-hidden p-1.5"
        >
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3198.7232930420932!2d4.044799010994157!3d36.70518667215882!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x128dc90066142083%3A0x9731d559e438a807!2sBarbero%20Tiziouzou!5e0!3m2!1sfr!2sdz!4v1784655570577!5m2!1sfr!2sdz"
            width="100%"
            height="400"
            style={{ border: 0, borderRadius: '0.75rem', display: 'block' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            title="Barbero Tiziouzou — Google Maps"
            className="grayscale-[0.25] contrast-[1.05]"
          />
        </motion.div>
      </div>
    </section>
  );
}
