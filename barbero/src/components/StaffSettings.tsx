import { useRef, useState } from 'react';
import { Check, Trash2, Plus, Image, KeyRound, Armchair, Scissors, Power, UploadCloud, Loader2, Clock, Megaphone, Pencil } from 'lucide-react';
import Modal from './Modal';
import { useSalon, fmtDA, DEFAULT_HERO } from '../lib/store';
import { fileToHeroImage } from '../lib/fileToImage';
import BarberChairIcon from './BarberChairIcon';

type Tab = 'general' | 'services' | 'chairs' | 'gallery';

export default function StaffSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('general');

  const TABS: [Tab, string, React.ReactNode][] = [
    ['general', 'Général', <Power size={14} key="g" />],
    ['services', 'Services', <Scissors size={14} key="s" />],
    ['chairs', 'Sièges', <Armchair size={14} key="c" />],
    ['gallery', 'Gestion Galerie', <Image size={14} key="i" />],
  ];

  return (
    <Modal open={open} onClose={onClose} title="Paramètres du Salon" wide>
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(([t, label, icon]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm border inline-flex items-center gap-1.5 transition-colors ${
              tab === t
                ? 'border-gold/70 bg-gold/15 text-gold-soft font-semibold'
                : 'border-line text-muted hover:border-gold/40 hover:text-cream'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === 'general' && <GeneralTab />}
      {tab === 'services' && <ServicesTab />}
      {tab === 'chairs' && <ChairsTab />}
      {tab === 'gallery' && <GalleryTab />}
    </Modal>
  );
}

/* ── General: open/closed toggle, hours, walk-ins, PIN ── */
function GeneralTab() {
  const { state, setOpen, setHours, setWalkIns, setPin, setHeroImage, setAnnouncement } = useSalon();
  const [newPin, setNewPin] = useState('');
  const [pinSaved, setPinSaved] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroError, setHeroError] = useState('');
  const heroFileRef = useRef<HTMLInputElement>(null);

  const handleHeroFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setHeroUploading(true);
    setHeroError('');
    try {
      // Convertisseur universel : images, PDF (1re page), HTML, SVG, GIF…
      const dataUrl = await fileToHeroImage(file, 1920);
      setHeroImage(dataUrl);
    } catch {
      setHeroError('Impossible de convertir ce fichier en image de fond. Essayez un autre fichier.');
    } finally {
      setHeroUploading(false);
      if (heroFileRef.current) heroFileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="card-lux p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-medium text-cream">Statut du salon</div>
          <div className="text-sm text-muted">Visible instantanément sur la page publique.</div>
        </div>
        <button
          onClick={() => setOpen(!state.open)}
          className={`rounded-full px-6 py-2.5 text-sm font-bold tracking-widest border transition-all ${
            state.open
              ? 'bg-emerald-glow/15 text-emerald-glow border-emerald-glow/50 glow-green'
              : 'bg-ruby/10 text-ruby border-ruby/50 glow-red'
          }`}
        >
          {state.open ? 'OUVERT — cliquer pour fermer' : 'FERMÉ — cliquer pour ouvrir'}
        </button>
      </div>

      {/* Bannière d'annonce flash */}
      <div className="card-lux p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-cream font-medium">
              <Megaphone size={16} className="text-gold" /> Message d’annonce (bannière flash)
            </div>
            <div className="text-sm text-muted mt-1">
              Affiché tout en haut de la page d’accueil (promos, fermeture exceptionnelle…).
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAnnouncement({ ...state.announcement, enabled: !state.announcement.enabled })}
            className={`rounded-full px-5 py-2 text-xs font-bold tracking-widest border transition-all ${
              state.announcement.enabled
                ? 'border-emerald-glow/50 text-emerald-glow bg-emerald-glow/10 glow-green'
                : 'border-line text-muted hover:border-gold/40'
            }`}
          >
            {state.announcement.enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
          </button>
        </div>
        <input
          className="input-lux mt-3"
          value={state.announcement.text}
          onChange={(e) => setAnnouncement({ ...state.announcement, text: e.target.value })}
          placeholder="Ex : ⚡ Promo -20% sur le Forfait VIP tout le week-end !"
          maxLength={160}
        />
        {state.announcement.enabled && !state.announcement.text.trim() && (
          <p className="text-xs text-amber-400 mt-1.5">Saisissez un message pour que la bannière s’affiche.</p>
        )}
      </div>

      {/* Hero background manager */}
      <div className="card-lux p-5">
        <div className="flex items-center gap-2 text-cream font-medium">
          <Image size={16} className="text-gold" /> Changer l’image de fond (Hero Background)
        </div>
        <p className="text-sm text-muted mt-1">
          Cette image s’affiche derrière le titre sur la page d’accueil publique.
          Un voile sombre est conservé automatiquement pour la lisibilité du texte.
        </p>

        <div className="mt-4 grid sm:grid-cols-[220px_1fr] gap-4 items-start">
          {/* Live preview with the same dark overlay as the real hero */}
          <div className="relative h-28 rounded-xl overflow-hidden border border-line">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${state.heroImage || DEFAULT_HERO}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-obsidian/40 via-obsidian/70 to-obsidian/90" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-gold-soft text-sm tracking-widest">APERÇU</span>
            </div>
            {!state.heroImage && (
              <span className="absolute top-1.5 left-1.5 rounded-full bg-obsidian/80 border border-line px-2 py-0.5 text-[10px] text-muted">
                Image par défaut
              </span>
            )}
          </div>

          <div className="space-y-3">
            <input
              ref={heroFileRef}
              type="file"
              accept="*"
              className="hidden"
              onChange={(e) => handleHeroFile(e.target.files)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => heroFileRef.current?.click()}
                disabled={heroUploading}
                className="btn-gold rounded-xl px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-50"
              >
                {heroUploading ? (
                  <><Loader2 size={16} className="animate-spin" /> Traitement…</>
                ) : (
                  <><UploadCloud size={16} /> Choisir une image</>
                )}
              </button>
              {state.heroImage && (
                <button
                  type="button"
                  onClick={() => setHeroImage('')}
                  className="btn-ghost rounded-xl px-4 py-2.5 text-sm inline-flex items-center gap-2"
                >
                  <Trash2 size={15} /> Rétablir l’image par défaut
                </button>
              )}
            </div>
            <p className="text-xs text-muted">Tous formats acceptés (JPG, PNG, WEBP, PDF, SVG, HTML, GIF...)</p>
            {heroError && <p className="text-ruby text-xs">{heroError}</p>}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card-lux p-5">
          <label className="text-xs uppercase tracking-wide text-muted">Horaires affichés</label>
          <input className="input-lux mt-2" value={state.hours} onChange={(e) => setHours(e.target.value)} placeholder="09:00 – 19:30" />
        </div>
        <div className="card-lux p-5">
          <label className="text-xs uppercase tracking-wide text-muted">Clients sans réservation (file)</label>
          <div className="mt-2 flex items-center gap-3">
            <button onClick={() => setWalkIns(state.walkIns - 1)} className="btn-ghost rounded-lg w-10 h-10 text-lg">−</button>
            <span className="font-display text-2xl text-gold-soft w-10 text-center">{state.walkIns}</span>
            <button onClick={() => setWalkIns(state.walkIns + 1)} className="btn-ghost rounded-lg w-10 h-10 text-lg">+</button>
          </div>
        </div>
      </div>

      <div className="card-lux p-5">
        <div className="flex items-center gap-2 text-cream font-medium"><KeyRound size={16} className="text-gold" /> Changer le code PIN staff</div>
        <div className="mt-3 flex gap-3">
          <input
            type="password"
            className="input-lux max-w-[200px]"
            value={newPin}
            onChange={(e) => { setNewPin(e.target.value); setPinSaved(false); }}
            placeholder="Nouveau PIN"
          />
          <button
            disabled={newPin.trim().length < 4}
            onClick={() => { setPin(newPin.trim()); setNewPin(''); setPinSaved(true); }}
            className="btn-gold rounded-xl px-5 py-2 text-sm disabled:opacity-40"
          >
            {pinSaved ? <Check size={16} /> : 'Enregistrer'}
          </button>
        </div>
        <p className="text-xs text-muted mt-2">Minimum 4 caractères.</p>
      </div>
    </div>
  );
}

