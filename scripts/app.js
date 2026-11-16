/**
 * Orquestador principal de la aplicacion Cliente - FidelizaCard (v2.2)
 * Responsabilidades:
 * - Aplicar la paleta cromatica del negocio al iniciar la vista
 * - Validar y activar el Modo Demo a pantalla completa solo si fue autorizado desde Caja
 * - Montar tarjeta Wallet Pass o formulario de registro sobre #main-content
 * - Procesar QR dinamico (?dyn=), reposicion firmada (?rst=), delivery (?claim=) y mostrador (?scan=)
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { qs, showToast, triggerHaptic } from './utils/dom.js';
import { playStampSound, playRewardFanfare } from './utils/sound-fx.js';
import { applyBusinessTheme } from './utils/theme-applier.js';
import {
  getConfig,
  getCustomer,
  addStamp,
  claimDynamicQr,
  claimSignedRestore,
  isTokenUsed,
  markTokenUsed,
  activateDemoFromUrlIfAuthorized,
  isDemoMode
} from './services/storage-service.js';
import { getNotificationTemplates, formatNotificationText } from './config.js';
import { renderCustomerForm } from './components/customer-form.js';
import { renderLoyaltyCard } from './components/loyalty-card.js';
import { renderDemoFloatingBar } from './components/demo-bar.js';

const KEY_LAST_BDAY_TOAST = 'fideliza_last_bday_toast';
const KEY_LAST_IDLE_TOAST = 'fideliza_last_idle_toast';

document.addEventListener('DOMContentLoaded', function () {
  initApp();
});

function initApp() {
  applyBusinessTheme();
  handleDemoEntry();
  processUrlParameters(window.location.search, true, false);
  routeView();
}

function handleDemoEntry() {
  const urlParams = new URLSearchParams(window.location.search);
  const requestedDemo = urlParams.get('demo') === '1';

  if (requestedDemo) {
    const activated = activateDemoFromUrlIfAuthorized();
    window.history.replaceState({}, document.title, window.location.pathname);
    if (activated) {
      showToast('Modo Demo comercial activo', 'info');
    } else {
      showToast('Inicia el Modo Demo desde el panel de caja', 'warning');
    }
    return;
  }

  if (isDemoMode()) {
    activateDemoFromUrlIfAuthorized();
  }
}

function updateDocumentTitle() {
  const config = getConfig();
  document.title = config.businessName + ' - Tarjeta Digital';
}

function routeView() {
  const mainContainer = qs('#main-content');
  if (!mainContainer) {
    return;
  }

  updateDocumentTitle();
  const customer = getCustomer();

  if (!customer) {
    renderDemoFloatingBar(null);
    renderCustomerForm(mainContainer, function (hasPendingAction) {
      if (hasPendingAction) {
        processUrlParameters(window.location.search, true, true);
      }
      routeView();
    });
    preFillPhoneFromUrl();
    return;
  }

  renderLoyaltyCard(
    mainContainer,
    customer,
    function () {
      routeView();
    },
    function (scannedPayload) {
      processUrlParameters(scannedPayload, false, false);
    }
  );

  renderDemoFloatingBar(function () {
    routeView();
  });

  if (!isDemoMode()) {
    checkBirthdayNotification(customer);
    checkInactivityReminder(customer);
  }
}

function preFillPhoneFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const tel = urlParams.get('tel');
  if (tel) {
    const phoneInput = qs('#customer-phone-input');
    if (phoneInput) {
      phoneInput.value = tel;
    }
  }
}

function notifyStampSuccess(res, customMessage) {
  triggerHaptic(60);
  showToast(customMessage, 'success');
  if (res.rewardUnlocked) {
    playRewardFanfare();
    showToast('¡Felicidades! Desbloqueaste tu premio', 'success');
  } else {
    playStampSound();
  }
}

function extractSearchParams(rawInput) {
  if (!rawInput) {
    return new URLSearchParams('');
  }
  const str = String(rawInput).trim();
  if (str.indexOf('http://') === 0) {
    try {
      return new URL(str).searchParams;
    } catch (e) {
      return new URLSearchParams('');
    }
  }
  if (str.indexOf('https://') === 0) {
    try {
      return new URL(str).searchParams;
    } catch (e) {
      return new URLSearchParams('');
    }
  }
  const qIndex = str.indexOf('?');
  if (qIndex !== -1) {
    return new URLSearchParams(str.substring(qIndex));
  }
  return new URLSearchParams(str);
}

function processUrlParameters(rawInput, isFromBrowserUrl, isFreshSignup) {
  const urlParams = extractSearchParams(rawInput);
  const dynToken = urlParams.get('dyn');
  const rstToken = urlParams.get('rst');
  const stampsParam = urlParams.get('s');
  const expParam = urlParams.get('exp');
  const claim = urlParams.get('claim');
  const hasScan = urlParams.has('scan') ? true : urlParams.has('sello');

  const customer = getCustomer();
  if (!customer) {
    return;
  }

  let stateUpdated = false;
  let recognizedParam = false;

  if (dynToken) {
    recognizedParam = true;
    const count = stampsParam ? parseInt(stampsParam, 10) : 1;
    const res = claimDynamicQr(dynToken, count, expParam);
    if (res.success) {
      notifyStampSuccess(res, res.message);
      stateUpdated = true;
    } else if (isFreshSignup) {
      addStamp(true);
      playStampSound();
      showToast('El QR caduco, pero recibiste tu 1er sello de bienvenida', 'info');
      stateUpdated = true;
    } else {
      showToast(res.message, 'warning');
    }
  } else if (rstToken) {
    recognizedParam = true;
    const count = stampsParam ? parseInt(stampsParam, 10) : 1;
    const res = claimSignedRestore(rstToken, count, expParam);
    if (res.success) {
      triggerHaptic(50);
      if (res.rewardUnlocked) {
        playRewardFanfare();
      } else {
        playStampSound();
      }
      showToast('Sellos restituidos a ' + res.stamps, 'success');
      stateUpdated = true;
    } else if (isFreshSignup) {
      addStamp(true);
      playStampSound();
      showToast('Enlace caducado. Recibiste tu 1er sello de bienvenida', 'info');
      stateUpdated = true;
    } else {
      showToast(res.message, 'warning');
    }
  } else if (claim) {
    recognizedParam = true;
    if (isTokenUsed(claim)) {
      showToast('Este sello de pedido ya fue reclamado', 'warning');
    } else {
      markTokenUsed(claim);
      const res = addStamp(true);
      if (res.success) {
        notifyStampSuccess(res, '¡Sello de pedido sumado con exito!');
        stateUpdated = true;
      }
    }
  } else if (hasScan) {
    recognizedParam = true;
    const res = addStamp(false);
    if (res.success) {
      notifyStampSuccess(res, '¡Sello de visita sumado con exito!');
      stateUpdated = true;
    } else if (res.reason === 'COOLDOWN') {
      showToast('Sello registrado hoy. Espera ' + res.remainingMinutes + ' min para el siguiente.', 'warning');
    }
  } else if (!isFromBrowserUrl) {
    showToast('El codigo escaneado no pertenece a esta tarjeta', 'error');
  }

  if (isFromBrowserUrl) {
    if (recognizedParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  if (stateUpdated) {
    if (!isFreshSignup) {
      routeView();
    }
  }
}

function getTodayIsoString() {
  return new Date().toISOString().split('T')[0];
}

function checkBirthdayNotification(customer) {
  const birth = customer.birthdate ? customer.birthdate : customer.birthday;
  if (!birth) {
    return;
  }
  const todayStr = getTodayIsoString();
  if (localStorage.getItem(KEY_LAST_BDAY_TOAST) === todayStr) {
    return;
  }

  const today = new Date();
  const todayMmDd = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const parts = birth.split('-');
  let birthMmDd = '';
  if (parts.length === 3) {
    birthMmDd = parts[1] + '-' + parts[2];
  } else if (parts.length === 2) {
    birthMmDd = parts[0] + '-' + parts[1];
  }

  if (birthMmDd === todayMmDd) {
    localStorage.setItem(KEY_LAST_BDAY_TOAST, todayStr);
    const config = getConfig();
    const templates = getNotificationTemplates();
    const msg = formatNotificationText(templates.birthdayGreeting, {
      name: customer.name ? customer.name : 'Cliente',
      business: config.businessName
    });
    showToast(msg, 'success');
  }
}

function checkInactivityReminder(customer) {
  if (!customer.lastVisitDate) {
    return;
  }
  const todayStr = getTodayIsoString();
  if (localStorage.getItem(KEY_LAST_IDLE_TOAST) === todayStr) {
    return;
  }

  const lastDate = new Date(customer.lastVisitDate);
  const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 5) {
    return;
  }

  localStorage.setItem(KEY_LAST_IDLE_TOAST, todayStr);
  const config = getConfig();
  const templates = getNotificationTemplates();
  const stamps = customer.stamps ? Number(customer.stamps) : 0;
  const target = config.targetStamps ? Number(config.targetStamps) : 8;
  const remaining = Math.max(0, target - stamps);

  if (diffDays >= 10) {
    showToast(formatNotificationText(templates.day10Reminder, {
      business: config.businessName,
      remaining: remaining,
      reward: config.rewardDescription
    }), 'info');
  } else {
    showToast(formatNotificationText(templates.day5Reminder, {
      stamps: stamps,
      business: config.businessName
    }), 'info');
  }
}
