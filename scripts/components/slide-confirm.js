/**
 * Componente Deslizador Tactil Slide-to-Confirm - FidelizaCard (v2.0)
 * Responsabilidades:
 * - Proteger acciones criticas mediante deslizamiento horizontal intencional
 * - Brindar retroalimentacion visual progresiva y vibracion haptica
 * - Retornar suavemente al origen si el usuario suelta antes del 85%
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { createElement, triggerHaptic } from '../utils/dom.js';

export function createSlideConfirm(options) {
  const opts = options ? options : {};
  const labelText = opts.label ? opts.label : 'Desliza para confirmar';
  const doneText = opts.confirmedLabel ? opts.confirmedLabel : '¡Confirmado!';
  const onConfirm = typeof opts.onConfirm === 'function' ? opts.onConfirm : null;

  const track = createElement('div', { className: 'slide-confirm-track' });
  const fill = createElement('div', { className: 'slide-confirm-fill' });
  const label = createElement('span', {
    className: 'slide-confirm-label',
    textContent: labelText
  });
  const thumb = createElement('div', {
    className: 'slide-confirm-thumb',
    textContent: '➔'
  });

  track.appendChild(fill);
  track.appendChild(label);
  track.appendChild(thumb);

  let isDragging = false;
  let isCompleted = false;
  let startX = 0;
  let currentX = 0;
  let halfHapticDone = false;

  function getMaxTravel() {
    const trackW = track.clientWidth ? track.clientWidth : 260;
    const thumbW = thumb.offsetWidth ? thumb.offsetWidth : 44;
    return Math.max(40, trackW - thumbW - 8);
  }

  function applyPosition(px, animate) {
    if (animate) {
      thumb.style.transition = 'transform 200ms ease';
      fill.style.transition = 'width 200ms ease';
    } else {
      thumb.style.transition = 'none';
      fill.style.transition = 'none';
    }
    thumb.style.transform = 'translateX(' + px + 'px)';
    const thumbW = thumb.offsetWidth ? thumb.offsetWidth : 44;
    fill.style.width = px > 0 ? (px + thumbW) + 'px' : '0px';
  }

  function completeSlide(maxTravel) {
    isCompleted = true;
    isDragging = false;
    applyPosition(maxTravel, true);
    track.classList.add('confirmed');
    label.textContent = doneText;
    thumb.textContent = '✓';
    triggerHaptic(60);

    if (onConfirm) {
      setTimeout(function () {
        onConfirm();
      }, 180);
    }
  }

  function resetSlide() {
    isDragging = false;
    currentX = 0;
    halfHapticDone = false;
    applyPosition(0, true);
  }

  thumb.addEventListener('pointerdown', function (e) {
    if (isCompleted) {
      return;
    }
    isDragging = true;
    startX = e.clientX - currentX;
    halfHapticDone = false;
    if (thumb.setPointerCapture) {
      thumb.setPointerCapture(e.pointerId);
    }
    triggerHaptic(15);
  });

  thumb.addEventListener('pointermove', function (e) {
    if (!isDragging) {
      return;
    }
    if (isCompleted) {
      return;
    }
    const maxTravel = getMaxTravel();
    const rawDelta = e.clientX - startX;
    currentX = Math.max(0, Math.min(maxTravel, rawDelta));
    applyPosition(currentX, false);

    if (!halfHapticDone) {
      if (currentX >= maxTravel * 0.5) {
        halfHapticDone = true;
        triggerHaptic(20);
      }
    }
  });

  function handlePointerRelease() {
    if (!isDragging) {
      return;
    }
    if (isCompleted) {
      return;
    }
    const maxTravel = getMaxTravel();
    if (currentX >= maxTravel * 0.85) {
      completeSlide(maxTravel);
    } else {
      resetSlide();
    }
  }

  thumb.addEventListener('pointerup', handlePointerRelease);
  thumb.addEventListener('pointercancel', handlePointerRelease);

  return track;
}
