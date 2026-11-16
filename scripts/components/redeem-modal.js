/**
 * Modal de Canje Blindado - FidelizaCard (v2.1)
 * Responsabilidades:
 * - Mostrar selector inicial de modalidad de canje (Caja con PIN o Delivery WhatsApp)
 * - Conectar con vistas secundarias de PIN, Slide-to-Confirm y Cupon Delivery
 * - Ejecutar el cierre de ciclo, sonido de celebracion y estado post-canje
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { qs, createElement, showToast, triggerHaptic } from '../utils/dom.js';
import { playRewardFanfare } from '../utils/sound-fx.js';
import { getConfig, claimRewardAndNewCycle } from '../services/storage-service.js';
import {
  buildDialogHeader,
  renderPinPadView,
  renderDeliveryVoucherView
} from './redeem-views.js';

export function openRedeemModal(customer, onRedeemed) {
  const modalContainer = qs('#modal-container');
  if (!modalContainer) {
    return;
  }

  modalContainer.innerHTML = '';
  modalContainer.classList.remove('hidden');
  modalContainer.setAttribute('aria-hidden', 'false');

  renderModeSelector(modalContainer, customer, onRedeemed);
}

function closeRedeemModal() {
  const modalContainer = qs('#modal-container');
  if (!modalContainer) {
    return;
  }
  modalContainer.classList.add('hidden');
  modalContainer.setAttribute('aria-hidden', 'true');
  modalContainer.innerHTML = '';
}

function renderModeSelector(modalContainer, customer, onRedeemed) {
  const config = getConfig();
  modalContainer.innerHTML = '';

  const callbacks = {
    onClose: closeRedeemModal,
    onBack: function () {
      renderModeSelector(modalContainer, customer, onRedeemed);
    },
    onComplete: function (successMsg) {
      completeRedemption(onRedeemed, successMsg);
    }
  };

  const dialog = createElement('div', { className: 'modal-dialog' });
  const header = buildDialogHeader('Canjear Premio', closeRedeemModal);

  const body = createElement('div', { className: 'modal-body' });
  const rewardLine = createElement('p', {
    textContent: 'Premio listo: ' + config.rewardDescription
  });
  rewardLine.style.fontWeight = '700';
  rewardLine.style.color = 'var(--color-gold)';
  rewardLine.style.marginBottom = '8px';

  const infoLine = createElement('p', {
    textContent: 'Elige como deseas reclamar tu cortesia:'
  });

  body.appendChild(rewardLine);
  body.appendChild(infoLine);

  const optionsCol = createElement('div', {});
  optionsCol.style.display = 'flex';
  optionsCol.style.flexDirection = 'column';
  optionsCol.style.gap = '10px';

  const salonBtn = createElement('button', {
    type: 'button',
    className: 'btn-primary',
    textContent: 'Validar en Caja (PIN Cajero)',
    onclick: function () {
      triggerHaptic(30);
      renderPinPadView(modalContainer, callbacks);
    }
  });
  optionsCol.appendChild(salonBtn);

  if (config.whatsappDelivery) {
    const deliveryBtn = createElement('button', {
      type: 'button',
      className: 'btn-primary',
      textContent: 'Canjear por Delivery WhatsApp',
      onclick: function () {
        triggerHaptic(30);
        renderDeliveryVoucherView(modalContainer, customer, callbacks);
      }
    });
    deliveryBtn.style.background = '#25d366';
    deliveryBtn.style.color = '#ffffff';
    deliveryBtn.style.boxShadow = '0 4px 12px rgba(37, 211, 102, 0.28)';
    optionsCol.appendChild(deliveryBtn);
  }

  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(optionsCol);
  modalContainer.appendChild(dialog);
}

function completeRedemption(onRedeemed, successMsg) {
  claimRewardAndNewCycle();
  closeRedeemModal();
  playRewardFanfare();
  triggerHaptic(70);
  showToast(successMsg, 'success');

  if (typeof onRedeemed === 'function') {
    onRedeemed();
  }
}
