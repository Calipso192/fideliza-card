/**
 * Generador de Afiche Imprimible A4 y A6 - FidelizaCard (v2.5)
 * Responsabilidades:
 * - Componer afiche publicitario en alta resolucion (300 DPI aprox) en Canvas
 * - Distribuir verticalmente logo, titular, QR, capsula de premio y pie sin solapes
 * - Exportar descarga directa en PNG listo para imprimir o plastificar
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { getBusinessConfig, getBusinessTheme } from '../config.js';

const FORMAT_SPECS = {
  A4: { width: 1240, height: 1754, suffix: 'afiche-a4' },
  A6: { width: 1050, height: 1485, suffix: 'tarjeta-a6' }
};

function loadImageSafe(src) {
  return new Promise(function (resolve) {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      resolve(img);
    };
    img.onerror = function () {
      resolve(null);
    };
    img.src = src;
  });
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapCenteredText(ctx, text, centerX, startY, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  let line = '';
  let currentY = startY;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? line + ' ' + words[i] : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth) {
      if (line) {
        ctx.fillText(line, centerX, currentY);
        line = words[i];
        currentY += lineHeight;
      } else {
        ctx.fillText(testLine, centerX, currentY);
        line = '';
        currentY += lineHeight;
      }
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, centerX, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

export async function generateAndDownloadPoster(formatKey, qrUrl) {
  const spec = FORMAT_SPECS[formatKey] ? FORMAT_SPECS[formatKey] : FORMAT_SPECS.A4;
  const config = getBusinessConfig();
  const theme = getBusinessTheme();

  const w = spec.width;
  const h = spec.height;
  const cx = w / 2;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const bgPrimary = theme.bgPrimary ? theme.bgPrimary : '#f7f3eb';
  const bgCard = theme.bgCard ? theme.bgCard : '#fffdf9';
  const accent = theme.accent ? theme.accent : '#c4623d';
  const bannerBg = theme.bannerBg ? theme.bannerBg : accent;
  const stampFill = theme.stampFill ? theme.stampFill : '#f4e4ce';
  const textPrimary = theme.textPrimary ? theme.textPrimary : '#2c221a';
  const textSecondary = theme.textSecondary ? theme.textSecondary : '#6e5d4f';
  const borderCard = theme.borderCard ? theme.borderCard : '#e5dccb';

  const bizName = config.name ? String(config.name).toUpperCase() : 'FIDELIZACARD';
  const targetStamps = config.targetStamps ? Number(config.targetStamps) : 8;
  const rewardText = config.rewardDescription ? config.rewardDescription : 'Premio especial';

  let logoSrc = '';
  if (config.logo) {
    logoSrc = config.logo.indexOf('http') === 0 ? config.logo : '../' + config.logo;
  }

  const qrSize = Math.round(w * 0.39);
  const qrEndpoint =
    'https://api.qrserver.com/v1/create-qr-code/?size=' +
    qrSize +
    'x' +
    qrSize +
    '&margin=10&format=png&data=' +
    encodeURIComponent(qrUrl);

  const results = await Promise.all([loadImageSafe(logoSrc), loadImageSafe(qrEndpoint)]);
  const logoImg = results[0];
  const qrImg = results[1];

  // 1. Fondo general
  ctx.fillStyle = bgPrimary;
  ctx.fillRect(0, 0, w, h);

  // 2. Franja superior de marca
  const headerH = Math.round(h * 0.19);
  ctx.fillStyle = bannerBg;
  ctx.fillRect(0, 0, w, headerH);

  // 3. Tarjeta central elevada
  const marginX = Math.round(w * 0.08);
  const cardTop = Math.round(headerH * 0.56);
  const cardW = w - marginX * 2;
  const cardH = h - cardTop - Math.round(h * 0.055);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 12;
  drawRoundedRect(ctx, marginX, cardTop, cardW, cardH, Math.round(w * 0.036));
  ctx.fillStyle = bgCard;
  ctx.fill();
  ctx.restore();

  drawRoundedRect(ctx, marginX, cardTop, cardW, cardH, Math.round(w * 0.036));
  ctx.lineWidth = 4;
  ctx.strokeStyle = borderCard;
  ctx.stroke();

  // 4. Medallon circular para el logotipo
  const logoRadius = Math.round(w * 0.088);
  const logoCenterY = cardTop;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, logoCenterY, logoRadius + 8, 0, Math.PI * 2);
  ctx.fillStyle = bgCard;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = accent;
  ctx.stroke();
  ctx.restore();

  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, logoCenterY, logoRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      logoImg,
      cx - logoRadius,
      logoCenterY - logoRadius,
      logoRadius * 2,
      logoRadius * 2
    );
    ctx.restore();
  } else {
    ctx.fillStyle = stampFill;
    ctx.beginPath();
    ctx.arc(cx, logoCenterY, logoRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.font = 'bold ' + Math.round(w * 0.056) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bizName.slice(0, 2), cx, logoCenterY);
  }

  // 5. Nombre del negocio y titular comercial
  let cursorY = logoCenterY + logoRadius + Math.round(h * 0.042);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = accent;
  ctx.font = '800 ' + Math.round(w * 0.034) + 'px sans-serif';
  ctx.fillText(bizName, cx, cursorY);

  cursorY += Math.round(h * 0.048);
  ctx.fillStyle = textPrimary;
  ctx.font = '900 ' + Math.round(w * 0.048) + 'px sans-serif';
  cursorY = wrapCenteredText(
    ctx,
    '¡ESCANEA Y GANA TU 1ER SELLO GRATIS!',
    cx,
    cursorY,
    cardW - 90,
    Math.round(w * 0.058)
  );

  cursorY += Math.round(h * 0.008);
  ctx.fillStyle = textSecondary;
  ctx.font = '600 ' + Math.round(w * 0.026) + 'px sans-serif';
  cursorY = wrapCenteredText(
    ctx,
    'Activa tu tarjeta digital sin descargar apps ni llenar papeles.',
    cx,
    cursorY,
    cardW - 110,
    Math.round(w * 0.035)
  );

  // 6. Marco blanco del codigo QR
  const qrFramePad = Math.round(w * 0.024);
  const qrBoxSize = qrSize + qrFramePad * 2;
  const qrBoxX = cx - qrBoxSize / 2;
  const qrBoxY = cursorY + Math.round(h * 0.02);

  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, Math.round(w * 0.026));
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = accent;
  ctx.stroke();

  if (qrImg) {
    ctx.drawImage(qrImg, qrBoxX + qrFramePad, qrBoxY + qrFramePad, qrSize, qrSize);
  } else {
    ctx.fillStyle = textSecondary;
    ctx.font = '700 ' + Math.round(w * 0.025) + 'px sans-serif';
    ctx.fillText('Verifica tu conexion para generar QR', cx, qrBoxY + qrBoxSize / 2);
  }

  // 7. Capsula inferior de recompensa
  const rewardBoxY = qrBoxY + qrBoxSize + Math.round(h * 0.032);
  const rewardBoxW = cardW - Math.round(w * 0.1);
  const rewardBoxX = cx - rewardBoxW / 2;
  const rewardBoxH = Math.round(h * 0.115);

  drawRoundedRect(ctx, rewardBoxX, rewardBoxY, rewardBoxW, rewardBoxH, Math.round(w * 0.022));
  ctx.fillStyle = stampFill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = '800 ' + Math.round(w * 0.023) + 'px sans-serif';
  ctx.fillText(
    'JUNTA ' + targetStamps + ' SELLOS Y LLÉVATE GRATIS:',
    cx,
    rewardBoxY + Math.round(rewardBoxH * 0.36)
  );

  ctx.fillStyle = textPrimary;
  ctx.font = '900 ' + Math.round(w * 0.033) + 'px sans-serif';
  wrapCenteredText(
    ctx,
    rewardText,
    cx,
    rewardBoxY + Math.round(rewardBoxH * 0.74),
    rewardBoxW - 48,
    Math.round(w * 0.038)
  );

  // 8. Pie de instrucciones rapidas separado debajo de la capsula
  const footerY = rewardBoxY + rewardBoxH + Math.round(h * 0.034);
  ctx.fillStyle = textSecondary;
  ctx.font = '700 ' + Math.round(w * 0.02) + 'px sans-serif';
  ctx.fillText(
    '1. Apunta con tu camara   ·   2. Registrate   ·   3. Suma sellos en cada visita',
    cx,
    footerY
  );

  const safeBiz = bizName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const link = document.createElement('a');
  link.download = spec.suffix + '-' + safeBiz + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();

  return true;
}
