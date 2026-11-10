/**
 * Componente Tarjeta de Fidelizacion Digital
 * Responsabilidad: Renderizado de matriz de sellos, felicitacion de cumpleaños y canje de recompensa
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { createElement, showToast, triggerHaptic, maskPhone } from '../utils/dom.js';
import { getLoyaltyData, redeemReward, isBirthdayToday } from '../services/storage-service.js';

export function renderLoyaltyCard(container, customer, onUpdate) {
  if (!container) {
    return;
  }

  container.innerHTML = '';

  const loyalty = getLoyaltyData();
  const cardWrapper = createElement('div', { className: 'card-wrapper' });

  // Tarjeta Principal
  const card = createElement('section', {
    className: 'loyalty-card',
    ariaLabel: 'Tarjeta de sellos de ' + (customer && customer.name ? customer.name : 'Cliente')
  });

  // Barra superior con datos de cliente y ciclo
  const topBar = createElement('div', { className: 'card-top-bar' });
  const meta = createElement('div', { className: 'customer-meta' });

  const nameEl = createElement('h2', {
    className: 'customer-name',
    textContent: customer && customer.name ? customer.name : 'Cliente Fidelizado'
  });

  const phoneEl = createElement('span', {
    className: 'customer-phone',
    textContent: customer && customer.whatsapp ? maskPhone(customer.whatsapp) : ''
  });

  meta.appendChild(nameEl);
  if (customer && customer.whatsapp) {
    meta.appendChild(phoneEl);
  }

  const cycleBadge = createElement('span', {
    className: 'cycle-badge',
    textContent: 'Ciclo ' + (loyalty.completedCycles + 1)
  });

  topBar.appendChild(meta);
  topBar.appendChild(cycleBadge);
  card.appendChild(topBar);

  // Alerta de Cumpleaños si coincide la fecha
  if (customer && customer.birthdate && isBirthdayToday(customer.birthdate)) {
    const bdayAlert = createElement('div', { className: 'birthday-alert' });
    const bdayIcon = createElement('span', {
      className: 'birthday-icon',
      textContent: '🎂'
    });
    const bdayText = createElement('span', {
      className: 'birthday-text',
      textContent: '¡Feliz Cumpleaños! Tienes un regalo especial en tu visita de hoy.'
    });
    bdayAlert.appendChild(bdayIcon);
    bdayAlert.appendChild(bdayText);
    card.appendChild(bdayAlert);
  }

  // Matriz de Sellos (8 por defecto)
  const grid = createElement('div', { className: 'stamps-grid' });
  const totalSlots = loyalty.targetStamps ? loyalty.targetStamps : 8;

  for (let i = 1; i <= totalSlots; i++) {
    const isStamped = i <= loyalty.currentStamps;
    const isRewardSlot = i === totalSlots;

    let slotClass = 'stamp-slot';
    if (isStamped) {
      slotClass += ' stamped';
    }
    if (isRewardSlot) {
      slotClass += ' reward-slot';
    }

    const slot = createElement('div', {
      className: slotClass,
      dataset: { slotIndex: i }
    });

    const numLabel = createElement('span', {
      className: 'stamp-number',
      textContent: isRewardSlot ? '🎁' : String(i)
    });

    const iconSvg = createCheckIcon();

    slot.appendChild(numLabel);
    slot.appendChild(iconSvg);
    grid.appendChild(slot);
  }

  card.appendChild(grid);

  // Pie de tarjeta con contador
  const footerInfo = createElement('div', { className: 'card-footer-info' });
  const progressLabel = createElement('span', { textContent: 'Sellos acumulados' });
  const progressCount = createElement('span', {
    className: 'progress-counter',
    textContent: loyalty.currentStamps + ' / ' + totalSlots
  });

  footerInfo.appendChild(progressLabel);
  footerInfo.appendChild(progressCount);
  card.appendChild(footerInfo);

  cardWrapper.appendChild(card);

  // Recompensa desbloqueada o instrucciones normales
  const isComplete = loyalty.rewardAvailable ? true : (loyalty.currentStamps >= totalSlots);

  if (isComplete) {
    const banner = renderRewardBanner(function () {
      handleRedeem(container, customer, onUpdate);
    });
    cardWrapper.appendChild(banner);
  } else {
    const instructions = createElement('div', {
      className: 'claim-instructions',
      textContent: 'Presenta tu tarjeta en caja o abre tu enlace de delivery para sumar tus proximos sellos.'
    });
    cardWrapper.appendChild(instructions);
  }

  container.appendChild(cardWrapper);
}

function renderRewardBanner(onRedeemClick) {
  const banner = createElement('div', { className: 'reward-banner' });

  const title = createElement('h3', {
    className: 'reward-banner-title',
    textContent: '🎉 ¡Premio Desbloqueado!'
  });

  const desc = createElement('p', {
    className: 'reward-banner-desc',
    textContent: '¡Felicidades! Completaste todos tus sellos. Muestra esta pantalla al personal para canjear tu recompensa.'
  });

  const redeemBtn = createElement('button', {
    type: 'button',
    className: 'btn-reward',
    textContent: 'Canjear Premio Ahora',
    onclick: onRedeemClick
  });

  banner.appendChild(title);
  banner.appendChild(desc);
  banner.appendChild(redeemBtn);

  return banner;
}

function handleRedeem(container, customer, onUpdate) {
  const res = redeemReward();
  if (!res.success) {
    showToast(res.message, 'error');
    return;
  }

  triggerHaptic(80);
  showToast(res.message, 'success');

  if (typeof onUpdate === 'function') {
    onUpdate();
  } else {
    renderLoyaltyCard(container, customer, onUpdate);
  }
}

function createCheckIcon() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'stamp-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '3');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const polyline = document.createElementNS(svgNS, 'polyline');
  polyline.setAttribute('points', '20 6 9 17 4 12');

  svg.appendChild(polyline);
  return svg;
}
