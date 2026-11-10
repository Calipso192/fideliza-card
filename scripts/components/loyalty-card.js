/**
 * Componente Tarjeta de Lealtad - FidelizaCard
 * Responsabilidades:
 * - Renderizado adaptativo de cuadricula de sellos segun meta configurada (6, 8 o 10)
 * - Visualizacion de marca, progreso, ciclo y descripcion del premio configurado
 * - Desbloqueo de estado de canje y transicion a nuevo ciclo
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { createEl, triggerHaptic } from '../utils/dom.js';
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

  const card = createEl('div', { className: 'loyalty-card' });

  // Cabecera de la tarjeta
  const cardHeader = createEl('div', { className: 'card-top-row' });
  const userMeta = createEl('div', { className: 'card-user-meta' });
  const userName = createEl('h2', { className: 'card-customer-name', textContent: customer.name });
  const userPhone = createEl('p', { className: 'card-customer-phone', textContent: maskPhone(customer.phone) });
  userMeta.appendChild(userName);
  userMeta.appendChild(userPhone);

  const cycleBadge = createEl('span', {
    className: 'badge-cycle',
    textContent: 'CICLO ' + currentCycle
  });

  cardHeader.appendChild(userMeta);
  cardHeader.appendChild(cycleBadge);
  card.appendChild(cardHeader);

  // Cuadricula adaptativa de sellos
  const grid = createEl('div', { className: 'stamps-grid' });
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
    const slot = createEl('div', {
      className: 'stamp-slot' + (isStamped ? ' stamped' : '') + (isTarget ? ' target-slot' : '')
    });

    if (isStamped) {
      const checkIcon = createEl('span', { className: 'slot-icon-check', textContent: '✓' });
      slot.appendChild(checkIcon);
    } else if (isTarget) {
      const giftIcon = createEl('span', { className: 'slot-icon-gift', textContent: '🎁' });
      slot.appendChild(giftIcon);
    } else {
      const num = createEl('span', { className: 'slot-num', textContent: String(i + 1) });
      slot.appendChild(num);
    }

    grid.appendChild(slot);
  }
  card.appendChild(grid);

  // Fila de contador de sellos
  const counterRow = createEl('div', { className: 'stamps-counter-row' });
  const counterLabel = createEl('span', { className: 'counter-label', textContent: 'Sellos acumulados' });
  const counterVal = createEl('span', {
    className: 'counter-value',
    textContent: currentStamps + ' / ' + targetStamps
  });
  counterRow.appendChild(counterLabel);
  counterRow.appendChild(counterVal);
  card.appendChild(counterRow);

  container.appendChild(card);

  // Bloque de estado, premio o aviso
  const infoBox = createEl('div', { className: 'card-status-box' });
  if (rewardUnlocked) {
    infoBox.classList.add('reward-active');
    const celebrationTitle = createEl('h3', {
      className: 'reward-title',
      textContent: '¡Premio Desbloqueado! 🎉'
    });
    const rewardDesc = createEl('p', {
      className: 'reward-desc-text',
      textContent: config.rewardDescription
    });
    const instruction = createEl('p', {
      className: 'reward-instruction',
      textContent: 'Muestrale esta pantalla en caja para canjear tu premio.'
    });
    const claimBtn = createEl('button', {
      className: 'btn-primary btn-claim',
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

    infoBox.appendChild(celebrationTitle);
    infoBox.appendChild(rewardDesc);
    infoBox.appendChild(instruction);
    infoBox.appendChild(claimBtn);
  } else {
    const hint = createEl('p', {
      className: 'card-instruction-text',
      textContent: 'Presenta tu tarjeta en caja o abre tu enlace de delivery para sumar tus proximos sellos.'
    });
    const rewardPreview = createEl('p', {
      className: 'card-reward-preview',
      textContent: '🎁 Premio: ' + config.rewardDescription
    });
    infoBox.appendChild(hint);
    infoBox.appendChild(rewardPreview);
  }

  container.appendChild(infoBox);
}

function maskPhone(phone) {
  if (!phone) {
    return '';
  }
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length < 9) {
    return clean;
  }
  return clean.slice(0, 3) + ' ••• •' + clean.slice(-2);
}
