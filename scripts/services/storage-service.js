/**
 * Servicio de persistencia y logica de negocio para FidelizaCard
 * Reglas estrictas: Vanilla JS modular, cero barras verticales y maximo 300 lineas
 */

const STORAGE_KEY_CUSTOMER = 'fideliza_customer';
const STORAGE_KEY_LOYALTY = 'fideliza_loyalty';
const STORAGE_KEY_TOKENS = 'fideliza_used_tokens';

// Cooldown de 3 horas entre sellos para prevenir abusos
const STAMP_COOLDOWN_MS = 3 * 60 * 60 * 1000;
const DEFAULT_TARGET_STAMPS = 8;

export function getCustomer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOMER);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error al leer cliente:', error);
    return null;
  }
}

export function saveCustomer(customerData) {
  try {
    const payload = {
      name: customerData.name ? customerData.name.trim() : '',
      whatsapp: customerData.whatsapp ? customerData.whatsapp.trim() : '',
      birthdate: customerData.birthdate ? customerData.birthdate : '',
      registeredAt: customerData.registeredAt ? customerData.registeredAt : Date.now()
    };
    localStorage.setItem(STORAGE_KEY_CUSTOMER, JSON.stringify(payload));
    return payload;
  } catch (error) {
    console.error('Error al guardar cliente:', error);
    return null;
  }
}

export function getLoyaltyData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOYALTY);
    if (!raw) {
      return getDefaultLoyaltyData();
    }
    const data = JSON.parse(raw);
    return {
      targetStamps: data.targetStamps ? data.targetStamps : DEFAULT_TARGET_STAMPS,
      currentStamps: typeof data.currentStamps === 'number' ? data.currentStamps : 0,
      completedCycles: typeof data.completedCycles === 'number' ? data.completedCycles : 0,
      lastStampAt: typeof data.lastStampAt === 'number' ? data.lastStampAt : 0,
      rewardAvailable: Boolean(data.rewardAvailable)
    };
  } catch (error) {
    console.error('Error al leer datos de lealtad:', error);
    return getDefaultLoyaltyData();
  }
}

export function saveLoyaltyData(loyaltyData) {
  try {
    localStorage.setItem(STORAGE_KEY_LOYALTY, JSON.stringify(loyaltyData));
    return loyaltyData;
  } catch (error) {
    console.error('Error al guardar datos de lealtad:', error);
    return null;
  }
}

function getDefaultLoyaltyData() {
  return {
    targetStamps: DEFAULT_TARGET_STAMPS,
    currentStamps: 0,
    completedCycles: 0,
    lastStampAt: 0,
    rewardAvailable: false
  };
}

export function getUsedTokens() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOKENS);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

export function markTokenAsUsed(token) {
  if (!token) {
    return;
  }
  const tokens = getUsedTokens();
  if (!tokens.includes(token)) {
    tokens.push(token);
    try {
      localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
    } catch (e) {
      console.error('Error al registrar token consumido:', e);
    }
  }
}

export function isTokenUsed(token) {
  if (!token) {
    return false;
  }
  const tokens = getUsedTokens();
  return tokens.includes(token);
}

export function canAddStamp(ignoreCooldown) {
  const loyalty = getLoyaltyData();

  if (loyalty.currentStamps >= loyalty.targetStamps) {
    return {
      allowed: false,
      reason: 'reward_pending',
      message: 'Tienes un premio listo para canjear'
    };
  }

  if (!ignoreCooldown) {
    const now = Date.now();
    const diff = now - loyalty.lastStampAt;
    if (loyalty.lastStampAt > 0 && diff < STAMP_COOLDOWN_MS) {
      const remainingMinutes = Math.ceil((STAMP_COOLDOWN_MS - diff) / (60 * 1000));
      return {
        allowed: false,
        reason: 'cooldown_active',
        message: 'Sello registrado hoy. Espera ' + remainingMinutes + ' min para el siguiente.'
      };
    }
  }

  return {
    allowed: true,
    reason: 'ok',
    message: 'Listo para sellar'
  };
}

export function addStamp(ignoreCooldown) {
  const check = canAddStamp(ignoreCooldown);
  if (!check.allowed) {
    return {
      success: false,
      reason: check.reason,
      message: check.message,
      data: getLoyaltyData()
    };
  }

  const loyalty = getLoyaltyData();
  const nextCount = loyalty.currentStamps + 1;
  const isRewardUnlocked = nextCount >= loyalty.targetStamps;

  const updated = {
    targetStamps: loyalty.targetStamps,
    currentStamps: nextCount,
    completedCycles: loyalty.completedCycles,
    lastStampAt: Date.now(),
    rewardAvailable: isRewardUnlocked
  };

  saveLoyaltyData(updated);

  return {
    success: true,
    reason: 'stamp_added',
    message: isRewardUnlocked ? '¡Completaste tu tarjeta! Tienes un premio listo' : '¡Sello añadido con exito!',
    data: updated
  };
}

export function redeemReward() {
  const loyalty = getLoyaltyData();

  if (!loyalty.rewardAvailable && loyalty.currentStamps < loyalty.targetStamps) {
    return {
      success: false,
      message: 'Aun no tienes suficientes sellos para canjear'
    };
  }

  const updated = {
    targetStamps: loyalty.targetStamps,
    currentStamps: 0,
    completedCycles: loyalty.completedCycles + 1,
    lastStampAt: loyalty.lastStampAt,
    rewardAvailable: false
  };

  saveLoyaltyData(updated);

  return {
    success: true,
    message: '¡Premio canjeado con exito! Nueva tarjeta lista',
    data: updated
  };
}

export function isBirthdayToday(birthdateStr) {
  if (!birthdateStr) {
    return false;
  }
  const parts = birthdateStr.split('-');
  if (parts.length < 3) {
    return false;
  }
  const birthMonth = parseInt(parts[1], 10);
  const birthDay = parseInt(parts[2], 10);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  return birthMonth === currentMonth && birthDay === currentDay;
}

export function resetAllData() {
  localStorage.removeItem(STORAGE_KEY_CUSTOMER);
  localStorage.removeItem(STORAGE_KEY_LOYALTY);
  localStorage.removeItem(STORAGE_KEY_TOKENS);
}
