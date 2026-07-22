import { useEffect, useState } from 'react';

/**
 * Preloader — écran de chargement plein écran affiché au démarrage.
 * Fond sombre identique au site (#0E0E10), logo Barbero centré,
 * barre de progression dorée lumineuse animée de 0 % à 100 % en 2 s,
 * puis disparition en fondu doux pour une transition 100 % fluide.
 */
export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Lance l'animation de la barre juste après le premier rendu (0 → 100 %).
    const raf = requestAnimationFrame(() => setProgress(100));

    // Après 2 s (barre à 100 %) : démarre le fondu de sortie.
    const fadeTimer = setTimeout(() => setFading(true), 2000);
    // Retire complètement l'écran une fois le fondu terminé.
    const hideTimer = setTimeout(() => setHidden(true), 2600);
    // Sécurité absolue : jamais plus de 5 s à l'écran.
    const failsafe = setTimeout(() => setHidden(true), 5000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
      clearTimeout(failsafe);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#0E0E10',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '30px',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.6s ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {/* Logo Barbero net, centré, avec halo doré sur fond sombre */}
      <img
        src="/logo.png"
        alt="Barbero Salon"
        style={{
          height: 'clamp(140px, 28vw, 220px)',
          width: 'auto',
          display: 'block',
          filter: 'drop-shadow(0 0 24px rgba(212, 175, 55, 0.35))',
        }}
        draggable={false}
      />

      {/* Nom du salon en clair/doré — Barbero المحطة */}
      <div
        style={{
          fontFamily: 'Marcellus, Georgia, serif',
          color: '#d4af37',
          letterSpacing: '0.2em',
          fontSize: 'clamp(15px, 2.8vw, 19px)',
          marginTop: '-8px',
          display: 'flex',
          alignItems: 'baseline',
          gap: '10px',
        }}
      >
        <span style={{ textTransform: 'uppercase' }}>Barbero</span>
        <span dir="rtl" lang="ar" style={{ letterSpacing: 'normal' }}>المحطة</span>
      </div>

      {/* Barre de progression dorée intense, lumineuse sur fond noir */}
      <div
        style={{
          width: 'min(260px, 60vw)',
          height: '5px',
          borderRadius: '999px',
          backgroundColor: 'rgba(212, 175, 55, 0.14)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: '999px',
            background: 'linear-gradient(90deg, #b8860b, #d4af37, #f1dd8a)',
            boxShadow: '0 0 12px rgba(212, 175, 55, 0.8), 0 0 28px rgba(212, 175, 55, 0.4)',
            width: `${progress}%`,
            transition: 'width 2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
}
