/**
 * Aplicador de Paleta Cromatica de Marca - FidelizaCard (v2.2)
 * Responsabilidades:
 * - Leer el objeto theme desde scripts/config.js
 * - Sobrescribir variables CSS globales en :root para adaptar toda la interfaz al negocio
 * - Actualizar la etiqueta meta theme-color del navegador movil
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { getBusinessTheme } from '../config.js';

function hexToRgba(hex, alpha) {
  if (!hex) {
    return '';
  }
  const clean = String(hex).trim().replace('#', '');
  if (clean.length !== 6) {
    return '';
  }
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r)) {
    return '';
  }
  if (isNaN(g)) {
    return '';
  }
  if (isNaN(b)) {
    return '';
  }
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

export function applyBusinessTheme() {
  const theme = getBusinessTheme();
  if (!theme) {
    return;
  }

  const rootStyle = document.documentElement.style;

  if (theme.bgPrimary) {
    rootStyle.setProperty('--bg-primary', theme.bgPrimary);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme.bgPrimary);
    }
  }

  if (theme.bgSurface) {
    rootStyle.setProperty('--bg-surface', theme.bgSurface);
  }

  if (theme.bgCard) {
    rootStyle.setProperty('--bg-card', theme.bgCard);
  }

  if (theme.accent) {
    rootStyle.setProperty('--color-gold', theme.accent);
    rootStyle.setProperty('--border-focus', theme.accent);
    const glow = hexToRgba(theme.accent, 0.18);
    if (glow) {
      rootStyle.setProperty('--color-gold-glow', glow);
    }
  }

  if (theme.accentHover) {
    rootStyle.setProperty('--color-gold-hover', theme.accentHover);
  }

  if (theme.stampFill) {
    rootStyle.setProperty('--color-stamp-fill', theme.stampFill);
  }

  if (theme.textPrimary) {
    rootStyle.setProperty('--text-primary', theme.textPrimary);
  }

  if (theme.textSecondary) {
    rootStyle.setProperty('--text-secondary', theme.textSecondary);
  }

  if (theme.borderCard) {
    rootStyle.setProperty('--border-card', theme.borderCard);
  }
}
