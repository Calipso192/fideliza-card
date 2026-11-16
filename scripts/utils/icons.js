/**
 * Libreria de Iconos Vectoriales SVG - FidelizaCard (v2.2)
 * Responsabilidades:
 * - Proveer iconos SVG tematicos para sellos segun el rubro del negocio
 * - Proveer iconos limpios de redes sociales y mensajeria WhatsApp
 * - Proveer iconos operativos para botones personalizados de caja y demo
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

const STAMP_PATHS = {
  burger: [
    'M4 11h16a1 1 0 0 1 1 1v.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 12.5V12a1 1 0 0 1 1-1z',
    'M5 11C5 7.5 8.1 5 12 5s7 2.5 7 6',
    'M4.5 14l1.5 1.5L7.5 14 9 15.5l1.5-1.5L12 15.5l1.5-1.5L15 15.5l1.5-1.5L18 15.5l1.5-1.5',
    'M5 16h14v1.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V16z'
  ],
  coffee: [
    'M17 8h1a4 4 0 1 1 0 8h-1',
    'M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z',
    'M6 2v3',
    'M10 2v3',
    'M14 2v3'
  ],
  pizza: [
    'M12 3L3 19a18.5 18.5 0 0 0 18 0L12 3z',
    'M5.2 15.2a14 14 0 0 1 13.6 0',
    'M10.5 10.5h.01',
    'M13.5 13h.01',
    'M9.5 14h.01'
  ],
  cupcake: [
    'M6 14l1.5 6h9L18 14',
    'M4.5 14h15a1.5 1.5 0 0 0 .8-2.8C19.5 8.5 16.2 7 12 7s-7.5 1.5-8.3 4.2A1.5 1.5 0 0 0 4.5 14z',
    'M12 7c0-1.7 1.3-3 3-3'
  ],
  taco: [
    'M3 16a9 9 0 0 1 18 0H3z',
    'M6 16a6 6 0 0 1 12 0',
    'M9 12.5h.01',
    'M12 11.5h.01',
    'M15 12.5h.01'
  ],
  star: [
    'M12 2.8l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L3 9.4l6.2-.9L12 2.8z'
  ]
};

const SOCIAL_PATHS = {
  instagram: [
    'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z',
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    'M17.2 6.8h.01'
  ],
  tiktok: [
    'M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5'
  ],
  facebook: [
    'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z'
  ],
  whatsapp: [
    'M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.2A8.5 8.5 0 1 1 20.5 11.5z',
    'M9.5 9.2c.2-.5.5-.5.8-.5h.6c.2 0 .4.1.5.4l.7 1.7c.1.2.1.5-.1.7l-.5.6c.6 1.1 1.5 2 2.6 2.6l.6-.5c.2-.2.5-.2.7-.1l1.7.7c.3.1.4.3.4.5v.6c0 .3 0 .6-.5.8-.7.3-2.1.4-4.1-.6-2.1-1-3.6-2.8-4.2-4.4-.7-1.6-.4-2.8-.2-3.5z'
  ]
};

const UI_PATHS = {
  qr: [
    'M3 7V5a2 2 0 0 1 2-2h2',
    'M17 3h2a2 2 0 0 1 2 2v2',
    'M21 17v2a2 2 0 0 1-2 2h-2',
    'M7 21H5a2 2 0 0 1-2-2v-2',
    'M7 7h4v4H7z',
    'M13 7h4v4h-4z',
    'M7 13h4v4H7z',
    'M14 14h3v3'
  ],
  whatsapp: SOCIAL_PATHS.whatsapp,
  gift: [
    'M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8',
    'M2 7h20v5H2z',
    'M12 21V7',
    'M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7z',
    'M12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z'
  ],
  copy: [
    'M9 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z',
    'M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1'
  ],
  check: [
    'M20 6L9 17l-5-5'
  ],
  refresh: [
    'M21 12a9 9 0 0 1-15.4 6.4L3 16',
    'M3 20v-4h4',
    'M3 12a9 9 0 0 1 15.4-6.4L21 8',
    'M21 4v4h-4'
  ],
  eye: [
    'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z',
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'
  ],
  eyeOff: [
    'M3 3l18 18',
    'M10.6 10.6a2 2 0 0 0 2.8 2.8',
    'M9.9 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2',
    'M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7c1.6 0 3.1-.4 4.4-1.1'
  ],
  external: [
    'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
    'M15 3h6v6',
    'M10 14L21 3'
  ]
};

function buildSvgElement(pathList, className, size) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const px = size ? String(size) : '20';
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', px);
  svg.setAttribute('height', px);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (className) {
    svg.setAttribute('class', className);
  }

  for (let i = 0; i < pathList.length; i++) {
    const pathEl = document.createElementNS(SVG_NS, 'path');
    pathEl.setAttribute('d', pathList[i]);
    svg.appendChild(pathEl);
  }

  return svg;
}

export function createStampThemeIcon(themeName, className, size) {
  const key = themeName ? String(themeName).toLowerCase() : 'burger';
  const paths = STAMP_PATHS[key] ? STAMP_PATHS[key] : STAMP_PATHS.burger;
  return buildSvgElement(paths, className, size);
}

export function createSocialIcon(network, className, size) {
  const key = network ? String(network).toLowerCase() : 'instagram';
  const paths = SOCIAL_PATHS[key] ? SOCIAL_PATHS[key] : SOCIAL_PATHS.instagram;
  return buildSvgElement(paths, className, size);
}

export function createUiIcon(iconName, className, size) {
  const key = iconName ? String(iconName) : 'qr';
  const paths = UI_PATHS[key] ? UI_PATHS[key] : UI_PATHS.qr;
  return buildSvgElement(paths, className, size);
}
