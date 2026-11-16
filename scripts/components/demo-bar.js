/**
 * Barra Flotante de Grabacion Comercial Demo - FidelizaCard (v2.2)
 * Responsabilidades:
 * - Montar controles discretos en pantalla completa solo cuando la sesion Demo esta autorizada
 * - Permitir sumar (+1), restar (-1), llenar meta de premio y simular alerta de inactividad
 * - Restaurar vista normal y regresar al panel operativo de caja al salir
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { qs, createElement, showToast, triggerHaptic } from '../utils/dom.js';
import { playStampSound, playRewardFanfare } from '../utils/sound-fx.js';
import {
  isDemoMode,
  getCustomer,
  getConfig,
  addStamp,
  setCustomerStamps,
  exitDemoMode
} from '../services/storage-service.js';
import { getNotificationTemplates, formatNotificationText } from '../config.js';

export function renderDemoFloatingBar(onStateChange) {
  const existingBar = qs('#demo-floating-bar');
  const appRoot = qs('#app');

  if (!isDemoMode()) {
    if (existingBar) {
      existingBar.remove();
    }
    if (appRoot) {
      appRoot.classList.remove('demo-active-layout');
    }
    return;
  }

  if (appRoot) {
    appRoot.classList.add('demo-active-layout');
  }

  if (existingBar) {
    existingBar.remove();
  }

  const bar = createElement('aside', {
    id: 'demo-floating-bar',
    className: 'demo-floating-bar',
    'aria-label': 'Controles de demostracion comercial'
  });

  const tag = createElement('span', {
    className: 'demo-bar-tag',
    textContent: 'DEMO'
  });

  const actions = createElement('div', { className: 'demo-bar-actions' });

  const btnPlus = createElement('button', {
    type: 'button',
    className: 'demo-bar-btn',
    textContent: '+1',
    title: 'Sumar 1 sello de prueba',
    onclick: function () {
      const res = addStamp(true);
      if (!res.success) {
        return;
      }
      triggerHaptic(35);
      if (res.rewardUnlocked) {
        playRewardFanfare();
        showToast('Demo: ¡Premio desbloqueado!', 'success');
      } else {
        playStampSound();
        showToast('Demo: +1 sello (' + res.stamps + '/' + res.targetStamps + ')', 'success');
      }
      if (typeof onStateChange === 'function') {
        onStateChange();
      }
    }
  });

  const btnMinus = createElement('button', {
    type: 'button',
    className: 'demo-bar-btn',
    textContent: '-1',
    title: 'Quitar 1 sello de prueba',
    onclick: function () {
      const customer = getCustomer();
      if (!customer) {
        return;
      }
      const current = customer.stamps ? Number(customer.stamps) : 0;
      const next = Math.max(0, current - 1);
      setCustomerStamps(next);
      triggerHaptic(25);
      showToast('Demo: Sellos ajustados a ' + next, 'info');
      if (typeof onStateChange === 'function') {
        onStateChange();
      }
    }
  });

  const btnGoal = createElement('button', {
    type: 'button',
    className: 'demo-bar-btn',
    textContent: 'Meta',
    title: 'Completar tarjeta para probar canje',
    onclick: function () {
      const config = getConfig();
      const target = config.targetStamps ? Number(config.targetStamps) : 8;
      setCustomerStamps(target);
      triggerHaptic(50);
      playRewardFanfare();
      showToast('Demo: Meta alcanzada, listo para canjear', 'success');
      if (typeof onStateChange === 'function') {
        onStateChange();
      }
    }
  });

  const btnDay5 = createElement('button', {
    type: 'button',
    className: 'demo-bar-btn',
    textContent: 'Dia 5',
    title: 'Simular recordatorio automatico por inactividad',
    onclick: function () {
      const config = getConfig();
      const customer = getCustomer();
      const stamps = customer ? (customer.stamps ? Number(customer.stamps) : 0) : 0;
      const templates = getNotificationTemplates();
      const msg = formatNotificationText(templates.day5Reminder, {
        stamps: stamps,
        business: config.businessName
      });
      triggerHaptic(30);
      showToast(msg, 'info');
    }
  });

  const btnExit = createElement('button', {
    type: 'button',
    className: 'demo-bar-btn danger',
    textContent: 'Salir',
    title: 'Cerrar Modo Demo y volver a Caja',
    onclick: function () {
      exitDemoMode();
      triggerHaptic(40);
      window.location.href = './admin/index.html';
    }
  });

  actions.appendChild(btnPlus);
  actions.appendChild(btnMinus);
  actions.appendChild(btnGoal);
  actions.appendChild(btnDay5);
  actions.appendChild(btnExit);

  bar.appendChild(tag);
  bar.appendChild(actions);
  document.body.appendChild(bar);
}
