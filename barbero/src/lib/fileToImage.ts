import html2canvas from 'html2canvas';

/**
 * Convertisseur universel fichier → image de fond (data-URL JPEG).
 *
 * Formats gérés :
 *  - Images natives : JPG, JPEG, PNG, WEBP, GIF (1re frame), SVG, BMP, AVIF…
 *  - PDF  : rendu de la PREMIÈRE PAGE via pdf.js (import dynamique).
 *  - HTML : rendu du contenu dans une iframe sandbox puis capture html2canvas.
 *  - Autres : tentative de décodage image, sinon erreur explicite.
 */
export async function fileToHeroImage(file: File, maxSize = 1920): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return pdfToImage(file, maxSize);
  }
  if (type === 'text/html' || name.endsWith('.html') || name.endsWith('.htm')) {
    return htmlToImage(file, maxSize);
  }
  // Images (y compris SVG et GIF) + tentative générique pour le reste.
  return rasterToImage(file, maxSize);
}

/* ── Images natives (JPG/PNG/WEBP/GIF/SVG/…) ── */
function rasterToImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read error'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode error'));
      img.onload = () => {
        // SVG sans dimensions : fallback 1600×900.
        const w0 = img.naturalWidth || 1600;
        const h0 = img.naturalHeight || 900;
        const ratio = Math.min(1, maxSize / Math.max(w0, h0));
        const w = Math.max(1, Math.round(w0 * ratio));
        const h = Math.max(1, Math.round(h0 * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(reader.result as string); return; }
        ctx.fillStyle = '#0b0d10';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/* ── PDF : première page rendue via pdf.js ── */
async function pdfToImage(file: File, maxSize: number): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(1); // première page

  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, maxSize / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas error');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  await pdf.destroy();
  return canvas.toDataURL('image/jpeg', 0.85);
}

/* ── HTML : rendu dans une iframe sandbox puis capture ── */
async function htmlToImage(file: File, maxSize: number): Promise<string> {
  const html = await file.text();

  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-same-origin');
  iframe.style.cssText =
    `position:fixed;left:-10000px;top:0;width:${Math.min(maxSize, 1280)}px;height:800px;border:0;visibility:hidden;`;
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 8000);
      iframe.onload = () => { clearTimeout(timer); resolve(); };
      iframe.srcdoc = html;
    });
    // Laisse le temps aux styles/polices de s'appliquer.
    await new Promise((r) => setTimeout(r, 400));

    const doc = iframe.contentDocument;
    if (!doc?.body) throw new Error('no document');
    if (!doc.body.style.background && !doc.body.getAttribute('bgcolor')) {
      doc.body.style.background = '#ffffff';
    }

    const canvas = await html2canvas(doc.body, {
      backgroundColor: '#ffffff',
      scale: 1.5,
      useCORS: true,
      logging: false,
      windowWidth: iframe.clientWidth,
    });
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    iframe.remove();
  }
}
