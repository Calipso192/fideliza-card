/**
 * Logica operativa de mostrador y despacho - FidelizaCard (Fase 1 Llave en Mano)
 * Responsabilidades:
 * - Sincronizacion de marca e imagotipo desde scripts/config.js
 * - Navegacion por pestanas operativas (Despacho, Reposicion, QR Mostrador)
 * - Despacho de sellos por delivery via WhatsApp (?claim=PED-XXX)
 * - Reposicion directa de sellos por QR temporal o WhatsApp (?setStamps=X)
 * - Generacion y descarga del QR estatico para acrilico de mostrador
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { qs, qsa, showToast, triggerHaptic } from './utils/dom.js';
import { getBusinessConfig } from './config.js';
import { renderQRCode, downloadQRCode } from './utils/qr-generator.js';

document.addEventListener('DOMContentLoaded', function () {
  initAdmin();
});

function initAdmin() {
  renderBrandHeader();
  setupTabs();
  setupDeliveryDispatch();
  setupStampsRestore();
  setupCounterQr();
}

function renderBrandHeader() {
  const config = getBusinessConfig();
  const titleEl = qs('#header-business-name');
  if (titleEl) {
    titleEl.textContent = config.name ? config.name : 'FidelizaCard';
  }

  const logoBadge = qs('#admin-logo-preview');
  if (logoBadge) {
    if (config.logo) {
      logoBadge.innerHTML = '';
      const img = document.createElement('img');
      img.src = config.logo;
      img.alt = config.name;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';
      logoBadge.appendChild(img);
    } else {
      const fallback = logoBadge.querySelector('.admin-logo-fallback');
      if (fallback) {
        const initials = config.name ? config.name.slice(0, 2).toUpperCase() : 'FC';
        fallback.textContent = initials;
      }
    }
  }
}

function setupTabs() {
  const tabButtons = qsa('.tab-btn');
  const tabContents = qsa('.tab-content');

  for (let i = 0; i < tabButtons.length; i++) {
    tabButtons[i].addEventListener('click', function () {
      const targetId = this.getAttribute('data-tab');

      for (let j = 0; j < tabButtons.length; j++) {
        tabButtons[j].classList.remove('active');
      }
      for (let k = 0; k < tabContents.length; k++) {
        tabContents[k].classList.remove('active');
        tabContents[k].classList.add('hidden');
      }

      this.classList.add('active');
      const activeContent = qs('#' + targetId);
      if (activeContent) {
        activeContent.classList.remove('hidden');
        activeContent.classList.add('active');
      }

      triggerHaptic(30);
    });
  }
}

function getBaseClientUrl() {
  const config = getBusinessConfig();
  if (config.appUrl) {
    let base = config.appUrl.trim();
    if (!base.endsWith('/')) {
      base = base + '/';
    }
    return base;
  }
  const loc = window.location;
  let path = loc.pathname;
  if (path.indexOf('admin.html') !== -1) {
    path = path.replace('admin.html', '');
  }
  if (!path.endsWith('/')) {
    path = path + '/';
  }
  return loc.origin + path;
}

function renderQr(canvas, text) {
  if (!canvas) {
    return;
  }
  renderQRCode(canvas, text);
}

function setupDeliveryDispatch() {
  const form = qs('#delivery-form');
  const copyBtn = qs('#btn-copy-link');

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
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        orderCode = 'PED-' + randomNum;
      }

      const clientUrl = getBaseClientUrl() + '?claim=' + encodeURIComponent(orderCode) + '&tel=' + rawPhone;
      displayLinkPreview(clientUrl);

      const config = getBusinessConfig();
      const bizName = config.name ? config.name : 'nuestro local';
      const msg = '¡Hola! Gracias por tu pedido en ' + bizName + '. Suma tu sello aqui: ' + clientUrl;
      const waUrl = 'https://wa.me/51' + rawPhone + '?text=' + encodeURIComponent(msg);

      triggerHaptic(50);
      window.open(waUrl, '_blank');
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
      copyToClipboard(clientUrl, 'Enlace manual copiado al portapapeles');
    });
  }
}

function displayLinkPreview(url) {
  const previewBox = qs('#delivery-link-preview');
  const previewText = qs('#preview-url-text');
  if (previewBox && previewText) {
    previewText.textContent = url;
    previewBox.classList.remove('hidden');
  }
}

function setupStampsRestore() {
  const countSelect = qs('#restore-stamps-count');
  const phoneInput = qs('#restore-phone');
  const btnShowQr = qs('#btn-show-restore-qr');
  const btnHideQr = qs('#btn-hide-restore-qr');
  const btnSendWa = qs('#btn-send-restore-whatsapp');
  const btnCopyLink = qs('#btn-copy-restore-link');
  const qrBox = qs('#restore-qr-box');
  const canvas = qs('#restore-qr-canvas');
  const caption = qs('#restore-qr-caption');

  function buildRestoreUrl() {
    const stamps = countSelect ? countSelect.value : '1';
    let url = getBaseClientUrl() + '?setStamps=' + stamps;
    const rawPhone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
    if (rawPhone.length >= 9) {
      url = url + '&tel=' + rawPhone;
    }
    return { url: url, stamps: stamps, phone: rawPhone };
  }

  if (btnShowQr && qrBox && canvas) {
    btnShowQr.addEventListener('click', function () {
      const data = buildRestoreUrl();
      renderQr(canvas, data.url);
      if (caption) {
        caption.textContent = 'Escanea para restablecer ' + data.stamps + ' sellos en la tarjeta';
      }
      qrBox.classList.remove('hidden');
      triggerHaptic(40);
      showToast('QR de reposicion visible en pantalla', 'info');
    });
  }

  if (btnHideQr && qrBox) {
    btnHideQr.addEventListener('click', function () {
      qrBox.classList.add('hidden');
    });
  }

  if (btnSendWa) {
    btnSendWa.addEventListener('click', function () {
      const data = buildRestoreUrl();
      if (data.phone.length < 9) {
        showToast('Ingresa el WhatsApp del cliente para envio remoto', 'error');
        if (phoneInput) {
          phoneInput.focus();
        }
        return;
      }

      const config = getBusinessConfig();
      const bizName = config.name ? config.name : 'nuestro local';
      const msg = '¡Hola! Hemos restablecido tus sellos en ' + bizName + '. Abre este enlace: ' + data.url;
      const waUrl = 'https://wa.me/51' + data.phone + '?text=' + encodeURIComponent(msg);

      triggerHaptic(50);
      window.open(waUrl, '_blank');
      showToast('Enlace de reposicion enviado por WhatsApp', 'success');
    });
  }

  if (btnCopyLink) {
    btnCopyLink.addEventListener('click', function () {
      const data = buildRestoreUrl();
      copyToClipboard(data.url, 'Enlace de reposicion copiado');
    });
  }
}

function setupCounterQr() {
  const canvas = qs('#qr-canvas');
  const downloadBtn = qs('#btn-download-qr');
  const tabQrBtn = qs('[data-tab="tab-qr"]');

  function drawCounter() {
    if (canvas) {
      const counterUrl = getBaseClientUrl() + '?scan=1';
      renderQr(canvas, counterUrl);
    }
  }

  drawCounter();

  if (tabQrBtn) {
    tabQrBtn.addEventListener('click', function () {
      setTimeout(drawCounter, 50);
    });
  }

  if (downloadBtn && canvas) {
    downloadBtn.addEventListener('click', function () {
      triggerHaptic(50);
      const config = getBusinessConfig();
      const safeName = config.name ? config.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'fidelizacard';
      const filename = 'qr-mostrador-' + safeName + '.png';
      downloadQRCode(canvas, filename);
      showToast('Descargando imagen QR para acrilico', 'success');
    });
  }
}

function copyToClipboard(text, successMessage) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      triggerHaptic(40);
      showToast(successMessage ? successMessage : 'Copiado al portapapeles', 'info');
    }).catch(function () {
      fallbackCopy(text, successMessage);
    });
  } else {
    fallbackCopy(text, successMessage);
  }
}

function fallbackCopy(text, successMessage) {
  const input = document.createElement('input');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  try {
    document.execCommand('copy');
    triggerHaptic(40);
    showToast(successMessage ? successMessage : 'Copiado al portapapeles', 'info');
  } catch (err) {
    showToast('No se pudo copiar automaticamente', 'error');
  }
  document.body.removeChild(input);
}
