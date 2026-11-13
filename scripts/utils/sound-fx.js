/**
 * Sintetizador de efectos de sonido con Web Audio API - FidelizaCard
 * Responsabilidades:
 * - Generar tonos limpios sin archivos de audio externos (0 KB extra)
 * - Efecto de sello acunado (pop ascendente)
 * - Fanfarria breve de premio desbloqueado / canje exitoso
 * - Tono suave de tecla y alerta de error de PIN
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext ? window.AudioContext : window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function () {});
    }
  }
  return audioCtx;
}

function playTone(freq, type, startTime, duration, peakGain) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gainNode.gain.setValueAtTime(0.001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

export function playStampSound() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  playTone(523.25, 'sine', now, 0.12, 0.18);
  playTone(783.99, 'triangle', now + 0.07, 0.18, 0.22);
}

export function playRewardFanfare() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  playTone(523.25, 'triangle', now, 0.14, 0.2);
  playTone(659.25, 'triangle', now + 0.1, 0.14, 0.2);
  playTone(783.99, 'triangle', now + 0.2, 0.16, 0.22);
  playTone(1046.5, 'sine', now + 0.31, 0.35, 0.25);
}

export function playKeyTap() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  playTone(620, 'sine', now, 0.045, 0.08);
}

export function playErrorBeep() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  playTone(190, 'sawtooth', now, 0.14, 0.14);
  playTone(155, 'sawtooth', now + 0.12, 0.18, 0.14);
}
