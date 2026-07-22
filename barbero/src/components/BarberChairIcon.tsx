/**
 * Fauteuil de barbier vintage — cuir capitonné, trait doré fin.
 * Icône SVG dessinée sur mesure pour rester en accord avec le thème sombre/or.
 */
export default function BarberChairIcon({
  size = 34,
  className = '',
  dimmed = false,
}: {
  size?: number;
  className?: string;
  /** true = rendu atténué (coiffeur inactif / siège libre) */
  dimmed?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={dimmed ? { opacity: 0.45 } : undefined}
      aria-hidden="true"
    >
      {/* Appuie-tête */}
      <path d="M19 6.5h10a1.5 1.5 0 0 1 1.5 1.5v2.5h-13V8a1.5 1.5 0 0 1 1.5-1.5Z" />
      {/* Dossier capitonné */}
      <path d="M16.5 10.5h15a1 1 0 0 1 1 1V25h-17V11.5a1 1 0 0 1 1-1Z" />
      {/* Capitons (boutons du cuir) */}
      <circle cx="20.5" cy="15" r="0.5" fill="currentColor" />
      <circle cx="27.5" cy="15" r="0.5" fill="currentColor" />
      <circle cx="24" cy="18.5" r="0.5" fill="currentColor" />
      <circle cx="20.5" cy="22" r="0.5" fill="currentColor" />
      <circle cx="27.5" cy="22" r="0.5" fill="currentColor" />
      {/* Coutures en losange */}
      <path d="M20.5 15 24 18.5l3.5-3.5M20.5 22 24 18.5l3.5 3.5" strokeWidth="0.7" opacity="0.55" />
      {/* Accoudoirs */}
      <path d="M15.5 18.5a2 2 0 0 0-2 2V26a1.5 1.5 0 0 0 1.5 1.5h1" />
      <path d="M32.5 18.5a2 2 0 0 1 2 2V26a1.5 1.5 0 0 1-1.5 1.5h-1" />
      {/* Assise */}
      <path d="M15 25h18a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 33 30H15a1.5 1.5 0 0 1-1.5-1.5v-2A1.5 1.5 0 0 1 15 25Z" />
      {/* Colonne hydraulique */}
      <path d="M24 30v5" />
      <path d="M22 35h4" strokeWidth="2.2" />
      {/* Repose-pieds */}
      <path d="M24 33.5l6.5 4" />
      <path d="M29 36.2l3.2 2" strokeWidth="2" />
      {/* Piètement étoilé vintage */}
      <path d="M24 35v4.5" />
      <path d="M24 39.5 16.5 43M24 39.5 31.5 43M24 39.5v3.8" />
      <circle cx="24" cy="39.5" r="1.3" />
    </svg>
  );
}
