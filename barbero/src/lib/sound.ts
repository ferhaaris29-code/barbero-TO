/**
 * Signal sonore Staff — carillon d'alerte (~5 s) synthétisé en Web Audio API.
 * Style notification de course (Yassir) : arpège clair et brillant répété
 * 4 fois, bien audible même à distance, sans fichier externe à charger.
 */
let audioCtx: AudioContext | null = null;

type AC = typeof AudioContext;
const getCtx = (): AudioContext | null => {
  try {
    const Ctor: AC | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx ??= new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
};

/** À appeler sur un geste utilisateur (login) pour débloquer l'audio. */
export function ensureAudioReady(): void {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  dur: number,
  peak: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // Harmonique brillante pour percer à distance
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.value = freq * 2;
  const gain2 = ctx.createGain();
  gain2.gain.value = 0.35;

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  osc.connect(gain);
  osc2.connect(gain2);
  gain2.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc2.start(start);
  osc.stop(start + dur + 0.05);
  osc2.stop(start + dur + 0.05);
}

/** Alias principal utilisé par le dashboard staff. */
export function playBookingChime(): void {
  playStaffChime();
}

/** Carillon d'alerte ≈ 5 secondes (4 vagues d'arpège A5–C#6–E6–A6). */
export function playStaffChime(): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();

  const t0 = ctx.currentTime + 0.05;
  const notes = [880, 1108.73, 1318.51, 1760]; // A5, C#6, E6, A6
  const WAVES = 4;
  const WAVE_LEN = 1.25; // 4 × 1.25 ≈ 5 s

  for (let w = 0; w < WAVES; w++) {
    const base = t0 + w * WAVE_LEN;
    notes.forEach((f, i) => tone(ctx, f, base + i * 0.16, 0.85, 0.32));
    // Cloche grave de renfort au début de chaque vague
    tone(ctx, 440, base, 0.5, 0.18);
  }
}
