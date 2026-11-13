/**
 * Componente Tarjeta de Lealtad - FidelizaCard (v1.5)
 * Responsabilidades:
 * - Renderizado adaptativo de sellos segun meta estatica (6, 8 o 10)
 * - Apertura del modal de canje blindado al completar los sellos
 * - Disparador de resena en Google Maps exclusivamente tras completar un canje
 * - Renderizado dinamico de redes sociales (Instagram, TikTok, Facebook)
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { createElement, triggerHaptic, maskPhone } from '../utils/dom.js';
import { getConfig } from '../services/storage-service.js';
import { openRedeemModal } from './redeem-modal.js';

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
  const showPostRedeemReview = customer.justRedeemed === true;

  container.innerHTML = '';

  const card = createElement('div', { className: 'loyalty-card' });

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

    const instruction = createElement('p', {
      className: 'reward-instruction',
      textContent: 'Elige si vas a canjear tu premio ahora en caja o en tu proximo pedido delivery.'
    });

    const claimBtn = createElement('button', {
      className: 'btn-claim',
      type: 'button',
      textContent: 'Canjear Mi Premio Ahora'
    });

    claimBtn.addEventListener('click', function () {
      triggerHaptic(50);
      openRedeemModal(customer, onUpdate);
    });

    infoBox.appendChild(celebrationTitle);
    infoBox.appendChild(rewardDesc);
    infoBox.appendChild(instruction);
    infoBox.appendChild(claimBtn);
  } else {
    if (showPostRedeemReview) {
      if (config.googleMapsReviewUrl) {
        const reviewBanner = createElement('div', { className: 'post-redeem-review-box' });
        const reviewText = createElement('p', {
          className: 'post-redeem-text',
          textContent: '¡Disfruta tu premio! Si te gusto la atencion, apoyanos con 5 estrellas:'
        });
        const mapsBtn = createElement('a', {
          className: 'btn-maps-highlight',
          href: config.googleMapsReviewUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          textContent: '⭐ Calificar en Google Maps ↗'
        });
        reviewBanner.appendChild(reviewText);
        reviewBanner.appendChild(mapsBtn);
        infoBox.appendChild(reviewBanner);
      }
    }

    const hint = createElement('p', {
      className: 'card-instruction-text',
      textContent: 'Presenta tu tarjeta en caja al pagar o abre tu enlace de delivery para sumar sellos.'
    });
    infoBox.appendChild(hint);

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

    infoBox.appendChild(actionsGroup);
  }

  const socialsBar = buildSocialsFooter(config.socials);
  if (socialsBar) {
    infoBox.appendChild(socialsBar);
  }

  container.appendChild(infoBox);
}

function buildSocialsFooter(socials) {
  if (!socials) {
    return null;
  }

  const links = [];

  if (socials.instagramUrl) {
    links.push({ label: 'Instagram', url: socials.instagramUrl });
  }
  if (socials.tiktokUrl) {
    links.push({ label: 'TikTok', url: socials.tiktokUrl });
  }
  if (socials.facebookUrl) {
    links.push({ label: 'Facebook', url: socials.facebookUrl });
  }

  if (links.length === 0) {
    return null;
  }

  const bar = createElement('div', { className: 'card-socials-bar' });
  const label = createElement('span', {
    className: 'socials-bar-label',
    textContent: 'Siguenos:'
  });
  bar.appendChild(label);

  const list = createElement('div', { className: 'socials-links-row' });

  for (let i = 0; i < links.length; i++) {
    const item = links[i];
    const anchor = createElement('a', {
      className: 'social-chip-link',
      href: item.url,
      target: '_blank',
      rel: 'noopener noreferrer',
      textContent: item.label + ' ↗'
    });
    list.appendChild(anchor);
  }

  bar.appendChild(list);
  return bar;
}
