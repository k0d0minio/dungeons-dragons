// Validation utilities for form inputs and data

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUsername = (username) => {
  if (!username || username.trim().length === 0) {
    return { isValid: false, message: 'Username is required' };
  }
  if (username.length < 3) {
    return { isValid: false, message: 'Username must be at least 3 characters' };
  }
  if (username.length > 20) {
    return { isValid: false, message: 'Username must be less than 20 characters' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
  }
  return { isValid: true, message: '' };
};

export const validatePassword = (password) => {
  if (!password || password.length === 0) {
    return { isValid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters' };
  }
  if (password.length > 100) {
    return { isValid: false, message: 'Password must be less than 100 characters' };
  }
  return { isValid: true, message: '' };
};

export const validateCharacterName = (name) => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: 'Character name is required' };
  }
  if (name.length < 1) {
    return { isValid: false, message: 'Character name must be at least 1 character' };
  }
  if (name.length > 50) {
    return { isValid: false, message: 'Character name must be less than 50 characters' };
  }
  return { isValid: true, message: '' };
};

export const validateAbilityScore = (score) => {
  const numScore = parseInt(score);
  if (isNaN(numScore)) {
    return { isValid: false, message: 'Ability score must be a number' };
  }
  if (numScore < 1) {
    return { isValid: false, message: 'Ability score must be at least 1' };
  }
  if (numScore > 30) {
    return { isValid: false, message: 'Ability score must be 30 or less' };
  }
  return { isValid: true, message: '' };
};

export const validateLevel = (level) => {
  const numLevel = parseInt(level);
  if (isNaN(numLevel)) {
    return { isValid: false, message: 'Level must be a number' };
  }
  if (numLevel < 1) {
    return { isValid: false, message: 'Level must be at least 1' };
  }
  if (numLevel > 20) {
    return { isValid: false, message: 'Level must be 20 or less' };
  }
  return { isValid: true, message: '' };
};

export const validateInitiative = (initiative) => {
  const numInitiative = parseInt(initiative);
  if (isNaN(numInitiative)) {
    return { isValid: false, message: 'Initiative must be a number' };
  }
  if (numInitiative < -10) {
    return { isValid: false, message: 'Initiative must be -10 or higher' };
  }
  if (numInitiative > 50) {
    return { isValid: false, message: 'Initiative must be 50 or less' };
  }
  return { isValid: true, message: '' };
};

export const validateHitPoints = (hp) => {
  const numHp = parseInt(hp);
  if (isNaN(numHp)) {
    return { isValid: false, message: 'Hit points must be a number' };
  }
  if (numHp < 0) {
    return { isValid: false, message: 'Hit points cannot be negative' };
  }
  if (numHp > 1000) {
    return { isValid: false, message: 'Hit points must be 1000 or less' };
  }
  return { isValid: true, message: '' };
};

export const validateArmorClass = (ac) => {
  const numAc = parseInt(ac);
  if (isNaN(numAc)) {
    return { isValid: false, message: 'Armor class must be a number' };
  }
  if (numAc < 0) {
    return { isValid: false, message: 'Armor class cannot be negative' };
  }
  if (numAc > 50) {
    return { isValid: false, message: 'Armor class must be 50 or less' };
  }
  return { isValid: true, message: '' };
};

export const validateSpeed = (speed) => {
  const numSpeed = parseInt(speed);
  if (isNaN(numSpeed)) {
    return { isValid: false, message: 'Speed must be a number' };
  }
  if (numSpeed < 0) {
    return { isValid: false, message: 'Speed cannot be negative' };
  }
  if (numSpeed > 200) {
    return { isValid: false, message: 'Speed must be 200 or less' };
  }
  return { isValid: true, message: '' };
};

export const validateItemName = (name) => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: 'Item name is required' };
  }
  if (name.length > 100) {
    return { isValid: false, message: 'Item name must be less than 100 characters' };
  }
  return { isValid: true, message: '' };
};

export const validateItemWeight = (weight) => {
  const numWeight = parseFloat(weight);
  if (isNaN(numWeight)) {
    return { isValid: false, message: 'Weight must be a number' };
  }
  if (numWeight < 0) {
    return { isValid: false, message: 'Weight cannot be negative' };
  }
  if (numWeight > 10000) {
    return { isValid: false, message: 'Weight must be 10,000 lbs or less' };
  }
  return { isValid: true, message: '' };
};

export const validateItemValue = (value) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return { isValid: false, message: 'Value must be a number' };
  }
  if (numValue < 0) {
    return { isValid: false, message: 'Value cannot be negative' };
  }
  if (numValue > 1000000) {
    return { isValid: false, message: 'Value must be 1,000,000 gp or less' };
  }
  return { isValid: true, message: '' };
};

export const validateNoteTitle = (title) => {
  if (!title || title.trim().length === 0) {
    return { isValid: false, message: 'Note title is required' };
  }
  if (title.length > 200) {
    return { isValid: false, message: 'Note title must be less than 200 characters' };
  }
  return { isValid: true, message: '' };
};

export const validateNoteContent = (content) => {
  if (!content || content.trim().length === 0) {
    return { isValid: false, message: 'Note content is required' };
  }
  if (content.length > 10000) {
    return { isValid: false, message: 'Note content must be less than 10,000 characters' };
  }
  return { isValid: true, message: '' };
};

export const validateCombatSessionName = (name) => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: 'Session name is required' };
  }
  if (name.length > 100) {
    return { isValid: false, message: 'Session name must be less than 100 characters' };
  }
  return { isValid: true, message: '' };
};

export const validateParticipantName = (name) => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: 'Participant name is required' };
  }
  if (name.length > 100) {
    return { isValid: false, message: 'Participant name must be less than 100 characters' };
  }
  return { isValid: true, message: '' };
};

// Generic validation helper
export const validateField = (value, validator, fieldName) => {
  const result = validator(value);
  return {
    ...result,
    field: fieldName
  };
};

// Form validation helper
export const validateForm = (formData, validators) => {
  const errors = {};
  let isValid = true;

  Object.keys(validators).forEach(field => {
    const validator = validators[field];
    const result = validator(formData[field]);
    
    if (!result.isValid) {
      errors[field] = result.message;
      isValid = false;
    }
  });

  return { isValid, errors };
};
