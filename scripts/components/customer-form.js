/**
 * Componente Formulario de Registro de Cliente - FidelizaCard (v2.4)
 * Responsabilidades:
 * - Mostrar identidad visual del negocio (logo y nombre) en el alta inicial
 * - Captura y validacion de datos con mascara DD-MM-AAAA
 * - Delegar el 1er sello de bienvenida exclusivamente al QR de bienvenida/mostrador
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { createElement, showToast, triggerHaptic } from '../utils/dom.js';
import { getConfig, saveCustomer } from '../services/storage-service.js';

export function renderCustomerForm(container, onComplete) {
  if (!container) {
    return;
  }

  container.innerHTML = '';

  const config = getConfig();
  const formCard = createElement('div', { className: 'form-card' });

  const brandBanner = createElement('div', { className: 'form-brand-banner' });
  if (config.businessLogo) {
    const logoImg = createElement('img', {
      className: 'form-brand-logo',
      src: config.businessLogo,
      alt: config.businessName
    });
    logoImg.onerror = function () {
      logoImg.remove();
    };
    brandBanner.appendChild(logoImg);
  }
  const brandNameEl = createElement('span', {
    className: 'form-brand-name',
    textContent: config.businessName
  });
  brandBanner.appendChild(brandNameEl);
  formCard.appendChild(brandBanner);

  const title = createElement('h2', {
    className: 'form-title',
    textContent: 'Bienvenido'
  });

  const subtitle = createElement('p', {
    className: 'form-subtitle',
    textContent: 'Registra tus datos para activar tu pase digital y acumular sellos.'
  });

  const form = createElement('form', {
    className: 'customer-registration-form',
    onsubmit: function (event) {
      event.preventDefault();
      handleSubmit(form, onComplete);
    }
  });

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

  const birthGroup = createElement('div', { className: 'field-group' });
  const birthLabel = createElement('label', {
    className: 'field-label',
    textContent: 'Fecha de Cumpleanos (Opcional)',
    htmlFor: 'customer-birth-input'
  });
  const birthInput = createElement('input', {
    type: 'text',
    id: 'customer-birth-input',
    className: 'field-input',
    placeholder: 'DD-MM-AAAA (Ej. 15-08-1998)',
    inputmode: 'numeric',
    maxlength: '10',
    autocomplete: 'bday'
  });

  birthInput.addEventListener('input', function () {
    birthInput.value = formatBirthDateMask(birthInput.value);
  });

  birthGroup.appendChild(birthLabel);
  birthGroup.appendChild(birthInput);

  const submitBtn = createElement('button', {
    type: 'submit',
    className: 'btn-primary',
    textContent: 'Activar Mi Tarjeta'
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

function formatBirthDateMask(rawValue) {
  const digits = String(rawValue).replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return digits.slice(0, 2) + '-' + digits.slice(2);
  }
  return digits.slice(0, 2) + '-' + digits.slice(2, 4) + '-' + digits.slice(4);
}

function parseAndValidateBirthDate(maskedValue) {
  const trimmed = String(maskedValue).trim();
  if (!trimmed) {
    return { valid: true, isoValue: '' };
  }

  const parts = trimmed.split('-');
  if (parts.length !== 3) {
    return { valid: false, isoValue: '' };
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (parts[0].length !== 2) {
    return { valid: false, isoValue: '' };
  }
  if (parts[1].length !== 2) {
    return { valid: false, isoValue: '' };
  }
  if (parts[2].length !== 4) {
    return { valid: false, isoValue: '' };
  }

  if (isNaN(day) ? true : isNaN(month) ? true : isNaN(year)) {
    return { valid: false, isoValue: '' };
  }

  const currentYear = new Date().getFullYear();
  if (year < 1920) {
    return { valid: false, isoValue: '' };
  }
  if (year > currentYear) {
    return { valid: false, isoValue: '' };
  }
  if (month < 1) {
    return { valid: false, isoValue: '' };
  }
  if (month > 12) {
    return { valid: false, isoValue: '' };
  }

  const maxDaysInMonth = new Date(year, month, 0).getDate();
  if (day < 1) {
    return { valid: false, isoValue: '' };
  }
  if (day > maxDaysInMonth) {
    return { valid: false, isoValue: '' };
  }

  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const yyyy = String(year);

  return {
    valid: true,
    isoValue: yyyy + '-' + mm + '-' + dd
  };
}

function hasIncomingStampAction() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('welcome')) {
    return true;
  }
  if (urlParams.has('dyn')) {
    return true;
  }
  if (urlParams.has('rst')) {
    return true;
  }
  if (urlParams.has('claim')) {
    return true;
  }
  if (urlParams.has('scan')) {
    return true;
  }
  if (urlParams.has('sello')) {
    return true;
  }
  return false;
}

function handleSubmit(formElement, onComplete) {
  const nameInput = formElement.querySelector('#customer-name-input');
  const phoneInput = formElement.querySelector('#customer-phone-input');
  const birthInput = formElement.querySelector('#customer-birth-input');

  const nameVal = nameInput ? nameInput.value.trim() : '';
  const rawPhone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
  const birthRaw = birthInput ? birthInput.value : '';

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

  const parsedBirth = parseAndValidateBirthDate(birthRaw);
  if (!parsedBirth.valid) {
    showToast('Fecha invalida. Usa formato DD-MM-AAAA', 'error');
    if (birthInput) {
      birthInput.focus();
    }
    return;
  }

  const saved = saveCustomer({
    name: nameVal,
    whatsapp: rawPhone,
    birthdate: parsedBirth.isoValue
  });

  if (!saved) {
    showToast('No se pudo guardar la informacion', 'error');
    return;
  }

  const incomingWithAction = hasIncomingStampAction();

  if (incomingWithAction) {
    showToast('¡Tarjeta activada! Aplicando tu sello...', 'info');
  } else {
    showToast('¡Tarjeta activada! Escanea un QR en caja para sumar sellos', 'success');
  }

  triggerHaptic(50);

  if (typeof onComplete === 'function') {
    onComplete(incomingWithAction);
  }
}
