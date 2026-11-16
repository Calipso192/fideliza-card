/**
 * Servicio de persistencia y estado local - FidelizaCard (v2.2)
 * Responsabilidades:
 * - Conexion con configuracion estatica de fabrica (scripts/config.js)
 * - Persistencia del cliente en localStorage y aislamiento en sessionStorage para Demo
 * - Suma simple o multiple de sellos y validacion de QR dinamico y reposicion firmada
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { getBusinessConfig } from '../config.js';

const KEY_CUSTOMER = 'fideliza_customer';
const KEY_USED_TOKENS = 'fideliza_used_tokens';
const KEY_DEMO_AUTH_UNTIL = 'fideliza_demo_auth_until';
const KEY_DEMO_ACTIVE = 'fideliza_demo_session_active';
const KEY_DEMO_CUSTOMER = 'fideliza_demo_customer';
const COOLDOWN_HOURS = 3;

export function getConfig() {
  const b = getBusinessConfig();
  const socialsVal = b.socials ? b.socials : {};
  return {
    name: b.name ? b.name : 'FidelizaCard',
    businessName: b.name ? b.name : 'FidelizaCard',
    logo: b.logo ? b.logo : '',
    businessLogo: b.logo ? b.logo : '',
    stampIcon: b.stampIcon ? b.stampIcon : 'burger',
    targetStamps: b.targetStamps ? Number(b.targetStamps) : 8,
    rewardDescription: b.rewardDescription ? b.rewardDescription : 'Premio sorpresa',
    cashierPin: b.cashierPin ? String(b.cashierPin) : '1234',
    whatsappDelivery: b.whatsappDelivery ? b.whatsappDelivery : '',
    whatsappMessage: b.whatsappMessage ? b.whatsappMessage : '',
    googleMapsReviewUrl: b.googleMapsReviewUrl ? b.googleMapsReviewUrl : '',
    socials: {
      instagramUrl: socialsVal.instagramUrl ? socialsVal.instagramUrl : '',
      tiktokUrl: socialsVal.tiktokUrl ? socialsVal.tiktokUrl : '',
      facebookUrl: socialsVal.facebookUrl ? socialsVal.facebookUrl : ''
    }
  };
}

export function authorizeDemoLaunch() {
  try {
    const expires = Date.now() + 25000;
    localStorage.setItem(KEY_DEMO_AUTH_UNTIL, String(expires));
    return true;
  } catch (err) {
    return false;
  }
}

export function isDemoMode() {
  try {
    return sessionStorage.getItem(KEY_DEMO_ACTIVE) === '1';
  } catch (err) {
    return false;
  }
}

export function activateDemoFromUrlIfAuthorized() {
  if (isDemoMode()) {
    ensureDemoCustomerSeed();
    return true;
  }
  try {
    const rawUntil = localStorage.getItem(KEY_DEMO_AUTH_UNTIL);
    localStorage.removeItem(KEY_DEMO_AUTH_UNTIL);
    if (!rawUntil) {
      return false;
    }
    if (Date.now() > Number(rawUntil)) {
      return false;
    }
    sessionStorage.setItem(KEY_DEMO_ACTIVE, '1');
    ensureDemoCustomerSeed();
    return true;
  } catch (err) {
    return false;
  }
}

function ensureDemoCustomerSeed() {
  const existing = getCustomer();
  if (existing) {
    return;
  }
  const config = getConfig();
  const initialStamps = Math.min(3, config.targetStamps);
  saveCustomer({
    name: 'Carlos Mendoza',
    whatsapp: '987654321',
    stamps: initialStamps,
    cycle: 1
  });
}

export function exitDemoMode() {
  try {
    sessionStorage.removeItem(KEY_DEMO_ACTIVE);
    sessionStorage.removeItem(KEY_DEMO_CUSTOMER);
  } catch (err) {
    // Limpieza silenciosa
  }
}

function normalizeCustomerFields(obj) {
  if (!obj.phone) {
    if (obj.whatsapp) {
      obj.phone = obj.whatsapp;
    }
  }
  if (!obj.whatsapp) {
    if (obj.phone) {
      obj.whatsapp = obj.phone;
    }
  }
  if (!obj.birthday) {
    if (obj.birthdate) {
      obj.birthday = obj.birthdate;
    }
  }
  if (!obj.birthdate) {
    if (obj.birthday) {
      obj.birthdate = obj.birthday;
    }
  }
  return obj;
}

export function getCustomer() {
  try {
    const raw = isDemoMode()
      ? sessionStorage.getItem(KEY_DEMO_CUSTOMER)
      : localStorage.getItem(KEY_CUSTOMER);
    if (!raw) {
      return null;
    }
    return normalizeCustomerFields(JSON.parse(raw));
  } catch (err) {
    return null;
  }
}

export function saveCustomer(customerData) {
  try {
    const data = normalizeCustomerFields(Object.assign({}, customerData));
    if (data.stamps === undefined) {
      data.stamps = 0;
    }
    if (data.cycle === undefined) {
      data.cycle = 1;
    }
    const serialized = JSON.stringify(data);
    if (isDemoMode()) {
      sessionStorage.setItem(KEY_DEMO_CUSTOMER, serialized);
    } else {
      localStorage.setItem(KEY_CUSTOMER, serialized);
    }
    return true;
  } catch (err) {
    return false;
  }
}

export function resetCustomer() {
  try {
    if (isDemoMode()) {
      sessionStorage.removeItem(KEY_DEMO_CUSTOMER);
    } else {
      localStorage.removeItem(KEY_CUSTOMER);
      localStorage.removeItem(KEY_USED_TOKENS);
    }
    return true;
  } catch (err) {
    return false;
  }
}

export function getUsedTokens() {
  try {
    const raw = localStorage.getItem(KEY_USED_TOKENS);
    if (!raw) {
      return [];
    }
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    return [];
  }
}

export function isTokenUsed(token) {
  if (!token) {
    return false;
  }
  return getUsedTokens().indexOf(token) !== -1;
}

export function markTokenUsed(token) {
  if (!token) {
    return;
  }
  const list = getUsedTokens();
  if (list.indexOf(token) === -1) {
    list.push(token);
    try {
      localStorage.setItem(KEY_USED_TOKENS, JSON.stringify(list));
    } catch (err) {
      // Manejo silencioso de cuota
    }
  }
}

export function getCooldownRemainingMinutes() {
  const customer = getCustomer();
  if (!customer) {
    return 0;
  }
  if (!customer.lastStampTime) {
    return 0;
  }
  const elapsedMs = Date.now() - customer.lastStampTime;
  const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
  if (elapsedMs >= cooldownMs) {
    return 0;
  }
  return Math.ceil((cooldownMs - elapsedMs) / (60 * 1000));
}

export function addStamps(count, bypassCooldown) {
  const customer = getCustomer();
  if (!customer) {
    return { success: false, reason: 'NO_CUSTOMER', message: 'No hay cliente registrado' };
  }
  if (!bypassCooldown) {
    const remainingMinutes = getCooldownRemainingMinutes();
    if (remainingMinutes > 0) {
      return {
        success: false,
        reason: 'COOLDOWN',
        remainingMinutes: remainingMinutes,
        message: 'Espera ' + remainingMinutes + ' min para el siguiente sello'
      };
    }
  }

  const config = getConfig();
  const targetStamps = config.targetStamps;
  const increment = Math.max(1, Math.min(10, Number(count) ? Number(count) : 1));
  const currentStamps = (customer.stamps ? Number(customer.stamps) : 0) + increment;
  const currentCycle = customer.cycle ? Number(customer.cycle) : 1;

  customer.stamps = currentStamps;
  customer.justRedeemed = false;
  customer.lastStampTime = Date.now();
  customer.lastVisitDate = new Date().toISOString().split('T')[0];
  saveCustomer(customer);

  return {
    success: true,
    added: increment,
    stamps: currentStamps,
    cycle: currentCycle,
    targetStamps: targetStamps,
    rewardUnlocked: currentStamps >= targetStamps,
    message: increment > 1 ? '¡' + increment + ' sellos sumados!' : '¡Sello sumado con exito!'
  };
}

export function addStamp(bypassCooldown) {
  return addStamps(1, bypassCooldown);
}

export function claimDynamicQr(token, count, expiresAt) {
  if (!token) {
    return { success: false, reason: 'INVALID', message: 'Codigo QR dinamico invalido' };
  }
  if (isTokenUsed(token)) {
    return { success: false, reason: 'USED', message: 'Este QR dinamico ya fue utilizado' };
  }
  if (expiresAt) {
    if (Date.now() > Number(expiresAt)) {
      return { success: false, reason: 'EXPIRED', message: 'El QR dinamico ha caducado (10 min)' };
    }
  }
  markTokenUsed(token);
  return addStamps(count, true);
}

export function claimSignedRestore(token, count, expiresAt) {
  if (!token) {
    return { success: false, reason: 'INVALID', message: 'Enlace de reposicion sin firma valida' };
  }
  if (isTokenUsed(token)) {
    return { success: false, reason: 'USED', message: 'Este enlace de reposicion ya fue utilizado' };
  }
  if (!expiresAt) {
    return { success: false, reason: 'INVALID', message: 'Enlace de reposicion sin caducidad' };
  }
  if (Date.now() > Number(expiresAt)) {
    return { success: false, reason: 'EXPIRED', message: 'El enlace de reposicion caduco (10 min)' };
  }
  markTokenUsed(token);
  return setCustomerStamps(count);
}

export function setCustomerStamps(count) {
  const customer = getCustomer();
  if (!customer) {
    return { success: false, reason: 'NO_CUSTOMER' };
  }
  const config = getConfig();
  const targetStamps = config.targetStamps;
  const parsedCount = Math.max(0, Math.min(Number(count), targetStamps));

  customer.stamps = parsedCount;
  customer.justRedeemed = false;
  customer.lastStampTime = Date.now();
  customer.lastVisitDate = new Date().toISOString().split('T')[0];
  saveCustomer(customer);

  return {
    success: true,
    stamps: parsedCount,
    cycle: customer.cycle ? customer.cycle : 1,
    targetStamps: targetStamps,
    rewardUnlocked: parsedCount >= targetStamps
  };
}

export function getOrCreateRewardVoucherCode() {
  const customer = getCustomer();
  if (!customer) {
    return 'CUPON-0000';
  }
  const cycleNum = customer.cycle ? Number(customer.cycle) : 1;
  if (customer.activeVoucherCode) {
    if (customer.activeVoucherCycle === cycleNum) {
      return customer.activeVoucherCode;
    }
  }
  const code = 'C' + cycleNum + '-' + Math.floor(1000 + Math.random() * 9000);
  customer.activeVoucherCode = code;
  customer.activeVoucherCycle = cycleNum;
  saveCustomer(customer);
  return code;
}

export function claimRewardAndNewCycle() {
  const customer = getCustomer();
  if (!customer) {
    return false;
  }
  customer.stamps = 0;
  customer.cycle = (customer.cycle ? Number(customer.cycle) : 1) + 1;
  customer.justRedeemed = true;
  customer.activeVoucherCode = '';
  customer.activeVoucherCycle = 0;
  customer.lastStampTime = Date.now();
  customer.lastVisitDate = new Date().toISOString().split('T')[0];
  saveCustomer(customer);
  return true;
}
