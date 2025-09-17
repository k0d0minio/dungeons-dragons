// D&D 5e Character Data
export const RACES = [
  { value: 'human', label: 'Human', abilityBonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 }, speed: 30, traits: ['Extra Language', 'Extra Skill'] },
  { value: 'elf', label: 'Elf', abilityBonuses: { dexterity: 2 }, speed: 30, traits: ['Darkvision', 'Fey Ancestry', 'Trance', 'Keen Senses'] },
  { value: 'dwarf', label: 'Dwarf', abilityBonuses: { constitution: 2 }, speed: 25, traits: ['Darkvision', 'Dwarven Resilience', 'Stonecunning'] },
  { value: 'halfling', label: 'Halfling', abilityBonuses: { dexterity: 2 }, speed: 25, traits: ['Lucky', 'Brave', 'Halfling Nimbleness'] },
  { value: 'dragonborn', label: 'Dragonborn', abilityBonuses: { strength: 2, charisma: 1 }, speed: 30, traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'] },
  { value: 'gnome', label: 'Gnome', abilityBonuses: { intelligence: 2 }, speed: 25, traits: ['Darkvision', 'Gnome Cunning'] },
  { value: 'half-elf', label: 'Half-Elf', abilityBonuses: { charisma: 2 }, speed: 30, traits: ['Darkvision', 'Fey Ancestry', 'Two Skills'] },
  { value: 'half-orc', label: 'Half-Orc', abilityBonuses: { strength: 2, constitution: 1 }, speed: 30, traits: ['Darkvision', 'Relentless Endurance', 'Savage Attacks'] },
  { value: 'tiefling', label: 'Tiefling', abilityBonuses: { intelligence: 1, charisma: 2 }, speed: 30, traits: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'] }
];

export const CLASSES = [
  { value: 'barbarian', label: 'Barbarian', hitDie: 12, primaryAbility: 'strength', savingThrows: ['strength', 'constitution'], skills: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
  { value: 'bard', label: 'Bard', hitDie: 8, primaryAbility: 'charisma', savingThrows: ['dexterity', 'charisma'], skills: ['acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleightOfHand', 'stealth', 'survival'] },
  { value: 'cleric', label: 'Cleric', hitDie: 8, primaryAbility: 'wisdom', savingThrows: ['wisdom', 'charisma'], skills: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
  { value: 'druid', label: 'Druid', hitDie: 8, primaryAbility: 'wisdom', savingThrows: ['intelligence', 'wisdom'], skills: ['animalHandling', 'arcana', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'] },
  { value: 'fighter', label: 'Fighter', hitDie: 10, primaryAbility: 'strength', savingThrows: ['strength', 'constitution'], skills: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'] },
  { value: 'monk', label: 'Monk', hitDie: 8, primaryAbility: 'dexterity', savingThrows: ['strength', 'dexterity'], skills: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] },
  { value: 'paladin', label: 'Paladin', hitDie: 10, primaryAbility: 'charisma', savingThrows: ['wisdom', 'charisma'], skills: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] },
  { value: 'ranger', label: 'Ranger', hitDie: 10, primaryAbility: 'dexterity', savingThrows: ['strength', 'dexterity'], skills: ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'] },
  { value: 'rogue', label: 'Rogue', hitDie: 8, primaryAbility: 'dexterity', savingThrows: ['dexterity', 'intelligence'], skills: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleightOfHand', 'stealth'] },
  { value: 'sorcerer', label: 'Sorcerer', hitDie: 6, primaryAbility: 'charisma', savingThrows: ['constitution', 'charisma'], skills: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] },
  { value: 'warlock', label: 'Warlock', hitDie: 8, primaryAbility: 'charisma', savingThrows: ['wisdom', 'charisma'], skills: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'] },
  { value: 'wizard', label: 'Wizard', hitDie: 6, primaryAbility: 'intelligence', savingThrows: ['intelligence', 'wisdom'], skills: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'] }
];

export const ALIGNMENTS = [
  { value: 'lawful-good', label: 'Lawful Good' },
  { value: 'neutral-good', label: 'Neutral Good' },
  { value: 'chaotic-good', label: 'Chaotic Good' },
  { value: 'lawful-neutral', label: 'Lawful Neutral' },
  { value: 'true-neutral', label: 'True Neutral' },
  { value: 'chaotic-neutral', label: 'Chaotic Neutral' },
  { value: 'lawful-evil', label: 'Lawful Evil' },
  { value: 'neutral-evil', label: 'Neutral Evil' },
  { value: 'chaotic-evil', label: 'Chaotic Evil' }
];

export const BACKGROUNDS = [
  { value: 'acolyte', label: 'Acolyte' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'folk-hero', label: 'Folk Hero' },
  { value: 'noble', label: 'Noble' },
  { value: 'sage', label: 'Sage' },
  { value: 'soldier', label: 'Soldier' },
  { value: 'charlatan', label: 'Charlatan' },
  { value: 'entertainer', label: 'Entertainer' },
  { value: 'guild-artisan', label: 'Guild Artisan' },
  { value: 'hermit', label: 'Hermit' },
  { value: 'outlander', label: 'Outlander' },
  { value: 'sailor', label: 'Sailor' }
];

// Calculate ability score modifiers
export const getAbilityModifier = (score) => {
  return Math.floor((score - 10) / 2);
};

// Get ability score for skill
export const getAbilityScoreForSkill = (skillName) => {
  const skillAbilityMap = {
    acrobatics: 'dexterity',
    animalHandling: 'wisdom',
    arcana: 'intelligence',
    athletics: 'strength',
    deception: 'charisma',
    history: 'intelligence',
    insight: 'wisdom',
    intimidation: 'charisma',
    investigation: 'intelligence',
    medicine: 'wisdom',
    nature: 'intelligence',
    perception: 'wisdom',
    performance: 'charisma',
    persuasion: 'charisma',
    religion: 'intelligence',
    sleightOfHand: 'dexterity',
    stealth: 'dexterity',
    survival: 'wisdom'
  };
  return skillAbilityMap[skillName] || 'strength';
};

// Calculate proficiency bonus based on level
export const getProficiencyBonus = (level) => {
  return Math.ceil(level / 4) + 1;
};

// Calculate hit points based on class and constitution
export const calculateHitPoints = (level, hitDie, constitution) => {
  const conMod = getAbilityModifier(constitution);
  return hitDie + conMod + (hitDie + conMod) * (level - 1);
};
