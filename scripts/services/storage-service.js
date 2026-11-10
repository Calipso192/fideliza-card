/**
 * Servicio de persistencia y estado local - FidelizaCard
 * Responsabilidades:
 * - Gestion de configuracion de marca compartida (fideliza_config)
 * - Gestion de perfil de cliente, visitas y sellos (fideliza_customer)
 * - Control de unicidad de tokens de delivery y candado antifraude
 * - Asignacion directa de sellos para reposicion (setCustomerStamps)
 * Reglas estrictas: Vanilla JS modular, cero barras verticales, maximo 300 lineas
 */

const KEY_CUSTOMER = 'fideliza_customer';
const KEY_CONFIG = 'fideliza_config';
const KEY_USED_TOKENS = 'fideliza_used_tokens';
const COOLDOWN_HOURS = 3;

export const DEFAULT_CONFIG = {
  businessName: 'FidelizaCard',
  businessLogo: '',
  targetStamps: 8,
  rewardDescription: '1 Premio Sorpresa Gratis'
};

export function getConfig() {
  try {
    const raw = localStorage.getItem(KEY_CONFIG);
    if (!raw) {
      return Object.assign({}, DEFAULT_CONFIG);
    }
    const parsed = JSON.parse(raw);
    return {
      businessName: parsed.businessName ? parsed.businessName : DEFAULT_CONFIG.businessName,
      businessLogo: parsed.businessLogo ? parsed.businessLogo : '',
      targetStamps: parsed.targetStamps ? Number(parsed.targetStamps) : DEFAULT_CONFIG.targetStamps,
      rewardDescription: parsed.rewardDescription ? parsed.rewardDescription : DEFAULT_CONFIG.rewardDescription
    };
  } catch (err) {
    return Object.assign({}, DEFAULT_CONFIG);
  }
}

export function saveConfig(config) {
  try {
    localStorage.setItem(KEY_CONFIG, JSON.stringify(config));
    return true;
  } catch (err) {
    return false;
  }
}

export function getCustomer() {
  try {
    const raw = localStorage.getItem(KEY_CUSTOMER);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function saveCustomer(customerData) {
  try {
    localStorage.setItem(KEY_CUSTOMER, JSON.stringify(customerData));
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
      // Fallback si la cuota local esta llena
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
    return { success: false, reason: 'NO_CUSTOMER' };
  }

  if (!bypassCooldown) {
    const remainingMinutes = getCooldownRemainingMinutes();
    if (remainingMinutes > 0) {
      return {
        success: false,
        reason: 'COOLDOWN',
        remainingMinutes: remainingMinutes
      };
    }
  }

  const config = getConfig();
  const targetStamps = config.targetStamps;
  let currentStamps = customer.stamps ? customer.stamps : 0;
  let currentCycle = customer.cycle ? customer.cycle : 1;
  let rewardUnlocked = false;

  currentStamps += 1;

  if (currentStamps >= targetStamps) {
    rewardUnlocked = true;
  }

  customer.stamps = currentStamps;
  customer.lastStampTime = Date.now();
  customer.lastVisitDate = new Date().toISOString().split('T')[0];

  saveCustomer(customer);

  return {
    success: true,
    stamps: currentStamps,
    cycle: currentCycle,
    targetStamps: targetStamps,
    rewardUnlocked: rewardUnlocked
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

export function claimRewardAndNewCycle() {
  const customer = getCustomer();
  if (!customer) {
    return false;
  }

  customer.stamps = 0;
  customer.cycle = (customer.cycle ? customer.cycle : 1) + 1;
  customer.lastStampTime = Date.now();
  customer.lastVisitDate = new Date().toISOString().split('T')[0];

  saveCustomer(customer);
  return true;
}
