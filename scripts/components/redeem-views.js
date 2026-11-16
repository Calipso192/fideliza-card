/**
 * Vistas secundarias del Modal de Canje - FidelizaCard (v2.1)
 * Responsabilidades:
 * - Renderizar teclado numerico para validacion de PIN de cajero
 * - Renderizar confirmacion deslizante Slide-to-Confirm en salon
 * - Generar cupon unico por ciclo para reclamo por WhatsApp en delivery
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { createElement, showToast, triggerHaptic } from '../utils/dom.js';
import { playKeyTap, playErrorBeep } from '../utils/sound-fx.js';
import { getConfig, getOrCreateRewardVoucherCode } from '../services/storage-service.js';
import { createSlideConfirm } from './slide-confirm.js';

export function buildDialogHeader(titleText, onClose) {
  const header = createElement('div', { className: 'modal-header' });
  const title = createElement('h3', {
    className: 'modal-title',
    textContent: titleText
  });
  const closeBtn = createElement('button', {
    type: 'button',
    className: 'modal-close-btn',
    textContent: '✕',
    onclick: onClose
  });
  header.appendChild(title);
  header.appendChild(closeBtn);
  return header;
}

export function renderPinPadView(modalContainer, callbacks) {
  const config = getConfig();
  const expectedPin = config.cashierPin ? String(config.cashierPin) : '1234';
  let enteredPin = '';

  modalContainer.innerHTML = '';

  const dialog = createElement('div', { className: 'modal-dialog' });
  const header = buildDialogHeader('Autorizacion de Caja', callbacks.onClose);

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
        triggerHaptic(40);
        renderSalonSlideConfirmView(modalContainer, callbacks);
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
        callbacks.onBack();
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

export function renderSalonSlideConfirmView(modalContainer, callbacks) {
  const config = getConfig();
  modalContainer.innerHTML = '';

  const dialog = createElement('div', { className: 'modal-dialog' });
  const header = buildDialogHeader('Confirmar Entrega', callbacks.onClose);

  const body = createElement('div', { className: 'modal-body' });
  body.style.textAlign = 'center';

  const rewardTag = createElement('p', {
    textContent: 'PIN verificado. Desliza para entregar: ' + config.rewardDescription
  });
  rewardTag.style.fontWeight = '700';
  rewardTag.style.color = 'var(--color-gold)';
  rewardTag.style.marginBottom = '16px';

  const slider = createSlideConfirm({
    label: 'Desliza para entregar premio',
    confirmedLabel: '¡Premio Entregado!',
    onConfirm: function () {
      callbacks.onComplete('¡Premio validado en caja! Nuevo ciclo iniciado');
    }
  });

  body.appendChild(rewardTag);
  body.appendChild(slider);

  const actionsCol = createElement('div', {});
  actionsCol.style.display = 'flex';
  actionsCol.style.flexDirection = 'column';
  actionsCol.style.gap = '10px';

  const backBtn = createElement('button', {
    type: 'button',
    className: 'btn-secondary',
    textContent: 'Cancelar',
    onclick: callbacks.onBack
  });
  actionsCol.appendChild(backBtn);

  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(actionsCol);
  modalContainer.appendChild(dialog);
}

export function renderDeliveryVoucherView(modalContainer, customer, callbacks) {
  const config = getConfig();
  const voucherCode = getOrCreateRewardVoucherCode();
  const clientName = customer.name ? customer.name : 'Cliente';
  const rawPhone = customer.phone ? customer.phone : customer.whatsapp;

  modalContainer.innerHTML = '';

  const dialog = createElement('div', { className: 'modal-dialog' });
  const header = buildDialogHeader('Cupon Delivery', callbacks.onClose);

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
    textContent: '1. Envia tu cupon por WhatsApp al local. 2. Desliza abajo tras enviarlo para reiniciar tu tarjeta.'
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

  const actionsCol = createElement('div', {});
  actionsCol.style.display = 'flex';
  actionsCol.style.flexDirection = 'column';
  actionsCol.style.gap = '10px';

  const sendWaBtn = createElement('a', {
    className: 'btn-primary',
    href: waHref,
    target: '_blank',
    rel: 'noopener noreferrer',
    textContent: '1. Enviar Cupon por WhatsApp'
  });
  sendWaBtn.style.background = '#25d366';
  sendWaBtn.style.color = '#ffffff';
  sendWaBtn.style.textDecoration = 'none';
  sendWaBtn.style.boxShadow = '0 4px 12px rgba(37, 211, 102, 0.28)';

  const confirmSlider = createSlideConfirm({
    label: '2. Desliza tras enviar cupon',
    confirmedLabel: '¡Nuevo ciclo iniciado!',
    onConfirm: function () {
      callbacks.onComplete('¡Cupon registrado! Nuevo ciclo iniciado');
    }
  });

  const backBtn = createElement('button', {
    type: 'button',
    className: 'btn-secondary',
    textContent: 'Volver',
    onclick: callbacks.onBack
  });

  actionsCol.appendChild(sendWaBtn);
  actionsCol.appendChild(confirmSlider);
  actionsCol.appendChild(backBtn);

  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(actionsCol);
  modalContainer.appendChild(dialog);
}
