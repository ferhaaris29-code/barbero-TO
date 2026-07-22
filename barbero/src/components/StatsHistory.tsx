import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Banknote, Scissors, Users, TrendingUp, Search, Armchair, Ticket,
  CalendarDays, CalendarRange,
} from 'lucide-react';
import { useSalon, fmtDA } from '../lib/store';
import type { ArchiveEntry } from '../lib/types';

/**
 * Dynamic date engine — ZERO hardcoded dates, months or years.
 * Month names come from the Date API; the year list spans the current year
 * up to +10 years (extended backwards to cover archives).
 */
const MONTHS_FR: string[] = Array.from({ length: 12 }, (_, i) => {
  const label = new Date(2000, i, 1).toLocaleDateString('fr-FR', { month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
});

const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const todayKey = () => dayKey(Date.now());

type View = 'jour' | 'mois';

/** Unified record shape: archived entries + live completed bookings. */
interface StatRecord {
  id: string;
  ticketNo: number;
  nom: string;
  prenom: string;
  tel: string;
  chairId: number | null;
  barber: string;
  services: string[];
  total: number;
  status: 'terminee' | 'annulee';
  createdAt: number;
}

export default function StatsHistory() {
  const { state } = useSalon();
  const now = new Date();
  const currentYear = now.getFullYear();

  const [view, setView] = useState<View>('jour');
  // Daily picker — defaults to TODAY (new Date()).
  const [selDay, setSelDay] = useState(() => todayKey());
  // Monthly selectors — default to current month & year.
  const [selYear, setSelYear] = useState(currentYear);
  const [selMonth, setSelMonth] = useState(now.getMonth()); // 0..11
  const [search, setSearch] = useState('');

  const years = useMemo(() => {
    const minArchived = state.archive.length
      ? Math.min(...state.archive.map((e) => new Date(e.createdAt).getFullYear()))
      : currentYear;
    const start = Math.min(minArchived, currentYear);
    const end = currentYear + 10;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [state.archive, currentYear]);

  /**
   * All statistic records = archived history + LIVE bookings of the current
   * session (so today's revenue appears instantly, before "Clôturer la Caisse").
   */
  const allRecords = useMemo<StatRecord[]>(() => {
    const archived: StatRecord[] = state.archive.map((e: ArchiveEntry) => ({
      id: e.id,
      ticketNo: e.ticketNo,
      nom: e.nom,
      prenom: e.prenom,
      tel: e.tel,
      chairId: e.chairId,
      barber: e.barber,
      services: e.services,
      total: e.total,
      status: e.status === 'terminee' ? 'terminee' : 'annulee',
      createdAt: e.createdAt,
    }));
    const archivedIds = new Set(archived.map((r) => r.id));
    const live: StatRecord[] = state.bookings
      .filter((b) => b.status === 'terminee' && !archivedIds.has(b.id))
      .map((b) => {
        const services = state.services.filter((s) => b.serviceIds.includes(s.id));
        const chair = b.chairId ? state.chairs.find((c) => c.id === b.chairId) : null;
        return {
          id: b.id,
          ticketNo: b.ticketNo,
          nom: b.nom,
          prenom: b.prenom,
          tel: b.tel,
          chairId: b.chairId,
          barber: b.barberName ?? (chair ? chair.barber : 'Sans préférence'),
          services: services.map((s) => s.name),
          total: services.reduce((a, s) => a + s.price, 0),
          status: 'terminee' as const,
          createdAt: b.createdAt,
        };
      });
    return [...archived, ...live];
  }, [state.archive, state.bookings, state.services, state.chairs]);

  /** Records in the currently selected period (day or month). */
  const periodRecords = useMemo(() => {
    if (view === 'jour') {
      return allRecords
        .filter((r) => dayKey(r.createdAt) === selDay)
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    return allRecords
      .filter((r) => {
        const d = new Date(r.createdAt);
        return d.getFullYear() === selYear && d.getMonth() === selMonth;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [allRecords, view, selDay, selYear, selMonth]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return periodRecords;
    return periodRecords.filter((e) =>
      String(e.ticketNo).includes(q) ||
      `${e.prenom} ${e.nom}`.toLowerCase().includes(q) ||
      e.tel.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
      e.barber.toLowerCase().includes(q) ||
      e.services.some((s) => s.toLowerCase().includes(q)),
    );
  }, [periodRecords, search]);

  const stats = useMemo(() => {
    const done = periodRecords.filter((e) => e.status === 'terminee');
    const revenue = done.reduce((a, e) => a + e.total, 0);
    return {
      revenue,
      cuts: done.length,
      cancelled: periodRecords.filter((e) => e.status === 'annulee').length,
      avg: done.length ? Math.round(revenue / done.length) : 0,
    };
  }, [periodRecords]);

  /** Per-barber breakdown (revenue + client count) for the period. */
  const perBarber = useMemo(() => {
    const map = new Map<string, { barber: string; chairId: number | null; cuts: number; revenue: number }>();
    for (const b of state.barbers) {
      map.set(b.name, { barber: b.name, chairId: b.chairId, cuts: 0, revenue: 0 });
    }
    for (const e of periodRecords) {
      if (e.status !== 'terminee') continue;
      const cur = map.get(e.barber) ?? { barber: e.barber, chairId: e.chairId, cuts: 0, revenue: 0 };
      cur.cuts += 1;
      cur.revenue += e.total;
      map.set(e.barber, cur);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [periodRecords, state.barbers]);

  /** Service breakdown — which services were requested most in the period. */
  const perService = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of periodRecords) {
      if (e.status !== 'terminee') continue;
      for (const s of e.services) map.set(s, (map.get(s) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [periodRecords]);

  const maxRevenue = Math.max(1, ...perBarber.map((b) => b.revenue));
  const maxServiceCount = Math.max(1, ...perService.map((s) => s.count));

  const periodLabel = view === 'jour'
    ? new Date(selDay + 'T00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : `${MONTHS_FR[selMonth]} ${selYear}`;

  const isToday = view === 'jour' && selDay === todayKey();

  return (
    <div className="space-y-6">
      {/* View toggle + period pickers */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView('jour')}
            className={`rounded-full px-4 py-1.5 text-sm border inline-flex items-center gap-1.5 transition-colors ${
              view === 'jour'
                ? 'border-gold/70 bg-gold/15 text-gold-soft font-semibold'
                : 'border-line text-muted hover:border-gold/40 hover:text-cream'
            }`}
          >
            <CalendarDays size={14} /> Statistiques du Jour
          </button>
          <button
            type="button"
            onClick={() => setView('mois')}
            className={`rounded-full px-4 py-1.5 text-sm border inline-flex items-center gap-1.5 transition-colors ${
              view === 'mois'
                ? 'border-gold/70 bg-gold/15 text-gold-soft font-semibold'
                : 'border-line text-muted hover:border-gold/40 hover:text-cream'
            }`}
          >
            <CalendarRange size={14} /> Statistiques du Mois
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {view === 'jour' ? (
            <>
              <input
                type="date"
                className="input-lux !w-auto [color-scheme:dark]"
                value={selDay}
                onChange={(e) => e.target.value && setSelDay(e.target.value)}
                aria-label="Jour"
              />
              {!isToday && (
                <button
                  type="button"
                  onClick={() => setSelDay(todayKey())}
                  className="btn-ghost rounded-lg px-3 py-2 text-xs"
                >
                  Aujourd’hui
                </button>
              )}
            </>
          ) : (
            <>
              <select
                className="input-lux !w-auto"
                value={selMonth}
                onChange={(e) => setSelMonth(Number(e.target.value))}
                aria-label="Mois"
              >
                {MONTHS_FR.map((label, i) => (
                  <option key={label} value={i}>{label}</option>
                ))}
              </select>
              <select
                className="input-lux !w-auto"
                value={selYear}
                onChange={(e) => setSelYear(Number(e.target.value))}
                aria-label="Année"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      <div className="text-sm text-muted capitalize">
        Période : <span className="text-gold-soft font-medium">{periodLabel}</span>
        {isToday && <span className="ml-2 rounded-full border border-emerald-glow/40 bg-emerald-glow/10 text-emerald-glow px-2.5 py-0.5 text-[11px] font-semibold normal-case">En direct</span>}
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Banknote size={18} />}
          label={view === 'jour' ? 'CHIFFRE D’AFFAIRES DU JOUR' : 'RECETTE DU MOIS'}
          value={fmtDA(stats.revenue)}
          tone="text-gold-soft"
        />
        <StatCard
          icon={<Users size={18} />}
          label={view === 'jour' ? 'CLIENTS SERVIS' : 'COUPES RÉALISÉES'}
          value={String(stats.cuts)}
          tone="text-emerald-glow"
        />
        <StatCard icon={<TrendingUp size={18} />} label="MOYENNE / CLIENT" value={fmtDA(stats.avg)} tone="text-cream" />
        <StatCard icon={<Scissors size={18} />} label="ANNULÉES" value={String(stats.cancelled)} tone="text-ruby" />
      </div>

      {/* Per-barber breakdown */}
      <div className="card-lux p-5">
        <div className="font-medium text-cream mb-4 flex items-center gap-2 flex-wrap">
          <Armchair size={16} className="text-gold" /> Répartition par coiffeur / siège
          <span className="text-muted text-sm capitalize">— {periodLabel}</span>
        </div>
        <div className="space-y-3">
          {perBarber.map((b, i) => (
            <div key={b.barber} className="grid grid-cols-[110px_1fr_auto] sm:grid-cols-[150px_1fr_auto] items-center gap-3">
              <div className="text-sm">
                <span className="text-cream font-medium">{b.barber}</span>
                {b.chairId && <span className="text-muted text-xs block">Siège {b.chairId}</span>}
              </div>
              <div className="h-6 rounded-full bg-obsidian border border-line overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(b.revenue / maxRevenue) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 22, delay: i * 0.06 }}
                  className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold"
                />
              </div>
              <div className="text-right text-sm whitespace-nowrap">
                <span className="text-gold-soft font-semibold">{fmtDA(b.revenue)}</span>
                <span className="text-muted text-xs block">{b.cuts} client{b.cuts > 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
          {perBarber.every((b) => b.cuts === 0) && (
            <p className="text-muted text-sm text-center py-4">
              Aucune coupe terminée sur cette période.
            </p>
          )}
        </div>
      </div>

      {/* Service breakdown */}
      <div className="card-lux p-5">
        <div className="font-medium text-cream mb-4 flex items-center gap-2 flex-wrap">
          <Scissors size={16} className="text-gold" /> Prestations les plus demandées
          <span className="text-muted text-sm capitalize">— {periodLabel}</span>
        </div>
        {perService.length > 0 ? (
          <div className="space-y-3">
            {perService.map((s, i) => (
              <div key={s.name} className="grid grid-cols-[minmax(110px,180px)_1fr_auto] items-center gap-3">
                <div className="text-sm text-cream font-medium truncate">{s.name}</div>
                <div className="h-6 rounded-full bg-obsidian border border-line overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.count / maxServiceCount) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 22, delay: i * 0.05 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-glow/40 to-emerald-glow/80"
                  />
                </div>
                <div className="text-right text-sm text-emerald-glow font-semibold whitespace-nowrap">
                  ×{s.count}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm text-center py-4">Aucune prestation sur cette période.</p>
        )}
      </div>

      {/* History log */}
      <div className="card-lux p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="font-medium text-cream flex items-center gap-2">
            <Ticket size={16} className="text-gold" /> Historique
            <span className="text-muted text-xs">({filtered.length} entrée{filtered.length > 1 ? 's' : ''})</span>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input-lux !pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ticket, client, téléphone, coiffeur…"
            />
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-muted border-b border-line">
                <th className="py-2.5 pr-3">Ticket</th>
                <th className="py-2.5 pr-3">Client</th>
                <th className="py-2.5 pr-3">Téléphone</th>
                <th className="py-2.5 pr-3">Coiffeur</th>
                <th className="py-2.5 pr-3">Prestations</th>
                <th className="py-2.5 pr-3 text-right">Total</th>
                <th className="py-2.5 pr-3">Horodatage</th>
                <th className="py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => <HistoryRow key={e.id} e={e} />)}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-muted py-8">Aucune entrée sur cette période.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ e }: { e: StatRecord }) {
  const d = new Date(e.createdAt);
  return (
    <tr className="border-b border-line/50 hover:bg-white/[0.02] transition-colors">
      <td className="py-2.5 pr-3 font-semibold text-gold-soft whitespace-nowrap">#{e.ticketNo}</td>
      <td className="py-2.5 pr-3 text-cream whitespace-nowrap">{e.prenom} {e.nom}</td>
      <td className="py-2.5 pr-3 text-muted whitespace-nowrap">{e.tel}</td>
      <td className="py-2.5 pr-3 text-cream whitespace-nowrap">
        {e.barber}{e.chairId ? <span className="text-muted text-xs"> · S{e.chairId}</span> : null}
      </td>
      <td className="py-2.5 pr-3 text-muted max-w-[220px]">{e.services.join(' + ')}</td>
      <td className="py-2.5 pr-3 text-right font-medium text-gold-soft whitespace-nowrap">{fmtDA(e.total)}</td>
      <td className="py-2.5 pr-3 text-muted whitespace-nowrap">
        {d.toLocaleDateString('fr-FR')} {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </td>
      <td className="py-2.5">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
            e.status === 'terminee'
              ? 'border-emerald-glow/40 text-emerald-glow bg-emerald-glow/5'
              : 'border-ruby/40 text-ruby bg-ruby/5'
          }`}
        >
          {e.status === 'terminee' ? 'Terminée' : 'Annulée'}
        </span>
      </td>
    </tr>
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
