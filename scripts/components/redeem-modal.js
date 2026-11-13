/**
 * Modal de Canje Blindado (PIN de Cajero o Cupon WhatsApp Delivery) - FidelizaCard (v1.5)
 * Responsabilidades:
 * - Proteger el premio contra canjes accidentales sin temporizadores destructivos
 * - Validar entrega en salon mediante PIN numerico de 4 digitos del cajero
 * - Generar cupon unico por ciclo para reclamar premio via WhatsApp en delivery
 * - Activar estado post-canje para mostrar invitacion de resena en Google Maps
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { qs, createElement, showToast, triggerHaptic } from '../utils/dom.js';
import { playKeyTap, playErrorBeep, playRewardFanfare } from '../utils/sound-fx.js';
import {
  getConfig,
  claimRewardAndNewCycle,
  getOrCreateRewardVoucherCode
} from '../services/storage-service.js';

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

  const dialog = createElement('div', { className: 'modal-dialog' });
  const header = createElement('div', { className: 'modal-header' });
  const title = createElement('h3', {
    className: 'modal-title',
    textContent: 'Canjear Premio'
  });
  const closeBtn = createElement('button', {
    type: 'button',
    className: 'modal-close-btn',
    textContent: '✕',
    onclick: closeRedeemModal
  });
  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = createElement('div', { className: 'modal-body' });
  const rewardLine = createElement('p', {
    textContent: 'Premio listo: ' + config.rewardDescription
  });
  rewardLine.style.fontWeight = '700';
  rewardLine.style.color = 'var(--color-gold)';
  rewardLine.style.marginBottom = '10px';

  const infoLine = createElement('p', {
    textContent: 'Selecciona como deseas reclamar tu cortesia:'
  });

  body.appendChild(rewardLine);
  body.appendChild(infoLine);

  const optionsCol = createElement('div', { className: 'card-quick-actions' });

  const salonBtn = createElement('button', {
    type: 'button',
    className: 'btn-primary',
    textContent: '🏪 Validar en Caja (PIN Cajero)',
    onclick: function () {
      triggerHaptic(30);
      renderPinPadView(modalContainer, customer, onRedeemed);
    }
  });
  optionsCol.appendChild(salonBtn);

  if (config.whatsappDelivery) {
    const deliveryBtn = createElement('button', {
      type: 'button',
      className: 'btn-whatsapp-order',
      textContent: '🛵 Canjear por Delivery WhatsApp',
      onclick: function () {
        triggerHaptic(30);
        renderDeliveryVoucherView(modalContainer, customer, onRedeemed);
      }
    });
    optionsCol.appendChild(deliveryBtn);
  }

  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(optionsCol);
  modalContainer.appendChild(dialog);
}

function renderPinPadView(modalContainer, customer, onRedeemed) {
  const config = getConfig();
  const expectedPin = config.cashierPin ? String(config.cashierPin) : '1234';
  let enteredPin = '';

  modalContainer.innerHTML = '';

  const dialog = createElement('div', { className: 'modal-dialog' });
  const header = createElement('div', { className: 'modal-header' });
  const title = createElement('h3', {
    className: 'modal-title',
    textContent: 'Autorizacion de Caja'
  });
  const closeBtn = createElement('button', {
    type: 'button',
    className: 'modal-close-btn',
    textContent: '✕',
    onclick: closeRedeemModal
  });
  header.appendChild(title);
  header.appendChild(closeBtn);

  const hint = createElement('p', {
    className: 'modal-body',
    textContent: 'Entrega tu telefono al cajero para que ingrese su PIN de 4 digitos.'
  });
  hint.style.marginBottom = '8px';
  hint.style.textAlign = 'center';

  const pinWrapper = createElement('div', { className: 'pin-display-wrapper' });
  const dotsRow = createElement('div', { className: 'pin-dots' });
  const dots = [];
  for (let i = 0; i < 4; i++) {
    const dot = createElement('span', { className: 'pin-dot' });
    dots.push(dot);
    dotsRow.appendChild(dot);
  }
  pinWrapper.appendChild(dotsRow);

  function refreshDots() {
    for (let i = 0; i < 4; i++) {
      if (i < enteredPin.length) {
        dots[i].classList.add('filled');
      } else {
        dots[i].classList.remove('filled');
      }
    }
  }

  function handleDigitPress(digit) {
    if (enteredPin.length >= 4) {
      return;
    }
    playKeyTap();
    triggerHaptic(20);
    enteredPin += digit;
    refreshDots();

    if (enteredPin.length === 4) {
      if (enteredPin === expectedPin) {
        completeRedemption(onRedeemed, '¡Premio validado en caja! Nuevo ciclo iniciado');
      } else {
        playErrorBeep();
        triggerHaptic(80);
        dialog.classList.remove('modal-shake');
        void dialog.offsetWidth;
        dialog.classList.add('modal-shake');
        showToast('PIN de cajero incorrecto', 'error');
        enteredPin = '';
        refreshDots();
      }
    }
  }

  const keypad = createElement('div', { className: 'keypad-grid' });
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Volver', '0', '⌫'];

  for (let k = 0; k < keys.length; k++) {
    const label = keys[k];
    const isAction = label === 'Volver' ? true : label === '⌫';
    const btn = createElement('button', {
      type: 'button',
      className: 'key-btn' + (isAction ? ' action-key' : ''),
      textContent: label
    });

    btn.addEventListener('click', function () {
      if (label === 'Volver') {
        renderModeSelector(modalContainer, customer, onRedeemed);
        return;
      }
      if (label === '⌫') {
        if (enteredPin.length > 0) {
          playKeyTap();
          enteredPin = enteredPin.slice(0, -1);
          refreshDots();
        }
        return;
      }
      handleDigitPress(label);
    });

    keypad.appendChild(btn);
  }

  dialog.appendChild(header);
  dialog.appendChild(hint);
  dialog.appendChild(pinWrapper);
  dialog.appendChild(keypad);
  modalContainer.appendChild(dialog);
}

function renderDeliveryVoucherView(modalContainer, customer, onRedeemed) {
  const config = getConfig();
  const voucherCode = getOrCreateRewardVoucherCode();
  const clientName = customer.name ? customer.name : 'Cliente';
  const rawPhone = customer.phone ? customer.phone : customer.whatsapp;

  modalContainer.innerHTML = '';

  const dialog = createElement('div', { className: 'modal-dialog' });
  const header = createElement('div', { className: 'modal-header' });
  const title = createElement('h3', {
    className: 'modal-title',
    textContent: 'Cupon Delivery'
  });
  const closeBtn = createElement('button', {
    type: 'button',
    className: 'modal-close-btn',
    textContent: '✕',
    onclick: closeRedeemModal
  });
  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = createElement('div', { className: 'modal-body' });
  body.style.textAlign = 'center';

  const codeBox = createElement('div', { className: 'reward-capsule' });
  const codeTag = createElement('span', {
    className: 'reward-capsule-tag',
    textContent: 'CODIGO DE CANJE UNICO'
  });
  const codeValue = createElement('span', {
    className: 'reward-capsule-name',
    textContent: voucherCode
  });
  codeValue.style.fontFamily = 'var(--font-family-mono)';
  codeValue.style.fontSize = '1.2rem';
  codeBox.appendChild(codeTag);
  codeBox.appendChild(codeValue);

  const stepsText = createElement('p', {
    textContent: '1. Envia tu cupon por WhatsApp al local. 2. Una vez enviado tu pedido, confirma abajo para reiniciar tu tarjeta.'
  });
  stepsText.style.marginTop = '12px';
  stepsText.style.fontSize = '0.84rem';

  body.appendChild(codeBox);
  body.appendChild(stepsText);

  const cleanPhone = String(config.whatsappDelivery).replace(/\D/g, '');
  const waText =
    '¡Hola ' +
    config.businessName +
    '! Quiero canjear mi premio de tarjeta digital.\n' +
    '• Cliente: ' +
    clientName +
    '\n' +
    '• WhatsApp: ' +
    rawPhone +
    '\n' +
    '• Premio: ' +
    config.rewardDescription +
    '\n' +
    '• Cupon: ' +
    voucherCode;

  const waHref = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(waText);

  const actionsCol = createElement('div', { className: 'card-quick-actions' });

  const sendWaBtn = createElement('a', {
    className: 'btn-whatsapp-order',
    href: waHref,
    target: '_blank',
    rel: 'noopener noreferrer',
    textContent: '1. Enviar Cupon por WhatsApp ↗'
  });

  const confirmSentBtn = createElement('button', {
    type: 'button',
    className: 'btn-claim',
    textContent: '2. Ya Envie el Cupon · Nuevo Ciclo',
    onclick: function () {
      completeRedemption(onRedeemed, '¡Cupon registrado! Nuevo ciclo iniciado');
    }
  });

  const backBtn = createElement('button', {
    type: 'button',
    className: 'btn-secondary',
    textContent: 'Volver',
    onclick: function () {
      renderModeSelector(modalContainer, customer, onRedeemed);
    }
  });

  actionsCol.appendChild(sendWaBtn);
  actionsCol.appendChild(confirmSentBtn);
  actionsCol.appendChild(backBtn);

  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(actionsCol);
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
