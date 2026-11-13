/**
 * Servicio de persistencia y estado local - FidelizaCard (v1.5)
 * Responsabilidades:
 * - Conexion con configuracion estatica de fabrica (scripts/config.js)
 * - Persistencia del cliente, visitas, sellos y estado post-canje en localStorage
 * - Normalizacion automatica de campos (phone/whatsapp y birthday/birthdate)
 * - Candado antifraude de 3 horas para mostrador y bypass para delivery
 * - Generacion de codigo unico de cupon delivery y control de tokens usados
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

import { getBusinessConfig } from '../config.js';

const KEY_CUSTOMER = 'fideliza_customer';
const KEY_USED_TOKENS = 'fideliza_used_tokens';
const COOLDOWN_HOURS = 3;

export function getConfig() {
  const b = getBusinessConfig();
  const nameVal = b.name ? b.name : 'FidelizaCard';
  const logoVal = b.logo ? b.logo : '';
  const targetVal = b.targetStamps ? Number(b.targetStamps) : 8;
  const rewardVal = b.rewardDescription ? b.rewardDescription : 'Premio sorpresa';
  const pinVal = b.cashierPin ? String(b.cashierPin) : '1234';
  const phoneVal = b.whatsappDelivery ? b.whatsappDelivery : '';
  const msgVal = b.whatsappMessage ? b.whatsappMessage : '';
  const mapsVal = b.googleMapsReviewUrl ? b.googleMapsReviewUrl : '';
  const socialsVal = b.socials ? b.socials : {};

  return {
    name: nameVal,
    businessName: nameVal,
    logo: logoVal,
    businessLogo: logoVal,
    targetStamps: targetVal,
    rewardDescription: rewardVal,
    cashierPin: pinVal,
    whatsappDelivery: phoneVal,
    whatsappMessage: msgVal,
    googleMapsReviewUrl: mapsVal,
    socials: {
      instagramUrl: socialsVal.instagramUrl ? socialsVal.instagramUrl : '',
      tiktokUrl: socialsVal.tiktokUrl ? socialsVal.tiktokUrl : '',
      facebookUrl: socialsVal.facebookUrl ? socialsVal.facebookUrl : ''
    }
  };
}

export function saveConfig() {
  return true;
}

export function getCustomer() {
  try {
    const raw = localStorage.getItem(KEY_CUSTOMER);
    if (!raw) {
      return null;
    }
    const customer = JSON.parse(raw);

    if (!customer.phone) {
      if (customer.whatsapp) {
        customer.phone = customer.whatsapp;
      }
    }
    if (!customer.whatsapp) {
      if (customer.phone) {
        customer.whatsapp = customer.phone;
      }
    }
    if (!customer.birthday) {
      if (customer.birthdate) {
        customer.birthday = customer.birthdate;
      }
    }
    if (!customer.birthdate) {
      if (customer.birthday) {
        customer.birthdate = customer.birthday;
      }
    }

    return customer;
  } catch (err) {
    return null;
  }
}

export function saveCustomer(customerData) {
  try {
    const data = Object.assign({}, customerData);

    if (!data.phone) {
      if (data.whatsapp) {
        data.phone = data.whatsapp;
      }
    }
    if (!data.whatsapp) {
      if (data.phone) {
        data.whatsapp = data.phone;
      }
    }
    if (!data.birthday) {
      if (data.birthdate) {
        data.birthday = data.birthdate;
      }
    }
    if (!data.birthdate) {
      if (data.birthday) {
        data.birthdate = data.birthday;
      }
    }

    if (data.stamps === undefined) {
      data.stamps = 0;
    }
    if (data.cycle === undefined) {
      data.cycle = 1;
    }

    localStorage.setItem(KEY_CUSTOMER, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

export function resetCustomer() {
  try {
    localStorage.removeItem(KEY_CUSTOMER);
    localStorage.removeItem(KEY_USED_TOKENS);
    return true;
  } catch (err) {
    return false;
  }
}

export const resetAllData = resetCustomer;

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
  const list = getUsedTokens();
  return list.indexOf(token) !== -1;
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
      // Manejo de cuota local
    }
  }
}

export const markTokenAsUsed = markTokenUsed;

export function getCooldownRemainingMinutes() {
  const customer = getCustomer();
  if (!customer) {
    return 0;
  }
  if (!customer.lastStampTime) {
    return 0;
  }

  const now = Date.now();
  const elapsedMs = now - customer.lastStampTime;
  const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;

  if (elapsedMs >= cooldownMs) {
    return 0;
  }

  const diffMs = cooldownMs - elapsedMs;
  return Math.ceil(diffMs / (60 * 1000));
}

export function addStamp(bypassCooldown) {
  const customer = getCustomer();
  if (!customer) {
    return {
      success: false,
      reason: 'NO_CUSTOMER',
      message: 'No hay cliente registrado'
    };
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
  let currentStamps = customer.stamps ? Number(customer.stamps) : 0;
  let currentCycle = customer.cycle ? Number(customer.cycle) : 1;
  let rewardUnlocked = false;

  currentStamps += 1;

  if (currentStamps >= targetStamps) {
    rewardUnlocked = true;
  }

  customer.stamps = currentStamps;
  customer.justRedeemed = false;
  customer.lastStampTime = Date.now();
  customer.lastVisitDate = new Date().toISOString().split('T')[0];

  saveCustomer(customer);

  return {
    success: true,
    stamps: currentStamps,
    cycle: currentCycle,
    targetStamps: targetStamps,
    rewardUnlocked: rewardUnlocked,
    message: '¡Sello sumado con exito!'
  };
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

  const rewardUnlocked = parsedCount >= targetStamps;

  saveCustomer(customer);

  return {
    success: true,
    stamps: parsedCount,
    cycle: customer.cycle ? customer.cycle : 1,
    targetStamps: targetStamps,
    rewardUnlocked: rewardUnlocked
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
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const code = 'C' + cycleNum + '-' + randomDigits;
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
