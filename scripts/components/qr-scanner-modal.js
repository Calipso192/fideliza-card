/**
 * Modal de Escaner QR Interno - FidelizaCard (v2.0)
 * Responsabilidades:
 * - Activar camara trasera nativa dentro de la PWA sin abrir navegador externo
 * - Detectar codigos QR en tiempo real con BarcodeDetector API
 * - Liberar pistas de video de forma segura al cerrar o detectar codigo
 * - Proveer respaldo de pegado manual para dispositivos sin BarcodeDetector
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
  const videoEl = createElement('video', {
    className: 'scanner-video',
    playsinline: 'true',
    muted: 'true'
  });
  videoEl.setAttribute('autoplay', 'true');
  videoEl.setAttribute('playsinline', 'true');

  const frameOverlay = createElement('div', { className: 'scanner-frame-overlay' });
  const laserLine = createElement('div', { className: 'scanner-laser-line' });
  frameOverlay.appendChild(laserLine);

  viewport.appendChild(videoEl);
  viewport.appendChild(frameOverlay);

  const statusText = createElement('p', {
    className: 'scanner-status-text',
    textContent: 'Iniciando camara trasera...'
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
  body.appendChild(manualBox);

  dialog.appendChild(header);
  dialog.appendChild(body);
  modalContainer.appendChild(dialog);

  startCameraScanner(videoEl, statusText, onDecoded);
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

function startCameraScanner(videoEl, statusEl, onDecoded) {
  if (!navigator.mediaDevices) {
    statusEl.textContent = 'Camara no disponible en este navegador. Usa el campo inferior.';
    return;
  }
  if (!navigator.mediaDevices.getUserMedia) {
    statusEl.textContent = 'Permiso de camara no soportado. Usa el campo inferior.';
    return;
  }

  const constraints = {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' }
    }
  };

  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    activeMediaStream = stream;
    videoEl.srcObject = stream;
    videoEl.play().catch(function () {});
    isScanningActive = true;

    if ('BarcodeDetector' in window) {
      statusEl.textContent = 'Apunta al codigo QR de la pantalla de caja';
      runBarcodeLoop(videoEl, statusEl, onDecoded);
    } else {
      statusEl.textContent = 'Tu navegador no soporta lectura automatica. Usa el enlace manual abajo.';
    }
  }).catch(function () {
    statusEl.textContent = 'No se pudo acceder a la camara. Revisa permisos o pega el enlace.';
  });
}

function runBarcodeLoop(videoEl, statusEl, onDecoded) {
  let detector = null;
  try {
    detector = new window.BarcodeDetector({ formats: ['qr_code'] });
  } catch (err) {
    statusEl.textContent = 'Escaneo automatico no disponible. Usa el campo inferior.';
    return;
  }

  function scanFrame() {
    if (!isScanningActive) {
      return;
    }
    if (videoEl.readyState >= 2) {
      detector.detect(videoEl).then(function (barcodes) {
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
      }).catch(function () {
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
