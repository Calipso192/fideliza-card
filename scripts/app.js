/**
 * Orquestador principal de la aplicacion Cliente - FidelizaCard (v1.5)
 * Responsabilidades:
 * - Montaje modular sobre #main-content (Formulario Onboarding vs Tarjeta Activa)
 * - Sincronizacion de marca e imagotipo desde scripts/config.js
 * - Procesamiento de sellos por delivery (?claim=), reposicion (?setStamps=) y QR (?scan=)
 * - Efectos de sonido sintetizados con Web Audio API al sellar o desbloquear premio
 * - Secuencia automatica de reenganche (Dia 5, Dia 10 y Cumpleanos)
 * - Modal tactil de restablecimiento sobre #modal-container
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { qs, createElement, showToast, triggerHaptic } from './utils/dom.js';
import { playStampSound, playRewardFanfare } from './utils/sound-fx.js';
import {
  getConfig,
  getCustomer,
  resetCustomer,
  addStamp,
  setCustomerStamps,
  isTokenUsed,
  markTokenUsed
} from './services/storage-service.js';
import { getNotificationTemplates, formatNotificationText } from './config.js';
import { renderCustomerForm } from './components/customer-form.js';
import { renderLoyaltyCard } from './components/loyalty-card.js';

document.addEventListener('DOMContentLoaded', function () {
  initApp();
});

function initApp() {
  setupHeaderActions();
  processUrlParameters();
  routeView();
}

function updateHeaderBrand() {
  const config = getConfig();
  document.title = config.businessName + ' - Tarjeta Digital';

  const brandNameEl = qs('.brand-name');
  if (brandNameEl) {
    brandNameEl.textContent = config.businessName;
  }

  const badgeContainer = qs('.brand-badge');
  if (badgeContainer) {
    const existingImg = badgeContainer.querySelector('.header-brand-img');
    const dot = badgeContainer.querySelector('.brand-dot');

    if (config.businessLogo) {
      if (dot) {
        dot.style.display = 'none';
      }
      if (existingImg) {
        existingImg.src = config.businessLogo;
      } else {
        const img = createElement('img', {
          className: 'header-brand-img',
          src: config.businessLogo,
          alt: config.businessName
        });
        img.style.width = '20px';
        img.style.height = '20px';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        img.style.marginRight = '6px';
        badgeContainer.prepend(img);
      }
    } else {
      if (existingImg) {
        existingImg.remove();
      }
      if (dot) {
        dot.style.display = 'inline-block';
      }
    }
  }
}

function setupHeaderActions() {
  const actionsContainer = qs('#header-actions');
  if (!actionsContainer) {
    return;
  }
  actionsContainer.innerHTML = '';
  const resetBtn = createElement('button', {
    type: 'button',
    className: 'modal-close-btn',
    textContent: '⚙',
    title: 'Opciones de tarjeta',
    onclick: showResetConfirmation
  });
  actionsContainer.appendChild(resetBtn);
}

function routeView() {
  const mainContainer = qs('#main-content');
  if (!mainContainer) {
    return;
  }

  updateHeaderBrand();
  const customer = getCustomer();

  if (!customer) {
    renderCustomerForm(mainContainer, function () {
      processUrlParameters();
      routeView();
    });
    preFillPhoneFromUrl();
    return;
  }

  renderLoyaltyCard(mainContainer, customer, function () {
    routeView();
  });

  checkBirthdayNotification(customer);
  checkInactivityReminder(customer);
}

function preFillPhoneFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const tel = urlParams.get('tel');
  if (tel) {
    const phoneInput = qs('#customer-phone-input');
    if (phoneInput) {
      phoneInput.value = tel;
    }
  }
}

function notifyStampSuccess(res, customMessage) {
  triggerHaptic(60);
  showToast(customMessage, 'success');
  if (res.rewardUnlocked) {
    playRewardFanfare();
    showToast('¡Felicidades! Desbloqueaste tu premio', 'success');
  } else {
    playStampSound();
  }
}

function processUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const claim = urlParams.get('claim');
  const setStamps = urlParams.get('setStamps') ? urlParams.get('setStamps') : urlParams.get('stamps');
  const hasScan = urlParams.has('scan') ? true : urlParams.has('sello');

  const customer = getCustomer();
  if (!customer) {
    return;
  }

  let stateUpdated = false;

  if (setStamps !== null && setStamps !== undefined) {
    const count = parseInt(setStamps, 10);
    if (!isNaN(count)) {
      const res = setCustomerStamps(count);
      if (res.success) {
        triggerHaptic(50);
        if (res.rewardUnlocked) {
          playRewardFanfare();
        } else {
          playStampSound();
        }
        showToast('Sellos ajustados a ' + res.stamps, 'info');
        stateUpdated = true;
      }
    }
  } else if (claim) {
    if (isTokenUsed(claim)) {
      showToast('Este sello de pedido ya fue reclamado', 'warning');
    } else {
      markTokenUsed(claim);
      const res = addStamp(true);
      if (res.success) {
        notifyStampSuccess(res, '¡Sello de pedido sumado con exito!');
        stateUpdated = true;
      }
    }
  } else if (hasScan) {
    const res = addStamp(false);
    if (res.success) {
      notifyStampSuccess(res, '¡Sello de visita sumado con exito!');
      stateUpdated = true;
    } else if (res.reason === 'COOLDOWN') {
      showToast('Sello registrado hoy. Espera ' + res.remainingMinutes + ' min para el siguiente.', 'warning');
    }
  }

  let shouldClean = false;
  if (claim) {
    shouldClean = true;
  }
  if (setStamps !== null && setStamps !== undefined) {
    shouldClean = true;
  }
  if (hasScan) {
    shouldClean = true;
  }

  if (shouldClean) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (stateUpdated) {
    routeView();
  }
}

function showResetConfirmation() {
  const modalContainer = qs('#modal-container');
  if (!modalContainer) {
    return;
  }
  modalContainer.innerHTML = '';
  modalContainer.classList.remove('hidden');
  modalContainer.setAttribute('aria-hidden', 'false');

  const dialog = createElement('div', { className: 'modal-dialog' });
  const header = createElement('div', { className: 'modal-header' });
  const title = createElement('h3', { className: 'modal-title', textContent: 'Restablecer Tarjeta' });
  const closeBtn = createElement('button', {
    type: 'button',
    className: 'modal-close-btn',
    textContent: '✕',
    onclick: closeModal
  });
  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = createElement('div', {
    className: 'modal-body',
    textContent: '¿Deseas reiniciar tu tarjeta? Esta accion borrara los sellos acumulados en este dispositivo.'
  });

  const actions = createElement('div', { className: 'modal-actions' });
  const cancelBtn = createElement('button', {
    type: 'button',
    className: 'btn-secondary',
    textContent: 'Cancelar',
    onclick: closeModal
  });
  const confirmBtn = createElement('button', {
    type: 'button',
    className: 'btn-primary',
    textContent: 'Si, Restablecer',
    onclick: function () {
      resetCustomer();
      closeModal();
      triggerHaptic(40);
      showToast('Tarjeta restablecida', 'info');
      routeView();
    }
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);

  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(actions);

  modalContainer.appendChild(dialog);
}

function closeModal() {
  const modalContainer = qs('#modal-container');
  if (!modalContainer) {
    return;
  }
  modalContainer.classList.add('hidden');
  modalContainer.setAttribute('aria-hidden', 'true');
  modalContainer.innerHTML = '';
}

function checkBirthdayNotification(customer) {
  const birth = customer.birthdate ? customer.birthdate : customer.birthday;
  if (!birth) {
    return;
  }
  const today = new Date();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayMmDd = m + '-' + d;

  const parts = birth.split('-');
  let birthMmDd = '';
  if (parts.length === 3) {
    birthMmDd = parts[1] + '-' + parts[2];
  } else if (parts.length === 2) {
    birthMmDd = parts[0] + '-' + parts[1];
  }

  if (birthMmDd === todayMmDd) {
    const config = getConfig();
    const templates = getNotificationTemplates();
    const msg = formatNotificationText(templates.birthdayGreeting, {
      name: customer.name ? customer.name : 'Cliente',
      business: config.businessName
    });
    showToast(msg, 'success');
  }
}

function checkInactivityReminder(customer) {
  if (!customer.lastVisitDate) {
    return;
  }
  const lastDate = new Date(customer.lastVisitDate);
  const today = new Date();
  const diffTime = today.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 5) {
    return;
  }

  const config = getConfig();
  const templates = getNotificationTemplates();
  const stamps = customer.stamps ? Number(customer.stamps) : 0;
  const target = config.targetStamps ? Number(config.targetStamps) : 8;
  const remaining = Math.max(0, target - stamps);

  if (diffDays >= 10) {
    const msg = formatNotificationText(templates.day10Reminder, {
      business: config.businessName,
      remaining: remaining,
      reward: config.rewardDescription
    });
    showToast(msg, 'info');
  } else {
    const msg = formatNotificationText(templates.day5Reminder, {
      stamps: stamps,
      business: config.businessName
    });
    showToast(msg, 'info');
  }
}
