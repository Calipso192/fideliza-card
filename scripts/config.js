/**
 * Configuracion estatica de fabrica - FidelizaCard (v2.2)
 * Responsabilidades:
 * - Centralizar datos de marca, icono tematico de sello, metas y PIN de cajero
 * - Definir paleta cromatica adaptable por negocio (fondo, tarjeta, acentos y sellos)
 * - Centralizar redes sociales dinamicas y plantillas de notificaciones locales
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

export const CONFIG = {
  business: {
    name: 'BLAP · STREET FOOD',
    logo: 'assets/logo.png',
    stampIcon: 'burger',
    targetStamps: 8,
    rewardDescription: '1 Hamburguesa Clasica + Gaseosa',
    cashierPin: '1234',
    whatsappDelivery: '51918760291',
    whatsappMessage: '¡Hola! Quiero hacer un pedido por delivery y sumar sellos a mi tarjeta.',
    googleMapsReviewUrl: 'https://maps.google.com',
    theme: {
      bgPrimary: '#f7f3eb',
      bgSurface: '#efe8db',
      bgCard: '#fffdf9',
      accent: '#c4623d',
      accentHover: '#a84f2e',
      stampFill: '#f4e4ce',
      textPrimary: '#2c221a',
      textSecondary: '#6e5d4f',
      borderCard: '#e5dccb'
    },
    socials: {
      instagramUrl: 'https://instagram.com',
      tiktokUrl: 'https://tiktok.com',
      facebookUrl: ''
    }
  },
  notifications: {
    day5Reminder: '¿Con antojo hoy? Tienes {stamps} sellos esperandote en {business}. ¡Vuelve por tu favorito!',
    day10Reminder: '¡Te extrañamos en {business}! Solo te faltan {remaining} sellos para reclamar tu {reward}.',
    birthdayGreeting: '¡Feliz cumpleanos, {name}! Ven hoy a celebrar con nosotros y reclama tu cortesia en {business}.'
  }
};

export function getBusinessConfig() {
  return CONFIG.business;
}

export function getBusinessTheme() {
  if (CONFIG.business) {
    if (CONFIG.business.theme) {
      return CONFIG.business.theme;
    }
  }
  return {};
}

export function getNotificationTemplates() {
  return CONFIG.notifications;
}

export function formatNotificationText(template, variables) {
  if (!template) {
    return '';
  }
  const vars = variables ? variables : {};
  let text = template;
  const keys = Object.keys(vars);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const placeholder = '{' + key + '}';
    let val = '';
    if (vars[key] !== undefined) {
      if (vars[key] !== null) {
        val = String(vars[key]);
      }
    }
    text = text.split(placeholder).join(val);
  }

  return text;
}
