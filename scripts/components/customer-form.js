/**
 * Componente Formulario de Registro de Cliente
 * Responsabilidad: Captura y validacion de datos iniciales
 * Reglas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { createElement, showToast, triggerHaptic } from '../utils/dom.js';
import { saveCustomer, addStamp } from '../services/storage-service.js';

export function renderCustomerForm(container, onComplete) {
  if (!container) {
    return;
  }

  container.innerHTML = '';

  const formCard = createElement('div', { className: 'form-card' });

  const title = createElement('h2', {
    className: 'form-title',
    textContent: 'Bienvenido'
  });

  const subtitle = createElement('p', {
    className: 'form-subtitle',
    textContent: 'Registra tus datos para activar tu tarjeta y acumular tus sellos de recompensa.'
  });

  const form = createElement('form', {
    className: 'customer-registration-form',
    onsubmit: function (event) {
      event.preventDefault();
      handleSubmit(form, onComplete);
    }
  });

  // Campo Nombre
  const nameGroup = createElement('div', { className: 'field-group' });
  const nameLabel = createElement('label', {
    className: 'field-label',
    textContent: 'Tu Nombre Completo',
    htmlFor: 'customer-name-input'
  });
  const nameInput = createElement('input', {
    type: 'text',
    id: 'customer-name-input',
    className: 'field-input',
    placeholder: 'Ej. Juan Perez',
    required: 'true',
    autocomplete: 'name'
  });
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);

  // Campo WhatsApp
  const phoneGroup = createElement('div', { className: 'field-group' });
  const phoneLabel = createElement('label', {
    className: 'field-label',
    textContent: 'WhatsApp (9 digitos)',
    htmlFor: 'customer-phone-input'
  });
  const phoneInput = createElement('input', {
    type: 'tel',
    id: 'customer-phone-input',
    className: 'field-input',
    placeholder: 'Ej. 987654321',
    pattern: '[0-9]{9,15}',
    required: 'true',
    inputmode: 'numeric',
    autocomplete: 'tel'
  });
  phoneGroup.appendChild(phoneLabel);
  phoneGroup.appendChild(phoneInput);

  // Campo Cumpleaños
  const birthGroup = createElement('div', { className: 'field-group' });
  const birthLabel = createElement('label', {
    className: 'field-label',
    textContent: 'Fecha de Cumpleaños',
    htmlFor: 'customer-birth-input'
  });
  const birthInput = createElement('input', {
    type: 'date',
    id: 'customer-birth-input',
    className: 'field-input'
  });
  birthGroup.appendChild(birthLabel);
  birthGroup.appendChild(birthInput);

  // Boton Enviar
  const submitBtn = createElement('button', {
    type: 'submit',
    className: 'btn-primary',
    textContent: 'Crear Mi Tarjeta'
  });

  form.appendChild(nameGroup);
  form.appendChild(phoneGroup);
  form.appendChild(birthGroup);
  form.appendChild(submitBtn);

  formCard.appendChild(title);
  formCard.appendChild(subtitle);
  formCard.appendChild(form);

  container.appendChild(formCard);
}

function handleSubmit(formElement, onComplete) {
  const nameInput = formElement.querySelector('#customer-name-input');
  const phoneInput = formElement.querySelector('#customer-phone-input');
  const birthInput = formElement.querySelector('#customer-birth-input');

  const nameVal = nameInput ? nameInput.value.trim() : '';
  const rawPhone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
  const birthVal = birthInput ? birthInput.value : '';

  if (nameVal.length < 2) {
    showToast('Ingresa un nombre valido', 'error');
    if (nameInput) {
      nameInput.focus();
    }
    return;
  }

  if (rawPhone.length < 9) {
    showToast('El WhatsApp debe tener al menos 9 digitos', 'error');
    if (phoneInput) {
      phoneInput.focus();
    }
    return;
  }

  const saved = saveCustomer({
    name: nameVal,
    whatsapp: rawPhone,
    birthdate: birthVal
  });

  if (!saved) {
    showToast('No se pudo guardar la informacion', 'error');
    return;
  }

  // Comprobar si el usuario ingreso con un link de reclamo o escaneo activo
  const urlParams = new URLSearchParams(window.location.search);
  const hasClaim = urlParams.has('claim');
  const hasScan = urlParams.has('scan') ? true : urlParams.has('sello');
  const hasSetStamps = urlParams.has('setStamps') ? true : urlParams.has('stamps');

  // Solo se otorga sello de bienvenida si entra de forma organica sin link de compra
  let incomingWithAction = false;
  if (hasClaim) {
    incomingWithAction = true;
  }
  if (hasScan) {
    incomingWithAction = true;
  }
  if (hasSetStamps) {
    incomingWithAction = true;
  }

  if (!incomingWithAction) {
    addStamp(true);
    showToast('¡Bienvenido! Tienes tu 1er sello de regalo', 'success');
  } else {
    showToast('¡Cuenta creada! Procesando tu sello...', 'info');
  }

  triggerHaptic(50);

  if (typeof onComplete === 'function') {
    onComplete(saved);
  }
}
