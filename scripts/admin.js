/**
 * Orquestador del Panel Operativo de Caja - FidelizaCard (v2.2 PWA Dual)
 * Responsabilidades:
 * - Aplicar la paleta cromatica del negocio al iniciar el panel de caja
 * - Sincronizar identidad de marca e iconos vectoriales en botones operativos
 * - Gestionar navegacion entre 5 pestanas y emision de QR dinamico multi-sello
 * - Conectar despacho delivery, reposicion tactil y lanzador Demo pantalla completa
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { qs, qsa, createElement, showToast, triggerHaptic } from './utils/dom.js';
import { createUiIcon } from './utils/icons.js';
import { applyBusinessTheme } from './utils/theme-applier.js';
import { getBusinessConfig } from './config.js';
import { renderQRCode } from './utils/qr-generator.js';
import {
  setupDeliveryDispatch,
  setupStampsRestore,
  setupCounterQr
} from './components/admin-ops.js';
import { renderAdminDemoSimulator } from './components/admin-demo-sim.js';

let dynamicTimerInterval = null;
let selectedDynamicStamps = 1;

document.addEventListener('DOMContentLoaded', function () {
  initAdmin();
});

function initAdmin() {
  applyBusinessTheme();
  renderBrandHeader();
  decorateAdminButtons();
  setupTabs();
  setupDynamicQr();
  setupDeliveryDispatch(getBaseClientUrl);
  setupStampsRestore(getBaseClientUrl);
  setupCounterQr(getBaseClientUrl);
  renderAdminDemoSimulator(qs('#demo-sim-container'));
}

function decorateAdminButtons() {
  const previewLink = qs('#btn-preview-card');
  if (previewLink) {
    previewLink.innerHTML = '';
    previewLink.appendChild(createUiIcon('external', '', 14));
    previewLink.appendChild(createElement('span', { textContent: 'Ver Tarjeta' }));
  }

  const refreshBtn = qs('#btn-refresh-dynamic-qr');
  if (refreshBtn) {
    refreshBtn.innerHTML = '';
    refreshBtn.appendChild(createUiIcon('refresh', '', 17));
    refreshBtn.appendChild(createElement('span', { textContent: 'Renovar Codigo QR' }));
  }
}

function renderBrandHeader() {
  const config = getBusinessConfig();
  const bizName = config.name ? config.name : 'FidelizaCard';
  const initials = bizName.slice(0, 2).toUpperCase();

  const titleEl = qs('#header-business-name');
  if (titleEl) {
    titleEl.textContent = bizName;
  }

  const logoBadge = qs('#admin-logo-preview');
  if (!logoBadge) {
    return;
  }

  if (config.logo) {
    logoBadge.innerHTML = '';
    const img = document.createElement('img');
    img.src = config.logo.indexOf('http') === 0 ? config.logo : '../' + config.logo;
    img.alt = bizName;
    img.onerror = function () {
      logoBadge.innerHTML = '<span class="admin-logo-fallback">' + initials + '</span>';
    };
    logoBadge.appendChild(img);
  } else {
    const fallback = logoBadge.querySelector('.admin-logo-fallback');
    if (fallback) {
      fallback.textContent = initials;
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
  const adminIndexPos = path.indexOf('/admin/');
  if (adminIndexPos !== -1) {
    path = path.substring(0, adminIndexPos + 1);
  } else if (path.endsWith('/admin')) {
    path = path.substring(0, path.length - 5);
  } else if (path.indexOf('admin.html') !== -1) {
    path = path.replace('admin.html', '');
  }
  if (!path.endsWith('/')) {
    path = path + '/';
  }
  return loc.origin + path;
}

function setupDynamicQr() {
  const stampBtns = qsa('.dyn-stamp-btn');
  const generateBtn = qs('#btn-generate-dynamic-qr');
  const refreshBtn = qs('#btn-refresh-dynamic-qr');
  const qrBox = qs('#dynamic-qr-box');
  const canvas = qs('#dynamic-qr-canvas');
  const badge = qs('#dynamic-qr-badge');
  const timerEl = qs('#dynamic-qr-timer');

  for (let i = 0; i < stampBtns.length; i++) {
    stampBtns[i].addEventListener('click', function () {
      for (let j = 0; j < stampBtns.length; j++) {
        stampBtns[j].classList.remove('active');
      }
      this.classList.add('active');
      const val = parseInt(this.getAttribute('data-stamps'), 10);
      selectedDynamicStamps = isNaN(val) ? 1 : val;
      triggerHaptic(25);
      if (qrBox) {
        if (!qrBox.classList.contains('hidden')) {
          issueDynamicCode();
        }
      }
    });
  }

  function issueDynamicCode() {
    if (!canvas) {
      return;
    }
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000;
    const rand = Math.floor(1000 + Math.random() * 9000);
    const token = 'DYN-' + now + '-' + rand;
    const dynamicUrl =
      getBaseClientUrl() +
      '?dyn=' +
      encodeURIComponent(token) +
      '&s=' +
      selectedDynamicStamps +
      '&exp=' +
      expiresAt;

    renderQRCode(canvas, dynamicUrl);

    if (badge) {
      const label =
        selectedDynamicStamps === 1
          ? '+1 SELLO ACTIVO'
          : '+' + selectedDynamicStamps + ' SELLOS ACTIVOS';
      badge.textContent = label;
    }
    if (qrBox) {
      qrBox.classList.remove('hidden');
    }

    startDynamicCountdown(expiresAt, timerEl);
    triggerHaptic(45);
    showToast('QR dinamico generado (' + selectedDynamicStamps + ' sellos)', 'success');
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', issueDynamicCode);
  }
  if (refreshBtn) {
    refreshBtn.addEventListener('click', issueDynamicCode);
  }
}

function startDynamicCountdown(expiresAt, timerEl) {
  if (dynamicTimerInterval) {
    clearInterval(dynamicTimerInterval);
    dynamicTimerInterval = null;
  }
  if (!timerEl) {
    return;
  }

  function updateTick() {
    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) {
      clearInterval(dynamicTimerInterval);
      dynamicTimerInterval = null;
      timerEl.textContent = 'Codigo caducado · Genera uno nuevo';
      timerEl.classList.add('expired');
      return;
    }
    const totalSec = Math.ceil(remainingMs / 1000);
    const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    timerEl.classList.remove('expired');
    timerEl.textContent = 'Valido por ' + mins + ':' + secs + ' min';
  }

  updateTick();
  dynamicTimerInterval = setInterval(updateTick, 1000);
}
