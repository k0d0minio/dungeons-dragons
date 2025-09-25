'use client';

import { create } from 'zustand';

// Persist to localStorage for offline drafts
const PERSIST_KEY = 'character-create-draft-v1';

function loadDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(draft) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

const defaultAbilityScores = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

const initialDraft = {
  mode: 'beginner',
  class: null,
  race: null,
  background: null,
  abilityMethod: 'standardArray',
  abilityScores: { ...defaultAbilityScores },
  name: '',
  alignment: null,
  notes: { personality: '', ideals: '', bonds: '', flaws: '' },
  hitPoints: { current: 8, maximum: 8 },
  armorClass: 10,
  speed: 30,
  level: 1,
  experience: 0,
};

export const useCharacterCreateStore = create((set, get) => ({
  stepIndex: 0,
  maxStep: 6,
  draft: loadDraft() || initialDraft,

  nextStep: () => set((state) => ({ stepIndex: Math.min(state.stepIndex + 1, state.maxStep) })),
  prevStep: () => set((state) => ({ stepIndex: Math.max(state.stepIndex - 1, 0) })),
  goToStep: (index) => set(() => ({ stepIndex: index })),

  updateDraft: (partial) => {
    const newDraft = { ...get().draft, ...partial };
    saveDraft(newDraft);
    set({ draft: newDraft });
  },

  resetDraft: () => {
    saveDraft(initialDraft);
    set({ draft: initialDraft, stepIndex: 0 });
  },
}));

export function getPointBuyRemaining(scores) {
  // 27-point buy costs per 5e rules
  const costFor = (score) => {
    const table = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
    return table[score] ?? Infinity;
  };
  const base = 27;
  const used = Object.values(scores).reduce((sum, s) => sum + costFor(s), 0);
  return base - used;
}

export function getStandardArrayOptions() {
  return [15, 14, 13, 12, 10, 8];
}

