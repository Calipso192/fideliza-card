/**
 * Componente Tarjeta de Lealtad - FidelizaCard (Fase 1 Llave en Mano)
 * Responsabilidades:
 * - Renderizado adaptativo de sellos segun meta estatica (6, 8 o 10)
 * - Visualizacion de progreso, ciclo y capsula sobria de recompensa
 * - Boton prioritario para pedidos de delivery por WhatsApp
 * - Acceso directo a resenas en Google Maps
 * - Confirmacion de canje y transicion a nuevo ciclo
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { createElement, triggerHaptic, maskPhone } from '../utils/dom.js';
import { getConfig, claimRewardAndNewCycle } from '../services/storage-service.js';

export function renderLoyaltyCard(container, customer, onUpdate) {
  if (!container) {
    return;
  }
  if (!customer) {
    container.innerHTML = '';
    return;
  }

  const config = getConfig();
  const targetStamps = config.targetStamps ? Number(config.targetStamps) : 8;
  const currentStamps = customer.stamps ? Number(customer.stamps) : 0;
  const currentCycle = customer.cycle ? Number(customer.cycle) : 1;
  const rewardUnlocked = currentStamps >= targetStamps;

  container.innerHTML = '';

  const card = createElement('div', { className: 'loyalty-card' });

  // Cabecera de la tarjeta
  const cardHeader = createElement('div', { className: 'card-top-row' });
  const userMeta = createElement('div', { className: 'card-user-meta' });
  const userName = createElement('h2', {
    className: 'card-customer-name',
    textContent: customer.name ? customer.name : 'Cliente'
  });

  const rawPhone = customer.phone ? customer.phone : customer.whatsapp;
  const userPhone = createElement('p', {
    className: 'card-customer-phone',
    textContent: maskPhone(rawPhone)
  });
  userMeta.appendChild(userName);
  userMeta.appendChild(userPhone);

  const cycleBadge = createElement('span', {
    className: 'badge-cycle',
    textContent: 'CICLO ' + currentCycle
  });

  cardHeader.appendChild(userMeta);
  cardHeader.appendChild(cycleBadge);
  card.appendChild(cardHeader);

  // Cuadricula adaptativa de sellos
  const grid = createElement('div', { className: 'stamps-grid' });
  let cols = 4;
  if (targetStamps === 6) {
    cols = 3;
  } else if (targetStamps === 10) {
    cols = 5;
  }
  grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';

  for (let i = 0; i < targetStamps; i++) {
    const isStamped = i < currentStamps;
    const isTarget = i === targetStamps - 1;
    const slot = createElement('div', {
      className: 'stamp-slot' + (isStamped ? ' stamped' : '') + (isTarget ? ' target-slot' : '')
    });

    if (isStamped) {
      const checkIcon = createElement('span', { className: 'slot-icon-check', textContent: '✓' });
      slot.appendChild(checkIcon);
    } else if (isTarget) {
      const giftIcon = createElement('span', { className: 'slot-icon-gift', textContent: '🎁' });
      slot.appendChild(giftIcon);
    } else {
      const num = createElement('span', { className: 'slot-num', textContent: String(i + 1) });
      slot.appendChild(num);
    }

    grid.appendChild(slot);
  }
  card.appendChild(grid);

  // Fila de contador de sellos
  const counterRow = createElement('div', { className: 'stamps-counter-row' });
  const counterLabel = createElement('span', { className: 'counter-label', textContent: 'Sellos acumulados: ' });
  const counterVal = createElement('span', {
    className: 'counter-value',
    textContent: currentStamps + ' / ' + targetStamps
  });
  counterRow.appendChild(counterLabel);
  counterRow.appendChild(counterVal);
  card.appendChild(counterRow);

  container.appendChild(card);

  // Bloque de estado, capsula de recompensa y acciones
  const infoBox = createElement('div', { className: 'card-status-box' });

  if (rewardUnlocked) {
    infoBox.classList.add('reward-active');

    const celebrationTitle = createElement('h3', {
      className: 'reward-title',
      textContent: '¡Premio Desbloqueado! 🎉'
    });

    const rewardDesc = createElement('p', {
      className: 'reward-desc-text',
      textContent: config.rewardDescription
    });

    infoBox.appendChild(celebrationTitle);
    infoBox.appendChild(rewardDesc);

    // Disparador directo a Google Maps en el momento de mayor satisfaccion
    if (config.googleMapsReviewUrl) {
      const mapsBtn = createElement('a', {
        className: 'btn-maps-direct',
        href: config.googleMapsReviewUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        textContent: '⭐ Da tu reseña aquí ↗'
      });
      infoBox.appendChild(mapsBtn);
    }

    const instruction = createElement('p', {
      className: 'reward-instruction',
      textContent: 'Muestrale esta pantalla en caja para canjear tu cortesia.'
    });

    const claimBtn = createElement('button', {
      className: 'btn-claim',
      type: 'button',
      textContent: 'Confirmar Canje y Nuevo Ciclo'
    });

    claimBtn.addEventListener('click', function () {
      triggerHaptic(60);
      claimRewardAndNewCycle();
      if (typeof onUpdate === 'function') {
        onUpdate();
      }
    });

    infoBox.appendChild(instruction);
    infoBox.appendChild(claimBtn);

  } else {
    const hint = createElement('p', {
      className: 'card-instruction-text',
      textContent: 'Presenta tu tarjeta en caja al pagar o abre tu enlace de delivery para sumar sellos.'
    });
    infoBox.appendChild(hint);

    // Capsula sobria de recompensa
    const rewardCapsule = createElement('div', { className: 'reward-capsule' });
    const capsuleTag = createElement('span', {
      className: 'reward-capsule-tag',
      textContent: 'META DEL CICLO'
    });
    const capsuleName = createElement('span', {
      className: 'reward-capsule-name',
      textContent: '🎁 ' + config.rewardDescription
    });
    rewardCapsule.appendChild(capsuleTag);
    rewardCapsule.appendChild(capsuleName);
    infoBox.appendChild(rewardCapsule);

    // Botonera de acciones directas
    const actionsGroup = createElement('div', { className: 'card-quick-actions' });

    if (config.whatsappDelivery) {
      const cleanPhone = String(config.whatsappDelivery).replace(/\D/g, '');
      const defaultMsg = '¡Hola! Quiero hacer un pedido por delivery.';
      const msg = config.whatsappMessage ? config.whatsappMessage : defaultMsg;
      const encodedMsg = encodeURIComponent(msg);
      const deliveryBtn = createElement('a', {
        className: 'btn-whatsapp-order',
        href: 'https://wa.me/' + cleanPhone + '?text=' + encodedMsg,
        target: '_blank',
        rel: 'noopener noreferrer',
        textContent: '🛵 Pedir por WhatsApp'
      });
      actionsGroup.appendChild(deliveryBtn);
    }

    if (config.googleMapsReviewUrl) {
      const mapsBtn = createElement('a', {
        className: 'btn-maps-direct',
        href: config.googleMapsReviewUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        textContent: '⭐ Da tu reseña aquí ↗'
      });
      actionsGroup.appendChild(mapsBtn);
    }

    infoBox.appendChild(actionsGroup);
  }

  container.appendChild(infoBox);
}
