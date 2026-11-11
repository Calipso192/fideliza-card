/**
 * Generador universal y compatible de codigos QR sobre Canvas HTML5
 * Responsabilidad: Dibujar y exportar QRs 100% legibles por camaras nativas
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

export function renderQRCode(canvas, text) {
  if (!canvas) {
    return;
  }

  const safeText = text ? String(text).trim() : 'https://calipso192.github.io/fideliza-card/';
  const ctx = canvas.getContext('2d');
  const width = canvas.width ? canvas.width : 260;
  const height = canvas.height ? canvas.height : 260;

  canvas.width = width;
  canvas.height = height;

  // Fondo blanco base preventivo
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Generador estandar compatible con camaras moviles y Google Lens
  const qrEndpoint = 'https://api.qrserver.com/v1/create-qr-code/?size=' + width + 'x' + height + '&margin=12&format=png&data=' + encodeURIComponent(safeText);

  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = function () {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
  };

  img.onerror = function () {
    // Fallback de contingencia con QuickChart
    const fallbackUrl = 'https://quickchart.io/qr?text=' + encodeURIComponent(safeText) + '&size=' + width + '&margin=2';
    const fallbackImg = new Image();
    fallbackImg.crossOrigin = 'anonymous';
    fallbackImg.onload = function () {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(fallbackImg, 0, 0, width, height);
    };
    fallbackImg.src = fallbackUrl;
  };

  img.src = qrEndpoint;
}

export function downloadQRCode(canvas, filename) {
  if (!canvas) {
    return;
  }
  const safeFilename = filename ? filename : 'qr-mostrador.png';
  const link = document.createElement('a');
  link.download = safeFilename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
