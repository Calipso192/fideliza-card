/**
 * Operaciones Secundarias del Panel Admin - FidelizaCard (v2.2)
 * Responsabilidades:
 * - Despacho delivery por WhatsApp (?claim=PED-XXX) y confirmacion visual al copiar
 * - Cuadricula tactil de reposicion de sellos segun targetStamps (sin select nativo)
 * - Reposicion firmada con token unico y caducidad de 10 min (?rst=&s=&exp=)
 * - Renderizado y descarga PNG del codigo QR fijo de mostrador
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { qs, createElement, showToast, triggerHaptic } from '../utils/dom.js';
import { createUiIcon } from '../utils/icons.js';
import { getBusinessConfig } from '../config.js';
import { renderQRCode, downloadQRCode } from '../utils/qr-generator.js';

function decorateSecondaryButton(btn, iconName, labelText) {
  if (!btn) {
    return;
  }
  btn.innerHTML = '';
  btn.appendChild(createUiIcon(iconName, '', 17));
  btn.appendChild(createElement('span', { textContent: labelText }));
}

function flashButtonCopied(btn, defaultIcon, defaultLabel) {
  if (!btn) {
    return;
  }
  btn.classList.add('is-copied');
  decorateSecondaryButton(btn, 'check', '¡Enlace Copiado!');
  if (btn._copyTimer) {
    clearTimeout(btn._copyTimer);
  }
  btn._copyTimer = setTimeout(function () {
    btn.classList.remove('is-copied');
    decorateSecondaryButton(btn, defaultIcon, defaultLabel);
    btn._copyTimer = null;
  }, 2000);
}

export function setupDeliveryDispatch(getBaseClientUrl) {
  const form = qs('#delivery-form');
  const copyBtn = qs('#btn-copy-link');

  decorateSecondaryButton(copyBtn, 'copy', 'Copiar Enlace Manual');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const phoneInput = qs('#delivery-phone');
      const orderInput = qs('#delivery-order-id');
      const rawPhone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
      if (rawPhone.length < 9) {
        showToast('Ingresa un numero de WhatsApp valido', 'error');
        return;
      }
      let orderCode = orderInput ? orderInput.value.trim() : '';
      if (!orderCode) {
        orderCode = 'PED-' + Math.floor(1000 + Math.random() * 9000);
      }
      const clientUrl =
        getBaseClientUrl() + '?claim=' + encodeURIComponent(orderCode) + '&tel=' + rawPhone;
      displayLinkPreview(clientUrl);

      const config = getBusinessConfig();
      const bizName = config.name ? config.name : 'nuestro local';
      const msg =
        '¡Hola! Gracias por tu pedido en ' + bizName + '. Suma tu sello aqui: ' + clientUrl;
      window.open('https://wa.me/51' + rawPhone + '?text=' + encodeURIComponent(msg), '_blank');
      triggerHaptic(50);
      showToast('Enlace enviado a WhatsApp', 'success');
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      const phoneInput = qs('#delivery-phone');
      const orderInput = qs('#delivery-order-id');
      const rawPhone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
      let orderCode = orderInput ? orderInput.value.trim() : '';
      if (!orderCode) {
        orderCode = 'PED-' + Math.floor(1000 + Math.random() * 9000);
      }
      let clientUrl = getBaseClientUrl() + '?claim=' + encodeURIComponent(orderCode);
      if (rawPhone.length >= 9) {
        clientUrl = clientUrl + '&tel=' + rawPhone;
      }
      displayLinkPreview(clientUrl);
      copyText(clientUrl, 'Enlace manual copiado al portapapeles');
      flashButtonCopied(copyBtn, 'copy', 'Copiar Enlace Manual');
    });
  }
}

function displayLinkPreview(url) {
  const box = qs('#delivery-link-preview');
  const txt = qs('#preview-url-text');
  if (box) {
    if (txt) {
      txt.textContent = url;
      box.classList.remove('hidden');
    }
  }
}

export function setupStampsRestore(getBaseClientUrl) {
  const gridEl = qs('#restore-stamps-grid');
  const phoneInput = qs('#restore-phone');
  const btnShowQr = qs('#btn-show-restore-qr');
  const btnHideQr = qs('#btn-hide-restore-qr');
  const btnSendWa = qs('#btn-send-restore-whatsapp');
  const btnCopyLink = qs('#btn-copy-restore-link');
  const qrBox = qs('#restore-qr-box');
  const canvas = qs('#restore-qr-canvas');
  const caption = qs('#restore-qr-caption');

  decorateSecondaryButton(btnCopyLink, 'copy', 'Copiar Enlace');
  decorateSecondaryButton(btnHideQr, 'eyeOff', 'Ocultar QR');

  const config = getBusinessConfig();
  const maxStamps = config.targetStamps ? Number(config.targetStamps) : 8;
  let selectedRestoreCount = Math.min(4, maxStamps);

  function renderRestoreGrid() {
    if (!gridEl) {
      return;
    }
    let cols = 4;
    if (maxStamps === 6) {
      cols = 3;
    } else if (maxStamps === 10) {
      cols = 5;
    }
    gridEl.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    gridEl.innerHTML = '';

    for (let i = 1; i <= maxStamps; i++) {
      const isSelected = i === selectedRestoreCount;
      const btn = createElement('button', {
        type: 'button',
        className: 'restore-stamp-btn' + (isSelected ? ' active' : ''),
        textContent: String(i),
        'aria-pressed': isSelected ? 'true' : 'false'
      });

      btn.addEventListener('click', function () {
        selectedRestoreCount = i;
        triggerHaptic(25);
        renderRestoreGrid();
        if (qrBox) {
          if (!qrBox.classList.contains('hidden')) {
            paintRestoreQr();
          }
        }
      });

      gridEl.appendChild(btn);
    }
  }

  function buildSignedRestoreData() {
    const stamps = String(selectedRestoreCount);
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000;
    const rand = Math.floor(1000 + Math.random() * 9000);
    const token = 'RST-' + now + '-' + rand;

    let url =
      getBaseClientUrl() +
      '?rst=' +
      encodeURIComponent(token) +
      '&s=' +
      encodeURIComponent(stamps) +
      '&exp=' +
      expiresAt;

    const rawPhone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
    if (rawPhone.length >= 9) {
      url = url + '&tel=' + rawPhone;
    }
    return { url: url, stamps: stamps, phone: rawPhone };
  }

  function paintRestoreQr() {
    const data = buildSignedRestoreData();
    renderQRCode(canvas, data.url);
    if (caption) {
      const unitLabel = Number(data.stamps) === 1 ? ' sello ' : ' sellos ';
      caption.textContent =
        'QR firmado para ' + data.stamps + unitLabel + '(valido por 10 minutos)';
    }
    if (qrBox) {
      qrBox.classList.remove('hidden');
    }
  }

  renderRestoreGrid();

  if (btnShowQr) {
    btnShowQr.addEventListener('click', function () {
      paintRestoreQr();
      triggerHaptic(40);
      showToast('QR de reposicion firmado generado', 'info');
    });
  }

  if (btnHideQr) {
    btnHideQr.addEventListener('click', function () {
      if (qrBox) {
        qrBox.classList.add('hidden');
      }
    });
  }

  if (btnSendWa) {
    btnSendWa.addEventListener('click', function () {
      const data = buildSignedRestoreData();
      if (data.phone.length < 9) {
        showToast('Ingresa el WhatsApp del cliente para envio remoto', 'error');
        return;
      }
      const bizName = config.name ? config.name : 'nuestro local';
      const msg =
        '¡Hola! Hemos restablecido tus sellos en ' +
        bizName +
        '. Abre este enlace unico (valido 10 min): ' +
        data.url;
      window.open('https://wa.me/51' + data.phone + '?text=' + encodeURIComponent(msg), '_blank');
      triggerHaptic(50);
      showToast('Enlace firmado enviado por WhatsApp', 'success');
    });
  }

  if (btnCopyLink) {
    btnCopyLink.addEventListener('click', function () {
      copyText(buildSignedRestoreData().url, 'Enlace firmado de reposicion copiado');
      flashButtonCopied(btnCopyLink, 'copy', 'Copiar Enlace');
    });
  }
}

export function setupCounterQr(getBaseClientUrl) {
  const canvas = qs('#qr-canvas');
  const downloadBtn = qs('#btn-download-qr');
  const tabQrBtn = qs('[data-tab="tab-qr"]');

  function drawCounter() {
    if (canvas) {
      renderQRCode(canvas, getBaseClientUrl() + '?scan=1');
    }
  }

  drawCounter();
  if (tabQrBtn) {
    tabQrBtn.addEventListener('click', function () {
      setTimeout(drawCounter, 50);
    });
  }
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function () {
      if (!canvas) {
        return;
      }
      triggerHaptic(50);
      const config = getBusinessConfig();
      const safeName = config.name
        ? config.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        : 'fidelizacard';
      downloadQRCode(canvas, 'qr-mostrador-' + safeName + '.png');
      showToast('Descargando imagen QR para acrilico', 'success');
    });
  }
}

function copyText(text, successMsg) {
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(function () {
        triggerHaptic(40);
        showToast(successMsg, 'info');
      })
      .catch(function () {});
  }
}
