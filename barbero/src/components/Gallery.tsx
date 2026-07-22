import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSalon } from '../lib/store';

export default function Gallery() {
  const { state } = useSalon();
  const [cat, setCat] = useState<string>('all');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const photos = cat === 'all' ? state.photos : state.photos.filter((p) => p.categoryId === cat);

  const tabs = [{ id: 'all', name: 'Toutes' }, ...state.categories];

  return (
    <section id="galerie" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 scroll-mt-16">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl sm:text-4xl gold-text">Galerie du Salon</h2>
        <p className="text-muted mt-2">Nos réalisations, notre ambiance</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setCat(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
              cat === t.id
                ? 'border-gold/70 bg-gold/15 text-gold-soft font-semibold'
                : 'border-line text-muted hover:border-gold/40 hover:text-cream'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <AnimatePresence mode="popLayout">
          {photos.map((p, i) => (
            <motion.button
              layout
              key={p.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={() => setLightbox(i)}
              className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-line hover:border-gold/50 transition-colors"
            >
              <img
                src={p.url}
                alt={p.caption ?? 'Photo salon'}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {p.caption && (
                <div className="absolute bottom-0 inset-x-0 p-3 text-left text-sm text-cream opacity-0 group-hover:opacity-100 transition-opacity">
                  {p.caption}
                </div>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>

      {photos.length === 0 && (
        <p className="text-center text-muted py-10">Aucune photo dans cette catégorie pour le moment.</p>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && photos[lightbox] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={() => setLightbox(null)}
          >
            <button className="absolute top-4 right-4 rounded-full p-2 text-muted hover:text-cream bg-white/5" aria-label="Fermer">
              <X size={22} />
            </button>
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + photos.length) % photos.length); }}
                  className="absolute left-2 sm:left-6 rounded-full p-2.5 text-gold bg-white/5 hover:bg-white/10"
                  aria-label="Précédent"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % photos.length); }}
                  className="absolute right-2 sm:right-6 rounded-full p-2.5 text-gold bg-white/5 hover:bg-white/10"
                  aria-label="Suivant"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
            <motion.figure
              key={photos[lightbox].id}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-3xl w-full"
            >
              <img
                src={photos[lightbox].url}
                alt={photos[lightbox].caption ?? ''}
                className="w-full max-h-[80vh] object-contain rounded-xl border border-gold/30"
              />
              {photos[lightbox].caption && (
                <figcaption className="text-center text-muted mt-3 text-sm">{photos[lightbox].caption}</figcaption>
              )}
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
