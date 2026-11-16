/**
 * Lanzador Comercial Demo Pantalla Completa - FidelizaCard (v2.2)
 * Responsabilidades:
 * - Mostrar resumen operativo de la sesion de grabacion comercial en la pestana Demo
 * - Autorizar el token temporal de sesion mediante authorizeDemoLaunch()
 * - Redirigir a la tarjeta real a pantalla completa con barra flotante de control
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { createElement, showToast, triggerHaptic } from '../utils/dom.js';
import { createUiIcon } from '../utils/icons.js';
import { authorizeDemoLaunch } from '../services/storage-service.js';

export function renderAdminDemoSimulator(container) {
  if (!container) {
    return;
  }

  container.innerHTML = '';

  const launchCard = createElement('div', { className: 'demo-launch-card' });

  const badge = createElement('span', {
    className: 'demo-launch-badge',
    textContent: 'LISTO PARA GRABAR'
  });

  const title = createElement('h3', {
    className: 'demo-launch-title',
    textContent: 'Tarjeta Real en Pantalla Completa'
  });

  const list = createElement('ul', { className: 'demo-launch-list' });

  const bullets = [
    'Abre la vista exacta del cliente con el logo, sellos tematicos y colores de tu marca.',
    'Activa una barra discreta en el borde inferior para sumar sellos, probar el canje y simular alertas.',
    'Tus sellos reales quedan totalmente protegidos en una sesion temporal aislada.'
  ];

  for (let i = 0; i < bullets.length; i++) {
    list.appendChild(createElement('li', {
      className: 'demo-launch-item',
      textContent: bullets[i]
    }));
  }

  launchCard.appendChild(badge);
  launchCard.appendChild(title);
  launchCard.appendChild(list);
  container.appendChild(launchCard);

  const actions = createElement('div', { className: 'actions-stack' });
  const launchBtn = createElement('button', {
    type: 'button',
    className: 'btn-primary'
  });
  launchBtn.appendChild(createUiIcon('external', '', 18));
  launchBtn.appendChild(createElement('span', {
    textContent: 'Abrir Demo Pantalla Completa'
  }));

  launchBtn.addEventListener('click', function () {
    const ok = authorizeDemoLaunch();
    if (!ok) {
      showToast('No se pudo autorizar la sesion Demo', 'error');
      return;
    }
    triggerHaptic(50);
    window.location.href = '../index.html?demo=1';
  });

  actions.appendChild(launchBtn);
  container.appendChild(actions);
}
