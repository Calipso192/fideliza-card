/**
 * Modal de Escaner QR Interno - FidelizaCard (v2.4)
 * Responsabilidades:
 * - Activar camara trasera nativa dentro del gesto tactil (compatible con iOS Safari)
 * - Aplicar fallback progresivo de constraints de video para iPhone y Android
 * - Detectar codigos QR en tiempo real con BarcodeDetector API o enlace manual
 * - Liberar pistas de video de forma segura al cerrar o detectar codigo
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { qs, createElement, showToast, triggerHaptic } from '../utils/dom.js';

let activeMediaStream = null;
let scanLoopTimer = null;
let isScanningActive = false;

export function openQrScannerModal(onDecoded) {
  const modalContainer = qs('#modal-container');
  if (!modalContainer) {
    return;
  }

  stopCameraResources();
  modalContainer.innerHTML = '';
  modalContainer.classList.remove('hidden');
  modalContainer.setAttribute('aria-hidden', 'false');

  const dialog = createElement('div', { className: 'modal-dialog' });

  const header = createElement('div', { className: 'modal-header' });
  const title = createElement('h3', {
    className: 'modal-title',
    textContent: 'Escanear QR en Caja'
  });
  const closeBtn = createElement('button', {
    type: 'button',
    className: 'modal-close-btn',
    textContent: '✕',
    onclick: closeQrScannerModal
  });
  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = createElement('div', { className: 'modal-body' });

  const viewport = createElement('div', { className: 'scanner-viewport' });
  const videoEl = document.createElement('video');
  videoEl.className = 'scanner-video';
  videoEl.autoplay = true;
  videoEl.muted = true;
  videoEl.playsInline = true;
  videoEl.setAttribute('autoplay', '');
  videoEl.setAttribute('muted', '');
  videoEl.setAttribute('playsinline', '');
  videoEl.setAttribute('webkit-playsinline', 'true');

  const frameOverlay = createElement('div', { className: 'scanner-frame-overlay' });
  const laserLine = createElement('div', { className: 'scanner-laser-line' });
  frameOverlay.appendChild(laserLine);

  viewport.appendChild(videoEl);
  viewport.appendChild(frameOverlay);

  const statusText = createElement('p', {
    className: 'scanner-status-text',
    textContent: 'Solicitando permiso de camara...'
  });

  const retryBtn = createElement('button', {
    type: 'button',
    className: 'btn-secondary hidden',
    textContent: 'Reintentar Permiso de Camara'
  });

  retryBtn.addEventListener('click', function () {
    triggerHaptic(30);
    retryBtn.classList.add('hidden');
    statusText.textContent = 'Solicitando permiso de camara...';
    requestCameraStream(videoEl, statusText, retryBtn, onDecoded);
  });

  const manualBox = createElement('div', { className: 'scanner-manual-box' });
  const manualInput = createElement('input', {
    type: 'text',
    className: 'field-input',
    placeholder: 'O pega aqui el enlace del QR'
  });
  const manualBtn = createElement('button', {
    type: 'button',
    className: 'btn-secondary',
    textContent: 'Validar Enlace Pegado',
    onclick: function () {
      const val = manualInput.value ? manualInput.value.trim() : '';
      if (!val) {
        showToast('Pega un enlace o codigo valido', 'warning');
        return;
      }
      handleDetection(val, onDecoded);
    }
  });
  manualBox.appendChild(manualInput);
  manualBox.appendChild(manualBtn);

  body.appendChild(viewport);
  body.appendChild(statusText);
  body.appendChild(retryBtn);
  body.appendChild(manualBox);

  dialog.appendChild(header);
  dialog.appendChild(body);
  modalContainer.appendChild(dialog);

  requestCameraStream(videoEl, statusText, retryBtn, onDecoded);
}

export function closeQrScannerModal() {
  stopCameraResources();
  const modalContainer = qs('#modal-container');
  if (!modalContainer) {
    return;
  }
  modalContainer.classList.add('hidden');
  modalContainer.setAttribute('aria-hidden', 'true');
  modalContainer.innerHTML = '';
}

function stopCameraResources() {
  isScanningActive = false;
  if (scanLoopTimer) {
    clearTimeout(scanLoopTimer);
    scanLoopTimer = null;
  }
  if (activeMediaStream) {
    const tracks = activeMediaStream.getTracks();
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].stop();
    }
    activeMediaStream = null;
  }
}

function handleDetection(rawValue, onDecoded) {
  stopCameraResources();
  closeQrScannerModal();
  triggerHaptic(60);
  if (typeof onDecoded === 'function') {
    onDecoded(rawValue);
  }
}

function getCameraErrorMessage(err) {
  const errName = err ? (err.name ? String(err.name) : '') : '';
  if (errName === 'NotAllowedError') {
    return 'Permiso denegado. En iPhone ve a Ajustes > Safari > Camara y permite el acceso, o escanea directo desde la app Camara.';
  }
  if (errName === 'PermissionDeniedError') {
    return 'Permiso de camara bloqueado. Habilitalo en la configuracion del navegador.';
  }
  if (errName === 'NotFoundError') {
    return 'No se detecto ninguna camara trasera disponible.';
  }
  if (errName === 'NotReadableError') {
    return 'La camara esta ocupada por otra aplicacion. Cierrala e intenta de nuevo.';
  }
  return 'No se pudo iniciar la camara. Usa la app Camara de tu iPhone o pega el enlace abajo.';
}

function attachStreamToVideo(stream, videoEl, statusEl, onDecoded) {
  activeMediaStream = stream;
  videoEl.srcObject = stream;

  const playPromise = videoEl.play();
  if (playPromise) {
    playPromise.catch(function () {});
  }

  isScanningActive = true;

  if ('BarcodeDetector' in window) {
    statusEl.textContent = 'Apunta al codigo QR de la pantalla de caja';
    runBarcodeLoop(videoEl, statusEl, onDecoded);
  } else {
    statusEl.textContent = 'En iOS puedes escanear directo con la app Camara de tu iPhone o pegar el enlace abajo.';
  }
}

function requestCameraStream(videoEl, statusEl, retryBtn, onDecoded) {
  if (!navigator.mediaDevices) {
    statusEl.textContent = 'Camara web no disponible (requiere HTTPS). Escanea con la app Camara de tu celular.';
    return;
  }
  if (!navigator.mediaDevices.getUserMedia) {
    statusEl.textContent = 'Tu navegador no soporta camara integrada. Usa la app Camara de tu celular.';
    return;
  }

  const primaryConstraints = {
    audio: false,
    video: {
      facingMode: 'environment'
    }
  };

  navigator.mediaDevices
    .getUserMedia(primaryConstraints)
    .then(function (stream) {
      attachStreamToVideo(stream, videoEl, statusEl, onDecoded);
    })
    .catch(function (firstErr) {
      const errName = firstErr ? (firstErr.name ? String(firstErr.name) : '') : '';
      if (errName === 'OverconstrainedError') {
        navigator.mediaDevices
          .getUserMedia({ audio: false, video: true })
          .then(function (fallbackStream) {
            attachStreamToVideo(fallbackStream, videoEl, statusEl, onDecoded);
          })
          .catch(function (secondErr) {
            statusEl.textContent = getCameraErrorMessage(secondErr);
            if (retryBtn) {
              retryBtn.classList.remove('hidden');
            }
          });
        return;
      }

      statusEl.textContent = getCameraErrorMessage(firstErr);
      if (retryBtn) {
        retryBtn.classList.remove('hidden');
      }
    });
}

function runBarcodeLoop(videoEl, statusEl, onDecoded) {
  let detector = null;
  try {
    detector = new window.BarcodeDetector({ formats: ['qr_code'] });
  } catch (err) {
    statusEl.textContent = 'Escaneo automatico no disponible. Usa la app Camara o pega el enlace.';
    return;
  }

  function scanFrame() {
    if (!isScanningActive) {
      return;
    }
    if (videoEl.readyState >= 2) {
      detector
        .detect(videoEl)
        .then(function (barcodes) {
          if (!isScanningActive) {
            return;
          }
          if (barcodes) {
            if (barcodes.length > 0) {
              const firstCode = barcodes[0].rawValue;
              if (firstCode) {
                handleDetection(firstCode, onDecoded);
                return;
              }
            }
          }
          scanLoopTimer = setTimeout(scanFrame, 260);
        })
        .catch(function () {
          if (isScanningActive) {
            scanLoopTimer = setTimeout(scanFrame, 400);
          }
        });
    } else {
      scanLoopTimer = setTimeout(scanFrame, 200);
    }
  }

  scanLoopTimer = setTimeout(scanFrame, 300);
}
