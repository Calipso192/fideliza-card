/**
 * Configuracion estatica de fabrica - FidelizaCard (Fase 1 Llave en Mano)
 * Responsabilidades:
 * - Centralizar datos de marca, metas de recompensa y canales del negocio
 * - Centralizar plantilla de mensajes para la secuencia de notificaciones locales
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

export const CONFIG = {
  business: {
    name: 'BLAP · STREET FOOD',
    logo: 'assets/logo.png',
    targetStamps: 8,
    rewardDescription: '1 Hamburguesa Clasica + Gaseosa',
    whatsappDelivery: '51999999999',
    whatsappMessage: '¡Hola! Quiero hacer un pedido por delivery y sumar sellos a mi tarjeta.',
    googleMapsReviewUrl: 'https://maps.google.com'
  },
  notifications: {
    day5Reminder: '¿Con antojo hoy? Tienes {stamps} sellos esperandote en {business}. ¡Vuelve por tu favorito! 🍔',
    day10Reminder: '¡Te extrañamos en {business}! Solo te faltan {remaining} sellos para reclamar tu {reward}. 🎉',
    birthdayGreeting: '🎂 ¡Feliz cumpleanos, {name}! Ven hoy a celebrar con nosotros y reclama tu cortesia en {business}.'
  }
};

export function getBusinessConfig() {
  return CONFIG.business;
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
