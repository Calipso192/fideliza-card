/**
 * Utilidades de manipulacion del DOM y notificaciones de interfaz
 * Restriccion estricta: Cero barras verticales y Vanilla JS modular puro
 */

export function qs(selector, scope) {
  const root = scope ? scope : document;
  return root.querySelector(selector);
}

export function qsa(selector, scope) {
  const root = scope ? scope : document;
  return Array.from(root.querySelectorAll(selector));
}

export function createElement(tag, attrs, children) {
  const element = document.createElement(tag);
  const attributes = attrs ? attrs : {};
  const childNodes = children ? children : [];

  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'textContent') {
      element.textContent = value;
    } else if (key === 'innerHTML') {
      element.innerHTML = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else if (key.startsWith('dataset') && typeof value === 'object') {
      for (const [dataKey, dataVal] of Object.entries(value)) {
        element.dataset[dataKey] = dataVal;
      }
    } else {
      element.setAttribute(key, value);
    }
  }

  for (const child of childNodes) {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }

  return element;
}

export function showToast(message, type, duration) {
  const toastType = type ? type : 'info';
  const displayDuration = duration ? duration : 3000;
  const container = document.getElementById('toast-container');

  if (!container) {
    return;
  }

  const toast = createElement('div', {
    className: 'toast-item ' + toastType,
    textContent: message
  });

  container.appendChild(toast);

  setTimeout(function () {
    toast.style.transition = 'opacity 200ms ease, transform 200ms ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';

    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }, displayDuration);
}

export function triggerHaptic(duration) {
  const hapticTime = duration ? duration : 40;
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(hapticTime);
    } catch (e) {
      // Ignorar si el dispositivo bloquea vibracion en segundo plano
    }
  }
}

export function maskPhone(phone) {
  if (!phone) {
    return '';
  }
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length >= 9) {
    const prefix = clean.slice(0, 3);
    const suffix = clean.slice(-2);
    return prefix + ' ••• •' + suffix;
  }
  return clean;
}
