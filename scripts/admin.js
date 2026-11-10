/**
 * Controlador de la Suite de Administracion - FidelizaCard
 * Responsabilidades:
 * - Gestion de despacho por WhatsApp (generacion de tokens y enlaces)
 * - Renderizado y descarga de QR de mostrador en alta resolucion
 * - Configuracion de marca, reglas de juego y optimizacion de logo a Base64
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { qs, qsa, showToast, triggerHaptic } from './utils/dom.js';
import { renderQRCode, downloadQRCode } from './utils/qr-generator.js';

const STORAGE_KEY_CONFIG = 'fideliza_config';
const DEFAULT_CONFIG = {
  businessName: 'FidelizaCard',
  businessLogo: '',
  targetStamps: 8,
  rewardDescription: '1 Premio Sorpresa Gratis'
};

let currentLogoBase64 = '';
let lastGeneratedUrl = '';

document.addEventListener('DOMContentLoaded', function () {
  setupTabs();
  setupDeliverySection();
  setupQrSection();
  setupSettingsSection();
  refreshQrCode();
});

function getConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) {
      return Object.assign({}, DEFAULT_CONFIG);
    }
    const parsed = JSON.parse(raw);
    return {
      businessName: parsed.businessName ? parsed.businessName : DEFAULT_CONFIG.businessName,
      businessLogo: parsed.businessLogo ? parsed.businessLogo : '',
      targetStamps: parsed.targetStamps ? Number(parsed.targetStamps) : DEFAULT_CONFIG.targetStamps,
      rewardDescription: parsed.rewardDescription ? parsed.rewardDescription : DEFAULT_CONFIG.rewardDescription
    };
  } catch (err) {
    return Object.assign({}, DEFAULT_CONFIG);
  }
}

function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    return true;
  } catch (err) {
    return false;
  }
}

function setupTabs() {
  const tabButtons = qsa('.tab-btn');
  const contents = qsa('.tab-content');

  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const targetId = btn.dataset.tab;

      tabButtons.forEach(function (b) {
        b.classList.remove('active');
      });
      contents.forEach(function (c) {
        c.classList.add('hidden');
        c.classList.remove('active');
      });

      btn.classList.add('active');
      const targetContent = qs('#' + targetId);
      if (targetContent) {
        targetContent.classList.remove('hidden');
        targetContent.classList.add('active');
      }

      if (targetId === 'tab-qr') {
        refreshQrCode();
      }
    });
  });
}

function getCustomerCardUrl() {
  const currentUrl = window.location.href;
  return currentUrl.replace(/admin\.html.*$/, 'index.html');
}

function refreshQrCode() {
  const canvas = qs('#qr-canvas');
  if (!canvas) {
    return;
  }
  const targetUrl = getCustomerCardUrl();
  renderQRCode(canvas, targetUrl);
}

function setupQrSection() {
  const downloadBtn = qs('#btn-download-qr');
  if (!downloadBtn) {
    return;
  }

  downloadBtn.addEventListener('click', function () {
    const canvas = qs('#qr-canvas');
    const config = getConfig();
    const cleanName = config.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = 'qr-mostrador-' + (cleanName ? cleanName : 'local') + '.png';
    downloadQRCode(canvas, filename);
    triggerHaptic(40);
    showToast('Descargando QR para imprimir', 'success');
  });
}

function generateClaimToken(orderId) {
  const prefix = orderId ? String(orderId).trim().toUpperCase() : 'DEL';
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timePart = Date.now().toString().slice(-4);
  return prefix + '-' + randomPart + timePart;
}

function setupDeliverySection() {
  const form = qs('#delivery-form');
  const copyBtn = qs('#btn-copy-link');

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      handleDeliverySubmit();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      handleCopyLink();
    });
  }
}

function handleDeliverySubmit() {
  const phoneInput = qs('#delivery-phone');
  const orderInput = qs('#delivery-order-id');

  const rawPhone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
  const orderId = orderInput ? orderInput.value.trim() : '';

  if (rawPhone.length < 9) {
    showToast('Ingresa un WhatsApp valido de 9 digitos', 'error');
    return;
  }

  const token = generateClaimToken(orderId);
  const baseUrl = getCustomerCardUrl();
  const claimUrl = baseUrl + '?claim=' + encodeURIComponent(token) + '&tel=' + encodeURIComponent(rawPhone);
  lastGeneratedUrl = claimUrl;

  showUrlPreview(claimUrl);

  const config = getConfig();
  const message = '¡Hola! Gracias por tu pedido en ' + config.businessName + ' 🎁.\n' +
    'Toca aqui para sumar tu sello de hoy a tu tarjeta digital:\n' + claimUrl;

  const waUrl = 'https://wa.me/51' + rawPhone + '?text=' + encodeURIComponent(message);
  triggerHaptic(40);
  window.open(waUrl, '_blank');
  showToast('Enlace generado. Abriendo WhatsApp...', 'success');
}

function handleCopyLink() {
  if (!lastGeneratedUrl) {
    const phoneInput = qs('#delivery-phone');
    const rawPhone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
    if (rawPhone.length < 9) {
      showToast('Ingresa un telefono para generar el enlace', 'error');
      return;
    }
    const orderInput = qs('#delivery-order-id');
    const orderId = orderInput ? orderInput.value.trim() : '';
    const token = generateClaimToken(orderId);
    lastGeneratedUrl = getCustomerCardUrl() + '?claim=' + encodeURIComponent(token) + '&tel=' + encodeURIComponent(rawPhone);
    showUrlPreview(lastGeneratedUrl);
  }

  navigator.clipboard.writeText(lastGeneratedUrl).then(function () {
    triggerHaptic(30);
    showToast('Enlace copiado al portapapeles', 'success');
  }).catch(function () {
    showToast('No se pudo copiar automaticamente', 'error');
  });
}

function showUrlPreview(url) {
  const box = qs('#delivery-link-preview');
  const code = qs('#preview-url-text');
  if (box && code) {
    code.textContent = url;
    box.classList.remove('hidden');
  }
}

function setupSettingsSection() {
  const form = qs('#settings-form');
  const fileInput = qs('#logo-file-input');
  const removeLogoBtn = qs('#btn-remove-logo');

  loadSettingsToForm();

  if (fileInput) {
    fileInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) {
        return;
      }
      processLogoFile(file);
    });
  }

  if (removeLogoBtn) {
    removeLogoBtn.addEventListener('click', function () {
      currentLogoBase64 = '';
      const config = getConfig();
      updateLogoPreviews('', config.businessName);
      removeLogoBtn.classList.add('hidden');
      if (fileInput) {
        fileInput.value = '';
      }
    });
  }

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      handleSettingsSubmit();
    });
  }
}

function processLogoFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Selecciona un archivo de imagen valido', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const maxDim = 200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      currentLogoBase64 = canvas.toDataURL('image/png', 0.85);
      const config = getConfig();
      updateLogoPreviews(currentLogoBase64, config.businessName);

      const removeLogoBtn = qs('#btn-remove-logo');
      if (removeLogoBtn) {
        removeLogoBtn.classList.remove('hidden');
      }
      showToast('Logo optimizado correctamente', 'info');
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function loadSettingsToForm() {
  const config = getConfig();
  currentLogoBase64 = config.businessLogo;

  const nameInput = qs('#setting-business-name');
  const stampsSelect = qs('#setting-target-stamps');
  const rewardInput = qs('#setting-reward-desc');
  const removeLogoBtn = qs('#btn-remove-logo');

  if (nameInput) {
    nameInput.value = config.businessName;
  }
  if (stampsSelect) {
    stampsSelect.value = String(config.targetStamps);
  }
  if (rewardInput) {
    rewardInput.value = config.rewardDescription;
  }

  if (currentLogoBase64 && removeLogoBtn) {
    removeLogoBtn.classList.remove('hidden');
  }

  updateLogoPreviews(currentLogoBase64, config.businessName);
  updateHeaderBusinessInfo(config);
}

function handleSettingsSubmit() {
  const nameInput = qs('#setting-business-name');
  const stampsSelect = qs('#setting-target-stamps');
  const rewardInput = qs('#setting-reward-desc');

  const nameVal = nameInput ? nameInput.value.trim() : '';
  const stampsVal = stampsSelect ? parseInt(stampsSelect.value, 10) : 8;
  const rewardVal = rewardInput ? rewardInput.value.trim() : '';

  if (nameVal.length < 2) {
    showToast('El nombre comercial es muy corto', 'error');
    return;
  }

  const updatedConfig = {
    businessName: nameVal,
    businessLogo: currentLogoBase64,
    targetStamps: stampsVal,
    rewardDescription: rewardVal ? rewardVal : 'Premio de Fidelizacion'
  };

  const saved = saveConfig(updatedConfig);
  if (saved) {
    triggerHaptic(50);
    updateHeaderBusinessInfo(updatedConfig);
    showToast('Ajustes guardados correctamente', 'success');
  } else {
    showToast('Error al guardar configuracion', 'error');
  }
}

function updateHeaderBusinessInfo(config) {
  const headerTitle = qs('#header-business-name');
  if (headerTitle) {
    headerTitle.textContent = config.businessName;
  }
  updateLogoPreviews(config.businessLogo, config.businessName);
}

function updateLogoPreviews(logoBase64, businessName) {
  const adminBadge = qs('#admin-logo-preview');
  const settingsPreview = qs('#settings-logo-preview');
  const fallbackText = getMonogram(businessName);

  [adminBadge, settingsPreview].forEach(function (container) {
    if (!container) {
      return;
    }
    container.innerHTML = '';
    if (logoBase64) {
      const img = document.createElement('img');
      img.src = logoBase64;
      img.alt = 'Logo ' + businessName;
      container.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.className = container === adminBadge ? 'admin-logo-fallback' : 'logo-placeholder-text';
      span.textContent = fallbackText;
      container.appendChild(span);
    }
  });
}

function getMonogram(name) {
  if (!name) {
    return 'FC';
  }
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}