/* ── Services CRUD — liste épurée + pop-up d'ajout/édition ── */
function ServicesTab() {
  const { state, addService, updateService, deleteService } = useSalon();
  // null = fermé · 'new' = ajout · sinon id du service en édition
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openNew = () => {
    setName(''); setPrice(''); setDescription('');
    setFormError('');
    setEditing('new');
  };

  const openEdit = (id: string) => {
    const s = state.services.find((sv) => sv.id === id);
    if (!s) return;
    setName(s.name);
    setPrice(String(s.price));
    setDescription(s.description ?? '');
    setFormError('');
    setEditing(id);
  };

  const save = () => {
    if (!name.trim()) { setFormError('Le nom du service est obligatoire.'); return; }
    if (!price || Number(price) < 0) { setFormError('Veuillez saisir un prix valide en DA.'); return; }
    const payload = {
      name: name.trim(),
      price: Number(price),
      description: description.trim() || undefined,
    };
    if (editing === 'new') addService(payload);
    else if (editing) updateService(editing, payload);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      {/* En-tête : titre + bouton d'ajout bien visible en haut à droite */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-cream">Prestations du salon</div>
          <p className="text-xs text-muted mt-0.5">
            {state.services.length} service{state.services.length > 1 ? 's' : ''}
            {state.services.length > 0 && (
              <> · de {fmtDA(Math.min(...state.services.map((s) => s.price)))} à {fmtDA(Math.max(...state.services.map((s) => s.price)))}</>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="btn-gold rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5 shrink-0"
        >
          <Plus size={16} /> Ajouter un service
        </button>
      </div>

      {/* Liste épurée */}
      <div className="space-y-2">
        {state.services.map((s) => (
          <div key={s.id} className="card-lux card-lux-hover p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium text-cream">
                <Scissors size={14} className="text-gold shrink-0" />
                <span className="truncate">{s.name}</span>
              </div>
              {s.description && (
                <p className="text-xs text-muted mt-1 truncate">{s.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-gold-soft font-semibold whitespace-nowrap">{fmtDA(s.price)}</span>
              <button
                type="button"
                onClick={() => openEdit(s.id)}
                className="rounded-lg border border-gold/40 text-gold-soft px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-gold/10 transition-colors"
              >
                <Pencil size={13} /> Modifier
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDelete === s.id) { deleteService(s.id); setConfirmDelete(null); }
                  else setConfirmDelete(s.id);
                }}
                onBlur={() => setConfirmDelete(null)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  confirmDelete === s.id
                    ? 'border-ruby bg-ruby/15 text-ruby'
                    : 'border-ruby/40 text-ruby/80 hover:bg-ruby/10'
                }`}
              >
                <Trash2 size={13} /> {confirmDelete === s.id ? 'Confirmer ?' : 'Supprimer'}
              </button>
            </div>
          </div>
        ))}
        {state.services.length === 0 && (
          <p className="text-center text-muted text-sm py-8">
            Aucun service pour le moment — cliquez sur « + Ajouter un service ».
          </p>
        )}
      </div>

      {/* Pop-up d'ajout / édition */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Ajouter un service' : 'Modifier le service'}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted">Nom du service *</label>
            <input
              className="input-lux mt-1.5"
              value={name}
              autoFocus
              onChange={(e) => { setName(e.target.value); setFormError(''); }}
              placeholder="Ex : Tinture / Coloration"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted">Prix (DA) *</label>
            <input
              className="input-lux mt-1.5"
              type="number"
              min="0"
              inputMode="numeric"
              value={price}
              onChange={(e) => { setPrice(e.target.value); setFormError(''); }}
              placeholder="800"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted">Description</label>
            <textarea
              className="input-lux mt-1.5 resize-none"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex : Shampoing + Soin + Coiffage"
            />
          </div>

          {formError && <p className="text-ruby text-xs">{formError}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="btn-ghost flex-1 rounded-xl px-4 py-2.5 text-sm"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={save}
              className="btn-gold flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ── Coiffeurs (liste illimitée) & attribution des 6 sièges physiques ── */
function ChairsTab() {
  const { state, addBarber, renameBarber, deleteBarber, activateBarber, deactivateBarber, togglePauseBarber, assignChair } = useSalon();
  const [newName, setNewName] = useState('');
  const [pickingFor, setPickingFor] = useState<string | null>(null); // barber.id en cours de choix de siège (activation)
  const [reassignFor, setReassignFor] = useState<string | null>(null); // barber.id actif en cours de changement de siège

  const takenChairs = new Set(
    state.barbers.filter((b) => b.active && b.chairId).map((b) => b.chairId as number),
  );

  const lastEventFor = (name: string) =>
    state.presence.find((p) => p.barber === name);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addBarber(newName.trim());
    setNewName('');
  };

  return (
    <div className="space-y-6">
      {!state.open && (
        <div className="rounded-xl border border-ruby/40 bg-ruby/10 px-4 py-2.5 text-sm text-ruby">
          Salon fermé — tous les coiffeurs ont été passés automatiquement en Inactif
          et leurs sièges libérés. Chaque coiffeur peut se remettre en Actif ci-dessous.
        </div>
      )}

      {/* + Ajouter un Coiffeur */}
      <div className="card-lux p-4">
        <div className="font-medium text-cream mb-3">Équipe de coiffeurs ({state.barbers.length})</div>
        <div className="flex gap-2">
          <input
            className="input-lux"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Nom du nouveau coiffeur"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="btn-gold rounded-xl px-4 py-2 text-sm inline-flex items-center gap-1.5 shrink-0 disabled:opacity-40"
          >
            <Plus size={15} /> Ajouter un Coiffeur
          </button>
        </div>
      </div>

      {/* Liste des coiffeurs */}
      <div className="grid sm:grid-cols-2 gap-3">
        {state.barbers.map((b) => {
          const ev = lastEventFor(b.name);
          const picking = pickingFor === b.id;
          return (
            <div key={b.id} className={`card-lux p-4 ${b.active ? '!border-emerald-glow/30' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-display text-lg text-gold-soft flex items-center gap-2 min-w-0">
                  <BarberChairIcon size={22} className="text-gold shrink-0" dimmed={!b.active} />
                  <span className="truncate">{b.name}</span>
                  {b.active && (
                    <span className={`text-xs font-body shrink-0 ${b.paused ? 'text-amber-400' : 'text-emerald-glow'}`}>
                      · {b.chairId ? `Siège ${b.chairId}` : 'Sans siège'}{b.paused ? ' (pause)' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (b.active) {
                        deactivateBarber(b.id);
                        setPickingFor(null);
                      } else {
                        setPickingFor(picking ? null : b.id);
                      }
                    }}
                    title={b.active ? 'Passer Inactif — libère le siège' : 'Passer Actif — choisir un siège'}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold border transition-all ${
                      b.active && !b.paused
                        ? 'border-emerald-glow/50 text-emerald-glow bg-emerald-glow/10 glow-green'
                        : b.active && b.paused
                        ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                        : 'border-line text-muted hover:border-gold/40 hover:text-cream'
                    }`}
                  >
                    {b.active ? (b.paused ? '⏸ En Pause' : '● Actif') : '○ Inactif'}
                  </button>
                  {b.active && (
                    <button
                      type="button"
                      onClick={() => togglePauseBarber(b.id)}
                      title={b.paused ? 'Reprendre le travail (Actif)' : 'Passer En Pause — conserve le siège'}
                      className={`rounded-full px-2.5 py-1.5 text-xs font-bold border transition-all ${
                        b.paused
                          ? 'border-emerald-glow/50 text-emerald-glow hover:bg-emerald-glow/10'
                          : 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                      }`}
                    >
                      {b.paused ? '▶ Reprendre' : '⏸ Pause'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteBarber(b.id)}
                    aria-label={`Supprimer ${b.name}`}
                    className="rounded-lg border border-ruby/40 text-ruby/80 p-1.5 hover:bg-ruby/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Sélecteur de siège à l'activation — siège optionnel :
                  le statut Actif est indépendant de l'assignation d'un siège */}
              {picking && !b.active && (
                <div className="mt-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
                  <div className="text-[11px] uppercase tracking-widest text-gold-soft mb-2">
                    Choisir un siège (1 à 6) — optionnel
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((n) => {
                      const taken = takenChairs.has(n);
                      return (
                        <button
                          key={n}
                          type="button"
                          disabled={taken}
                          onClick={() => { activateBarber(b.id, n); setPickingFor(null); }}
                          title={taken ? `Siège ${n} occupé` : `Prendre le siège ${n}`}
                          className={`rounded-lg border py-2 text-sm font-bold transition-all ${
                            taken
                              ? 'border-line text-muted/40 cursor-not-allowed line-through'
                              : 'border-gold/50 text-gold-soft hover:bg-gold/15 glow-gold'
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => { activateBarber(b.id, null); setPickingFor(null); }}
                    className="mt-2 w-full rounded-lg border border-emerald-glow/40 text-emerald-glow py-2 text-xs font-bold hover:bg-emerald-glow/10 transition-colors"
                  >
                    ✓ Activer sans siège (tous occupés ou en renfort)
                  </button>
                </div>
              )}

              {/* Réattribution / échange de siège pour un coiffeur actif */}
              {b.active && (
                <div className="mt-3">
                  {reassignFor === b.id ? (
                    <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
                      <div className="text-[11px] uppercase tracking-widest text-gold-soft mb-2">
                        Nouveau siège — si occupé, les sièges seront échangés
                      </div>
                      <div className="grid grid-cols-6 gap-1.5">
                        {[1, 2, 3, 4, 5, 6].map((n) => {
                          const current = b.chairId === n;
                          const occupant = state.barbers.find(
                            (x) => x.active && x.chairId === n && x.id !== b.id,
                          );
                          return (
                            <button
                              key={n}
                              type="button"
                              disabled={current}
                              onClick={() => { assignChair(b.id, n); setReassignFor(null); }}
                              title={current ? 'Siège actuel' : occupant ? `Échanger avec ${occupant.name}` : `Prendre le siège ${n}`}
                              className={`rounded-lg border py-2 text-xs font-bold transition-all ${
                                current
                                  ? 'border-emerald-glow/50 text-emerald-glow cursor-default'
                                  : occupant
                                  ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                                  : 'border-gold/50 text-gold-soft hover:bg-gold/15'
                              }`}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 mt-2">
                        {b.chairId && (
                          <button
                            type="button"
                            onClick={() => { assignChair(b.id, null); setReassignFor(null); }}
                            className="flex-1 rounded-lg border border-line text-muted py-1.5 text-xs hover:text-cream transition-colors"
                          >
                            Libérer le siège
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setReassignFor(null)}
                          className="flex-1 rounded-lg border border-line text-muted py-1.5 text-xs hover:text-cream transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReassignFor(b.id)}
                      className="rounded-lg border border-gold/40 text-gold-soft px-3 py-1.5 text-xs font-semibold hover:bg-gold/10 transition-colors"
                    >
                      {b.chairId ? `⇄ Changer de siège (actuel : ${b.chairId})` : '+ Prendre un siège'}
                    </button>
                  )}
                </div>
              )}

              {ev && (
                <p className="text-[11px] text-muted mt-2">
                  Dernier pointage : {ev.action === 'actif' ? 'arrivée' : ev.action === 'pause' ? 'pause' : 'départ'} le{' '}
                  {new Date(ev.at).toLocaleDateString('fr-FR')} à{' '}
                  {new Date(ev.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              <label className="text-xs uppercase tracking-wide text-muted block mt-3">Nom du coiffeur</label>
              <input
                className="input-lux mt-1.5"
                value={b.name}
                onChange={(e) => renameBarber(b.id, e.target.value)}
              />
            </div>
          );
        })}
        {state.barbers.length === 0 && (
          <p className="text-muted text-sm text-center py-6 sm:col-span-2">
            Aucun coiffeur — ajoutez votre équipe ci-dessus.
          </p>
        )}
      </div>

      {/* État des 6 sièges physiques */}
      <div className="card-lux p-4">
        <div className="text-[11px] uppercase tracking-widest text-muted mb-3">État des 6 sièges physiques</div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {state.chairs.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border p-2.5 text-center ${
                c.active && c.paused
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : c.active
                  ? 'border-emerald-glow/40 bg-emerald-glow/5'
                  : 'border-line bg-obsidian/40'
              }`}
            >
              <BarberChairIcon size={26} className={`mx-auto ${c.active ? 'text-gold' : 'text-muted'}`} dimmed={!c.active} />
              <div className="text-xs font-semibold text-cream mt-1">Siège {c.id}</div>
              <div className={`text-[11px] truncate ${c.active && c.paused ? 'text-amber-400' : c.active ? 'text-emerald-glow' : 'text-muted'}`}>
                {c.active ? (c.paused ? `${c.barber} · pause` : c.barber) : 'Libre'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PresenceStats />
    </div>
  );
}

/* ── Statistiques de Présence / Heures de Pointe ── */
function PresenceStats() {
  const { state } = useSalon();
  const [filterBarber, setFilterBarber] = useState<string>('');

  const events = !filterBarber
    ? state.presence
    : state.presence.filter((p) => p.barber === filterBarber);

  // Heures de pointe : répartition des pointages "actif" (arrivées) par heure.
  const arrivalsByHour = new Map<number, number>();
  for (const p of state.presence) {
    if (p.action !== 'actif') continue;
    const h = new Date(p.at).getHours();
    arrivalsByHour.set(h, (arrivalsByHour.get(h) ?? 0) + 1);
  }
  const peakHours = [...arrivalsByHour.entries()].sort((a, b) => a[0] - b[0]);
  const maxArrivals = Math.max(1, ...peakHours.map(([, n]) => n));

  return (
    <div className="card-lux p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="font-medium text-cream flex items-center gap-2">
          <Clock size={16} className="text-gold" /> Statistiques de Présence / Heures de Pointe
        </div>
        <select
          className="input-lux !w-auto !py-2 text-sm"
          value={filterBarber}
          onChange={(e) => setFilterBarber(e.target.value)}
        >
          <option value="">Tous les coiffeurs</option>
          {state.barbers.map((b) => (
            <option key={b.id} value={b.name}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Heures de pointe (arrivées) */}
      {peakHours.length > 0 && (
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-widest text-muted mb-2">
            Heures de pointe (arrivées des coiffeurs)
          </div>
          <div className="space-y-1.5">
            {peakHours.map(([h, n]) => (
              <div key={h} className="grid grid-cols-[54px_1fr_auto] items-center gap-2 text-xs">
                <span className="text-muted">{String(h).padStart(2, '0')}:00</span>
                <div className="h-4 rounded-full bg-obsidian border border-line overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold"
                    style={{ width: `${(n / maxArrivals) * 100}%` }}
                  />
                </div>
                <span className="text-gold-soft font-semibold">×{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Journal de présence horodaté */}
      <div className="text-[11px] uppercase tracking-widest text-muted mb-2">
        Historique de présence ({events.length} pointage{events.length > 1 ? 's' : ''})
      </div>
      {events.length === 0 ? (
        <p className="text-muted text-sm py-4 text-center">
          Aucun pointage enregistré pour le moment. Chaque passage Actif/Inactif
          d’un coiffeur sera horodaté ici automatiquement.
        </p>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {events.slice(0, 100).map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-obsidian/40 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${p.action === 'actif' ? 'bg-emerald-glow' : p.action === 'pause' ? 'bg-amber-400' : 'bg-ruby'}`}
                />
                <span className="text-cream font-medium">{p.barber}</span>
                <span className="text-muted text-xs">Siège {p.chairId}</span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold ${p.action === 'actif' ? 'text-emerald-glow' : p.action === 'pause' ? 'text-amber-400' : 'text-ruby'}`}>
                  {p.action === 'actif' ? 'Arrivée (Actif)' : p.action === 'pause' ? 'Pause' : 'Départ (Inactif)'}
                </span>
                <span className="block text-[11px] text-muted">
                  {new Date(p.at).toLocaleDateString('fr-FR')} · {new Date(p.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Reads an image file, downsizes it and returns a compact Base64 data-URL. */
function fileToDataUrl(file: File, maxSize = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read error'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('decode error'));
      img.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/* ── Gallery manager ── */
function GalleryTab() {
  const { state, addCategory, deleteCategory, addPhoto, deletePhoto } = useSalon();
  const [catName, setCatName] = useState('');
  const [caption, setCaption] = useState('');
  const [catId, setCatId] = useState(state.categories[0]?.id ?? '');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addCat = () => {
    if (!catName.trim()) return;
    addCategory(catName.trim());
    setCatName('');
  };

  const handleFiles = async (files: FileList | File[]) => {
    const images = [...files].filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) {
      setUploadError('Veuillez sélectionner un fichier image (JPG, PNG, WEBP…).');
      return;
    }
    if (!catId) {
      setUploadError('Créez d’abord une catégorie pour classer la photo.');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      for (const f of images) {
        const dataUrl = await fileToDataUrl(f);
        addPhoto({ url: dataUrl, categoryId: catId, caption: caption.trim() || undefined });
      }
      setCaption('');
    } catch {
      setUploadError('Impossible de lire cette image. Essayez un autre fichier.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="card-lux p-4">
        <div className="font-medium text-cream mb-3">Catégories personnalisées</div>
        <div className="flex gap-2 mb-3">
          <input className="input-lux" value={catName} onChange={(e) => setCatName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCat()} placeholder="Nouvelle catégorie (ex : Nouveaux Styles)" />
          <button onClick={addCat} className="btn-gold rounded-xl px-4 py-2 text-sm inline-flex items-center gap-1.5 shrink-0">
            <Plus size={15} /> Créer
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.categories.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-sm text-gold-soft">
              {c.name}
              <button onClick={() => deleteCategory(c.id)} className="text-muted hover:text-ruby transition-colors" aria-label={`Supprimer ${c.name}`}>
                <Trash2 size={13} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Add photo — native file upload with drag & drop */}
      <div className="card-lux p-4">
        <div className="font-medium text-cream mb-3">Ajouter une photo</div>

        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted">Catégorie</label>
            <select className="input-lux mt-1.5" value={catId} onChange={(e) => setCatId(e.target.value)}>
              {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted">Légende (optionnel)</label>
            <input className="input-lux mt-1.5" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ex : Dégradé bas net" />
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          }}
          disabled={uploading}
          className={`w-full rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all cursor-pointer ${
            dragging
              ? 'border-gold bg-gold/10 glow-gold'
              : 'border-gold/30 bg-obsidian/40 hover:border-gold/60 hover:bg-gold/5'
          }`}
        >
          {uploading ? (
            <span className="inline-flex flex-col items-center gap-2 text-gold-soft">
              <Loader2 size={30} className="animate-spin" />
              <span className="text-sm font-medium">Traitement de l’image…</span>
            </span>
          ) : (
            <span className="inline-flex flex-col items-center gap-2">
              <UploadCloud size={30} className="text-gold" />
              <span className="text-sm font-medium text-cream">
                Cliquez pour choisir une photo <span className="text-muted">ou glissez-déposez ici</span>
              </span>
              <span className="text-xs text-muted">Depuis votre téléphone ou ordinateur · JPG, PNG, WEBP</span>
            </span>
          )}
        </button>
        {uploadError && <p className="text-ruby text-xs mt-2">{uploadError}</p>}
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {state.photos.map((p) => {
          const cat = state.categories.find((c) => c.id === p.categoryId);
          return (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-line">
              <img src={p.url} alt={p.caption ?? ''} className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                <span className="text-[11px] text-gold-soft text-center">{cat?.name ?? '—'}</span>
                <button
                  onClick={() => deletePhoto(p.id)}
                  className="rounded-lg border border-ruby/50 bg-ruby/15 text-ruby px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Trash2 size={13} /> Supprimer
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {state.photos.length === 0 && <p className="text-center text-muted text-sm">Aucune photo dans la galerie.</p>}
    </div>
  );
}
