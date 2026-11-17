/**
 * Componente Tarjeta Wallet Pass - FidelizaCard (v2.4)
 * Responsabilidades:
 * - Banner superior de marca con colores corporativos del local, logotipo y ciclo
 * - Talon inferior estilo Wallet con titular (MIEMBRO) y sellos sin telefono
 * - Mensaje dinamico de progresion de sellos y premio en capsula inferior
 * - Grilla de sellos vectoriales tematicos y fila de acciones tactiles sin scroll
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { createElement, triggerHaptic } from '../utils/dom.js';
import { createStampThemeIcon, createSocialIcon, createUiIcon } from '../utils/icons.js';
import { getConfig } from '../services/storage-service.js';
import { openRedeemModal } from './redeem-modal.js';
import { openQrScannerModal } from './qr-scanner-modal.js';

export function renderLoyaltyCard(container, customer, onUpdate, onScanDecoded) {
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

  const wrapper = createElement('div', { className: 'wallet-pass-wrapper' });
  const card = createElement('div', { className: 'loyalty-card' });

  const cardHeader = buildBrandHeader(config, currentCycle);
  card.appendChild(cardHeader);

  const grid = buildStampsGrid(targetStamps, currentStamps, config.stampIcon);
  card.appendChild(grid);

  const passBottom = buildPassBottom(customer, config, currentStamps, targetStamps);
  card.appendChild(passBottom);

  wrapper.appendChild(card);

  if (rewardUnlocked) {
    const unlockedPanel = buildRewardUnlockedPanel(customer, config, onUpdate);
    wrapper.appendChild(unlockedPanel);
  } else {
    if (showPostRedeemReview) {
      if (config.googleMapsReviewUrl) {
        const reviewBox = buildPostRedeemReviewBox(config.googleMapsReviewUrl);
        wrapper.appendChild(reviewBox);
      }
    }
    const actionsRow = buildPassActionsRow(config, onScanDecoded);
    wrapper.appendChild(actionsRow);
  }

  const socialsBar = buildSocialsFooter(config.socials);
  if (socialsBar) {
    wrapper.appendChild(socialsBar);
  }

  container.appendChild(wrapper);
}

function buildBrandHeader(config, currentCycle) {
  const header = createElement('div', { className: 'card-brand-header' });
  const identity = createElement('div', { className: 'card-brand-identity' });

  const bizName = config.businessName ? config.businessName : 'FidelizaCard';
  const initials = bizName.slice(0, 2).toUpperCase();

  if (config.businessLogo) {
    const logoImg = createElement('img', {
      className: 'card-brand-logo',
      src: config.businessLogo,
      alt: bizName
    });
    logoImg.onerror = function () {
      const fallback = createElement('div', {
        className: 'card-brand-fallback',
        textContent: initials
      });
      logoImg.replaceWith(fallback);
    };
    identity.appendChild(logoImg);
  } else {
    identity.appendChild(createElement('div', {
      className: 'card-brand-fallback',
      textContent: initials
    }));
  }

  const textCol = createElement('div', { className: 'card-brand-text' });
  textCol.appendChild(createElement('h2', {
    className: 'card-business-name',
    textContent: bizName
  }));
  textCol.appendChild(createElement('span', {
    className: 'card-pass-subtitle',
    textContent: 'Pase Digital VIP'
  }));
  identity.appendChild(textCol);

  const cycleBadge = createElement('span', {
    className: 'badge-cycle',
    textContent: 'CICLO ' + currentCycle
  });

  header.appendChild(identity);
  header.appendChild(cycleBadge);
  return header;
}

function buildDynamicProgressLabel(currentStamps, targetStamps) {
  const remaining = Math.max(0, targetStamps - currentStamps);
  if (remaining === 0) {
    return '¡META COMPLETADA! RECLAMA TU PREMIO:';
  }
  if (remaining === 1) {
    return '¡A SOLO 1 SELLO DE TU PREMIO GRATIS!';
  }
  if (currentStamps === 0) {
    return 'JUNTA ' + targetStamps + ' SELLOS PARA GANAR:';
  }
  return 'TE FALTAN ' + remaining + ' SELLOS PARA GANAR:';
}

function buildPassBottom(customer, config, currentStamps, targetStamps) {
  const bottom = createElement('div', { className: 'pass-bottom-section' });
  bottom.appendChild(createElement('div', { className: 'pass-divider' }));

  const holderRow = createElement('div', { className: 'pass-holder-row' });

  const leftCol = createElement('div', { className: 'holder-col' });
  leftCol.appendChild(createElement('span', {
    className: 'holder-label',
    textContent: 'MIEMBRO'
  }));
  leftCol.appendChild(createElement('span', {
    className: 'holder-name',
    textContent: customer.name ? customer.name : 'Cliente'
  }));

  const rightCol = createElement('div', { className: 'holder-col align-right' });
  rightCol.appendChild(createElement('span', {
    className: 'holder-label',
    textContent: 'SELLOS'
  }));
  rightCol.appendChild(createElement('span', {
    className: 'holder-stamps-value',
    textContent: currentStamps + ' / ' + targetStamps
  }));

  holderRow.appendChild(leftCol);
  holderRow.appendChild(rightCol);
  bottom.appendChild(holderRow);

  const rewardCapsule = createElement('div', { className: 'reward-capsule' });
  rewardCapsule.appendChild(createElement('span', {
    className: 'reward-capsule-tag',
    textContent: buildDynamicProgressLabel(currentStamps, targetStamps)
  }));
  rewardCapsule.appendChild(createElement('span', {
    className: 'reward-capsule-name',
    textContent: config.rewardDescription
  }));
  bottom.appendChild(rewardCapsule);

  return bottom;
}

function buildStampsGrid(targetStamps, currentStamps, stampIcon) {
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
    const slotClass =
      'stamp-slot' + (isStamped ? ' stamped' : '') + (isTarget ? ' target-slot' : '');
    const slot = createElement('div', { className: slotClass });

    if (isStamped) {
      slot.appendChild(createStampThemeIcon(stampIcon, 'slot-theme-svg', 24));
    } else if (isTarget) {
      slot.appendChild(createUiIcon('gift', 'slot-gift-svg', 22));
    } else {
      slot.appendChild(createElement('span', {
        className: 'slot-num',
        textContent: String(i + 1)
      }));
    }

    grid.appendChild(slot);
  }

  return grid;
}

function buildRewardUnlockedPanel(customer, config, onUpdate) {
  const panel = createElement('div', { className: 'reward-unlocked-panel' });
  panel.appendChild(createElement('h3', {
    className: 'reward-title',
    textContent: '¡Premio Desbloqueado!'
  }));
  panel.appendChild(createElement('p', {
    className: 'reward-desc-text',
    textContent: config.rewardDescription
  }));

  const claimBtn = createElement('button', {
    className: 'btn-claim',
    type: 'button',
    textContent: 'Canjear Mi Premio'
  });

  claimBtn.addEventListener('click', function () {
    triggerHaptic(50);
    openRedeemModal(customer, onUpdate);
  });

  panel.appendChild(claimBtn);
  return panel;
}

function buildPostRedeemReviewBox(mapsUrl) {
  const box = createElement('div', { className: 'post-redeem-review-box' });
  box.appendChild(createElement('p', {
    className: 'post-redeem-text',
    textContent: '¿Disfrutaste tu premio? Apoyanos con 5 estrellas'
  }));
  box.appendChild(createElement('a', {
    className: 'btn-maps-highlight',
    href: mapsUrl,
    target: '_blank',
    rel: 'noopener noreferrer',
    textContent: 'Calificar'
  }));
  return box;
}

function buildPassActionsRow(config, onScanDecoded) {
  const row = createElement('div', { className: 'pass-actions-row' });

  const scanBtn = createElement('button', {
    type: 'button',
    className: 'btn-scan-pill'
  });
  scanBtn.appendChild(createUiIcon('qr', '', 20));
  scanBtn.appendChild(createElement('span', { textContent: 'Escanear QR' }));

  scanBtn.addEventListener('click', function () {
    triggerHaptic(40);
    openQrScannerModal(onScanDecoded);
  });
  row.appendChild(scanBtn);

  if (config.whatsappDelivery) {
    const cleanPhone = String(config.whatsappDelivery).replace(/\D/g, '');
    const defaultMsg = '¡Hola! Quiero hacer un pedido por delivery.';
    const msg = config.whatsappMessage ? config.whatsappMessage : defaultMsg;
    const waHref = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(msg);

    const waCircle = createElement('a', {
      className: 'btn-wa-circle',
      href: waHref,
      target: '_blank',
      rel: 'noopener noreferrer',
      title: 'Pedir por WhatsApp',
      'aria-label': 'Pedir por WhatsApp'
    });
    waCircle.appendChild(createUiIcon('whatsapp', '', 24));
    row.appendChild(waCircle);
  }

  return row;
}

function buildSocialsFooter(socials) {
  if (!socials) {
    return null;
  }

  const items = [];
  if (socials.instagramUrl) {
    items.push({ key: 'instagram', label: 'Instagram', url: socials.instagramUrl });
  }
  if (socials.tiktokUrl) {
    items.push({ key: 'tiktok', label: 'TikTok', url: socials.tiktokUrl });
  }
  if (socials.facebookUrl) {
    items.push({ key: 'facebook', label: 'Facebook', url: socials.facebookUrl });
  }

  if (items.length === 0) {
    return null;
  }

  const bar = createElement('div', { className: 'card-socials-bar' });
  bar.appendChild(createElement('span', {
    className: 'socials-bar-label',
    textContent: 'Siguenos'
  }));

  const list = createElement('div', { className: 'socials-links-row' });
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const anchor = createElement('a', {
      className: 'social-icon-link',
      href: item.url,
      target: '_blank',
      rel: 'noopener noreferrer',
      title: item.label,
      'aria-label': item.label
    });
    anchor.appendChild(createSocialIcon(item.key, '', 17));
    list.appendChild(anchor);
  }

  bar.appendChild(list);
  return bar;
}
