import type { Booking, SalonState } from './types';

/**
 * Ticket de caisse — fond blanc propre, texte noir lisible.
 * Rendu sur canvas puis téléchargement PNG fiable (desktop + mobile),
 * avec repli automatique vers window.print() si le téléchargement échoue.
 */
export async function downloadTicket(booking: Booking, state: SalonState): Promise<void> {
  const services = state.services.filter((s) => booking.serviceIds.includes(s.id));
  const total = services.reduce((a, s) => a + s.price, 0);
  const chair = booking.chairId ? state.chairs.find((c) => c.id === booking.chairId) : null;
  const created = new Date(booking.createdAt);

  try {
    await document.fonts.ready;
  } catch {
    /* older browsers — proceed anyway */
  }

  // Logo du salon (non bloquant).
  const logo = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/logo.png';
  });

  const logoH = logo ? 120 : 0;
  const W = 560;
  const rowH = 38;
  const H = 620 + logoH + services.length * rowH;
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    printTicket(booking, state, services, total, chair?.barber ?? null, chair?.id ?? null);
    return;
  }
  ctx.scale(scale, scale);

  // ── Fond gris très clair style papier reçu ──
  const ink = '#18181b';       // texte principal (noir foncé)
  const soft = '#3f3f46';      // texte secondaire anthracite contrasté
  const gold = '#27272a';      // titres de section anthracite foncé
  const border = '#a1a1aa';

  ctx.fillStyle = '#f4f4f5';
  ctx.fillRect(0, 0, W, H);

  // Bord perforé haut/bas (style ticket de caisse)
  ctx.fillStyle = '#e4e4e7';
  for (let x = 10; x < W; x += 22) {
    ctx.beginPath(); ctx.arc(x, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, H, 5, 0, Math.PI * 2); ctx.fill();
  }

  // Cadre discret
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 14, W - 28, H - 28);

  let y = 48;

  // Logo en haut
  if (logo) {
    const lh = 100;
    const lw = (logo.width / logo.height) * lh;
    ctx.drawImage(logo, (W - lw) / 2, y - 8, lw, lh);
    y += lh + 16;
  } else {
    y += 14;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = ink;
  ctx.font = '30px Marcellus, Georgia, serif';
  ctx.fillText('BARBERO SALON', W / 2, y);
  y += 24;
  ctx.fillStyle = soft;
  ctx.font = '14px Jost, sans-serif';
  ctx.fillText('Tizi Ouzou \u2014 L\u2019art du d\u00e9tail et de l\u2019\u00e9l\u00e9gance', W / 2, y);
  y += 16;
  ctx.fillText('T\u00e9l : 05 49 45 20 36', W / 2, y);
  y += 26;

  dashedLine(ctx, 36, y, W - 36, border);
  y += 44;

  // Numéro de ticket
  ctx.fillStyle = ink;
  ctx.font = '700 46px Jost, sans-serif';
  ctx.fillText(`TICKET N\u00b0 ${booking.ticketNo}`, W / 2, y);
  y += 40;

  ctx.textAlign = 'left';
  const label = (l: string, v: string) => {
    ctx.fillStyle = soft;
    ctx.font = '13px Jost, sans-serif';
    ctx.fillText(l.toUpperCase(), 44, y);
    ctx.fillStyle = ink;
    ctx.font = '500 16px Jost, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(v, W - 44, y);
    ctx.textAlign = 'left';
    y += 30;
  };

  label('Client', `${booking.prenom} ${booking.nom}`);
  label('T\u00e9l\u00e9phone', booking.tel);
  label(
    'Arriv\u00e9e en file',
    created.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) +
      ' \u00e0 ' +
      created.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  );
  label('Si\u00e8ge / Coiffeur', chair ? `Si\u00e8ge ${chair.id} \u2014 ${chair.barber}` : 'Sans pr\u00e9f\u00e9rence');

  y += 6;
  dashedLine(ctx, 36, y, W - 36, border);
  y += 32;

  ctx.fillStyle = gold;
  ctx.font = '700 14px Jost, sans-serif';
  ctx.fillText('PRESTATIONS', 44, y);
  y += 28;

  for (const s of services) {
    ctx.fillStyle = ink;
    ctx.font = '15px Jost, sans-serif';
    ctx.fillText(s.name, 44, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${s.price.toLocaleString('fr-DZ')} DA`, W - 44, y);
    ctx.textAlign = 'left';
    y += rowH;
  }

  y += 2;
  dashedLine(ctx, 36, y, W - 36, border);
  y += 40;

  // Total
  ctx.fillStyle = ink;
  ctx.font = '700 24px Jost, sans-serif';
  ctx.fillText('TOTAL', 44, y);
  ctx.textAlign = 'right';
  ctx.fillText(`${total.toLocaleString('fr-DZ')} DA`, W - 44, y);
  ctx.textAlign = 'center';
  y += 44;

  ctx.fillStyle = soft;
  ctx.font = 'italic 13px Jost, sans-serif';
  ctx.fillText('Merci de votre confiance \u2014 pr\u00e9sentez ce ticket \u00e0 votre arriv\u00e9e', W / 2, y);

  const filename = `ticket-${booking.ticketNo}.png`;

  // 1) Téléchargement Blob + object URL (fiable desktop / Android / iOS moderne)
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (blob) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 5000);
      return;
    } catch {
      /* fall through */
    }
  }

  // 2) Repli : ancre data-URL
  try {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  } catch {
    /* fall through */
  }

  // 3) Dernier recours : fenêtre d'impression avec l'image du ticket
  const dataUrl = canvas.toDataURL('image/png');
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(
      `<html><head><title>Ticket N\u00b0 ${booking.ticketNo}</title>` +
      `<style>body{margin:0;background:#fff;display:flex;justify-content:center;padding:16px}img{max-width:100%;height:auto}</style>` +
      `</head><body><img src="${dataUrl}" alt="Ticket" onload="setTimeout(function(){window.print()},300)"/></body></html>`,
    );
    win.document.close();
  }
}

