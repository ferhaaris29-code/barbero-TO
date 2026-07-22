import { motion } from 'framer-motion';
import { Scissors } from 'lucide-react';
import { useSalon, fmtDA } from '../lib/store';

export default function Services({ onBook }: { onBook: () => void }) {
  const { state } = useSalon();

  return (
    <section id="services" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 scroll-mt-16">
      <div className="text-center mb-10">
        <h2 className="font-display text-3xl sm:text-4xl gold-text">Nos Prestations</h2>
        <p className="text-muted mt-2">Tarifs en Dinar Algérien (DA)</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.services.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 200, damping: 22, delay: (i % 3) * 0.08 }}
            className="card-lux card-lux-hover p-5 flex items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 font-medium text-cream">
                <Scissors size={16} className="text-gold" />
                {s.name}
              </div>
              {s.description && <div className="text-xs text-muted mt-1">{s.description}</div>}
            </div>
            <div className="font-display text-xl text-gold-soft whitespace-nowrap">{fmtDA(s.price)}</div>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-10">
        <button onClick={onBook} className="btn-gold rounded-full px-10 py-3.5 text-base font-semibold tracking-wide">
          Réserver maintenant
        </button>
      </div>
    </section>
  );
}
