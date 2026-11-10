/**
 * Orquestador principal de la aplicacion FidelizaCard
 * Responsabilidades:
 * - Deteccion de estado de usuario (Onboarding vs Tarjeta activa)
 * - Procesamiento de sellos por parametros de URL (Delivery / QR / NFC)
 * - Gestion de restablecimiento y utilidades de demostracion
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { qs, showToast, triggerHaptic, createElement } from './utils/dom.js';
import {
  getCustomer,
  addStamp,
  isTokenUsed,
  markTokenAsUsed,
  resetAllData
} from './services/storage-service.js';
import { renderCustomerForm } from './components/customer-form.js';
import { renderLoyaltyCard } from './components/loyalty-card.js';

document.addEventListener('DOMContentLoaded', function () {
  initApp();
});

function initApp() {
  const mainContainer = qs('#main-content');
  if (!mainContainer) {
    return;
  }

  setupHeaderActions();
  routeView();
}

function routeView() {
  const mainContainer = qs('#main-content');
  const customer = getCustomer();

  if (!customer) {
    renderCustomerForm(mainContainer, function (newCustomer) {
      handlePostRegistration(newCustomer);
    });
    return;
  }

  // Si el cliente ya esta registrado, renderizamos su tarjeta y procesamos enlaces pendientes
  renderLoyaltyCard(mainContainer, customer, function () {
    routeView();
  });

  processUrlClaim(customer);
}

function handlePostRegistration(newCustomer) {
  const mainContainer = qs('#main-content');
  renderLoyaltyCard(mainContainer, newCustomer, function () {
    routeView();
  });
  processUrlClaim(newCustomer);
}

function processUrlClaim(customer) {
  const urlParams = new URLSearchParams(window.location.search);
  const claimToken = urlParams.get('claim');
  const targetPhone = urlParams.get('tel');

  if (!claimToken) {
    return;
  }

  // Limpiar parametros de la barra de direcciones de inmediato para evitar re-ejecuciones
  window.history.replaceState({}, document.title, window.location.pathname);

  // Verificacion de telefono destinatario (Canal Delivery)
  if (targetPhone && customer && customer.whatsapp) {
    const cleanCustomer = String(customer.whatsapp).replace(/\D/g, '');
    const cleanTarget = String(targetPhone).replace(/\D/g, '');

    if (cleanCustomer !== cleanTarget) {
      showToast('Este sello pertenece a otro numero de WhatsApp', 'error', 4000);
      return;
    }
  }

  // Verificacion de token consumido
  if (isTokenUsed(claimToken)) {
    showToast('Este enlace de sello ya fue utilizado anteriormente', 'error', 4000);
    return;
  }

  // Intento de estampacion respetando cooldown
  const result = addStamp(false);

  if (result.success) {
    markTokenAsUsed(claimToken);
    triggerHaptic(70);
    showToast(result.message, 'success', 4000);
    const mainContainer = qs('#main-content');
    renderLoyaltyCard(mainContainer, customer, function () {
      routeView();
    });
  } else {
    showToast(result.message, 'error', 4000);
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
    title: 'Reiniciar demo',
    onclick: showResetConfirmation
  });

  actionsContainer.appendChild(resetBtn);
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
  const title = createElement('h3', {
    className: 'modal-title',
    textContent: 'Restablecer Datos'
  });
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
    textContent: '¿Deseas reiniciar la tarjeta y datos de prueba? Esta accion borrara el cliente y sellos de este navegador.'
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
    textContent: 'Si, Borrar Todo',
    onclick: function () {
      resetAllData();
      closeModal();
      showToast('Datos reiniciados con exito', 'info');
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