/** Impression directe du ticket (window.print) — reçu blanc propre. */
export function printTicket(
  booking: Booking,
  state: SalonState,
  servicesArg?: { name: string; price: number }[],
  totalArg?: number,
  barberArg?: string | null,
  chairIdArg?: number | null,
): void {
  const services =
    servicesArg ?? state.services.filter((s) => booking.serviceIds.includes(s.id));
  const total = totalArg ?? services.reduce((a, s) => a + s.price, 0);
  const chair = booking.chairId ? state.chairs.find((c) => c.id === booking.chairId) : null;
  const barber = barberArg !== undefined ? barberArg : chair?.barber ?? null;
  const chairId = chairIdArg !== undefined ? chairIdArg : chair?.id ?? null;
  const created = new Date(booking.createdAt);

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"/>
<title>Ticket N\u00b0 ${booking.ticketNo} \u2014 Barbero Salon</title>
<style>
  body{font-family:'Jost',Arial,sans-serif;background:#fff;color:#111827;max-width:420px;margin:0 auto;padding:28px 24px}
  .head{text-align:center}
  .head img{height:90px}
  h1{font-family:Georgia,serif;font-size:24px;letter-spacing:3px;margin:8px 0 2px}
  .sub{color:#6b7280;font-size:13px;margin:0}
  .num{text-align:center;font-size:34px;font-weight:700;margin:18px 0}
  hr{border:none;border-top:1px dashed #d1d5db;margin:14px 0}
  table{width:100%;border-collapse:collapse;font-size:15px}
  td{padding:5px 0}
  td:last-child{text-align:right}
  .lbl{color:#6b7280;font-size:12px;text-transform:uppercase}
  .total td{font-size:20px;font-weight:700;padding-top:10px}
  .total td:last-child{color:#b8860b}
  .foot{text-align:center;color:#6b7280;font-size:12px;font-style:italic;margin-top:18px}
</style></head><body>
  <div class="head">
    <img src="/logo.png" alt="" onerror="this.style.display='none'"/>
    <h1>BARBERO SALON</h1>
    <p class="sub">Tizi Ouzou \u2014 L\u2019art du d\u00e9tail et de l\u2019\u00e9l\u00e9gance</p>
    <p class="sub">T\u00e9l : 05 49 45 20 36</p>
  </div>
  <hr/>
  <div class="num">TICKET N\u00b0 ${booking.ticketNo}</div>
  <table>
    <tr><td class="lbl">Client</td><td>${booking.prenom} ${booking.nom}</td></tr>
    <tr><td class="lbl">T\u00e9l\u00e9phone</td><td>${booking.tel}</td></tr>
    <tr><td class="lbl">Arriv\u00e9e</td><td>${created.toLocaleDateString('fr-FR')} \u00e0 ${created.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td></tr>
    <tr><td class="lbl">Si\u00e8ge / Coiffeur</td><td>${barber ? `Si\u00e8ge ${chairId} \u2014 ${barber}` : 'Sans pr\u00e9f\u00e9rence'}</td></tr>
  </table>
  <hr/>
  <table>
    ${services.map((s) => `<tr><td>${s.name}</td><td>${s.price.toLocaleString('fr-DZ')} DA</td></tr>`).join('')}
    <tr class="total"><td>TOTAL</td><td>${total.toLocaleString('fr-DZ')} DA</td></tr>
  </table>
  <p class="foot">Merci de votre confiance \u2014 pr\u00e9sentez ce ticket \u00e0 votre arriv\u00e9e</p>
  <script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script>
</body></html>`);
  win.document.close();
}

function dashedLine(ctx: CanvasRenderingContext2D, x1: number, y: number, x2: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}
