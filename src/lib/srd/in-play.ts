// "What this means in play" — one plain-language line per option the guided
// creation wizard can show (`guided-creation/inline-consequences`).
//
// **Authored, not generated.** Every other module in this folder is written by
// `scripts/srd/build-srd-data.mjs` and must never be hand-edited; this one is
// the exact opposite and is never touched by the generator. It sits here rather
// than in `src/lib/characters/` because it is keyed by SRD index and read
// alongside the entry it describes — `in-play.test.ts` holds every key in it to
// an index the data layer actually publishes, and every published index to
// having a line.
//
// **None of this is SRD text.** Game mechanics are not copyrightable and SRD
// phrasing is not what a first-time player needs anyway, so every line below is
// written fresh, in the app's own voice: second person, no jargon, and about
// what happens at the table rather than about the rule. The SRD's own words for
// the same thing are one tap away in the library, with their CC-BY attribution
// (`attribution.ts`) — these lines carry no attribution because they are ours.
//
// The house style, such as it is: one sentence, or two short ones. Say what the
// player *does*, not what the option *is*. Name a number only when the number is
// the point ("+5 armour class", "120 feet"). Never open with the option's own
// name — the card is already printing it directly above.

/** The twelve classes. Moved here from `wizard.ts`'s `CLASS_GUIDES.summary`. */
export const CLASS_IN_PLAY: Readonly<Record<string, string>> = {
  barbarian: 'Charge in raging, shrug off damage, and swing the biggest axe on the table.',
  bard: 'Talk your way past most of it, help everyone else, and cast a bit of everything.',
  cleric: 'Heal the party, bless their swings, and hold your own in the front line.',
  druid: 'Command the weather and the wildlife, and turn into an animal when it suits.',
  fighter: 'Hit things hard, take a beating, and never run out of anything.',
  monk: 'Fight unarmed and unarmoured, move faster than anyone, and hit several times a turn.',
  paladin: 'Stand at the front in heavy armour, heal a little, and smite what you hit.',
  ranger: 'Track your quarry, shoot it from range, and know your way through the wild.',
  rogue: 'Sneak, pick locks, and hit one target very hard when nobody is looking.',
  sorcerer: 'Magic is in your blood — fewer spells than a wizard, bent to your will as you cast.',
  warlock: 'A patron lends you power. One reliable blast, and favours nobody else can call in.',
  wizard: 'Carry a book of spells for every problem, and stay well behind the fighter.',
}

/**
 * The nine species.
 *
 * In the 2024 rules a species grants traits and a speed and no ability scores
 * at all, which is exactly the thing a player coming from anywhere else expects
 * wrongly — so each line is about the traits, and none of them mentions a score.
 */
export const SPECIES_IN_PLAY: Readonly<Record<string, string>> = {
  dragonborn:
    'Dragon-blooded: you see in the dark, and from level 5 you can sprout wings and fly over a fight.',
  dwarf: 'You see 120 feet in the dark, shrug off poison, and gain an extra hit point every level.',
  elf: 'You see in the dark, are hard to charm, and choose a lineage that hands you free spells.',
  gnome: 'Small, and hard to catch with magic — advantage on the saves most spells make you roll.',
  goliath: 'Giant-blooded: you win grapples, carry more, and from level 5 can grow to Large.',
  halfling:
    'Small and lucky — you reroll natural 1s, resist fear, and can hide behind bigger folk.',
  human: 'The all-rounder: a free feat, a free skill, and a reroll banked after every long rest.',
  orc: 'Built to keep going — dash as a bonus action for temporary hit points, and drop to 1 hit point instead of 0 once a rest.',
  tiefling:
    'Infernal blood: you see in the dark, know a free cantrip, and pick a legacy that grows into real spells.',
}

/**
 * The four backgrounds — the 2024 rules' home for ability score increases, an
 * Origin feat, two skills and a tool. The card already prints which scores go
 * up, so the line is about the feat and the two skills, which is the half a
 * player has no way to read off the numbers.
 */
export const BACKGROUND_IN_PLAY: Readonly<Record<string, string>> = {
  acolyte:
    'Temple-raised: you read people and know the gods, and you start with a few cleric spells.',
  criminal:
    'You have done this before — light fingers, quiet feet, and never caught off guard when a fight starts.',
  sage: 'Books and awkward questions: you know magic and history, and studying them left you a few spells.',
  soldier:
    'Trained and hard to argue with: you climb and shove well, lean on people, and reroll bad damage.',
}

/**
 * The eighteen skills, as the question the DM is actually asking when they call
 * for one. Written for the moment of the roll, because that is when a new player
 * meets the skill for the first time.
 */
export const SKILL_IN_PLAY: Readonly<Record<string, string>> = {
  acrobatics: 'Keeping your feet: balancing, tumbling, and wriggling out of a grab.',
  'animal-handling': 'Calming a spooked horse, and reading what an animal is about to do.',
  arcana: 'Recognising a spell as it is cast, and knowing what the circle on the floor does.',
  athletics: 'Climbing, swimming, jumping, and shoving people over.',
  deception: 'Lying to someone’s face and being believed.',
  history: 'Knowing who built this, who ruled here, and what happened the last time.',
  insight: 'Reading a person: are they lying, and what do they actually want?',
  intimidation: 'Getting your way with a threat, a stare, or a raised voice.',
  investigation: 'Working out how it fits together — searching a room, spotting the forgery.',
  medicine: 'Steadying a dying friend, and telling what killed someone.',
  nature: 'Plants, weather and beasts: what is safe to eat, and what is about to eat you.',
  perception: 'Noticing things. The most rolled skill in the game, by a distance.',
  performance: 'Holding a crowd with a song, a speech, or a trick.',
  persuasion: 'Talking someone round without lying to them.',
  religion: 'Gods, rites and the undead — whose symbol that is, and what the chanting means.',
  'sleight-of-hand': 'Picking a pocket, palming a key, or planting something on somebody.',
  stealth: 'Not being seen or heard: past a guard, or opening a fight from the dark.',
  survival: 'Tracking, foraging, and not getting lost between one town and the next.',
}

/**
 * The six ability scores, as what the number buys you.
 *
 * The scores step is the one place in the wizard where the control is a select
 * rather than an option card — the standard array is six numbers being *moved*
 * between abilities — so these lines render in the row rather than through
 * `OptionRow`. Same copy, same table, same test.
 */
export const ABILITY_IN_PLAY: Readonly<Record<string, string>> = {
  strength: 'How hard you swing a heavy weapon, and how much you can shove, climb and carry.',
  dexterity:
    'How hard you are to hit, how early you act in a fight, and how well you shoot and sneak.',
  constitution:
    'How many hit points you have, and whether you stay upright through poison and worse.',
  intelligence: 'What you know and what you can work out — and a wizard’s whole spell list.',
  wisdom: 'What you notice and who you believe — and a cleric’s and druid’s whole spell list.',
  charisma: 'How far people go along with you — and a bard’s, sorcerer’s and warlock’s spell list.',
}

/**
 * The four sections of the SRD's weapon table, which is the level starting gear
 * is actually chosen at: nobody picks a Glaive on this screen, they pick the
 * bundle it came in. `weaponGroupOf` in `weapons.ts` puts every SRD weapon in
 * exactly one of these.
 */
export const WEAPON_GROUP_IN_PLAY: Readonly<Record<string, string>> = {
  'simple-melee': 'Anyone can fight with these. Close up, modest damage, nothing to learn first.',
  'simple-ranged':
    'Easy shooting from the back. Less damage than a longbow, and no training needed.',
  'martial-melee':
    'The big swings: more damage than any simple weapon, and only trained classes get them.',
  'martial-ranged':
    'Trained shooting — the longest reach on the table, at the cost of both hands and ammunition.',
}

/**
 * The two starting-gear options no weapon group describes: the SRD's "or 50 GP"
 * clause, and the bundles that are tools and clothes rather than anything you
 * fight with. Keyed rather than inlined in the component so every line the
 * wizard prints comes out of this one module.
 */
export const GEAR_IN_PLAY = {
  goldInstead: 'No kit — you walk in with coin and buy exactly what you want at the first shop.',
  noWeapon:
    'The tools of the trade rather than a weapon: what your character carries, not what they fight with.',
} as const

/**
 * The curated opening hand: every spell `curatedSpells` can put in front of a
 * 1st-level caster, which is the set the spells step pre-ticks and shows.
 *
 * Deliberately not all 339. The rest of a class's list is one Advanced tap away
 * and arrives without a line — writing 339 of these would be writing the SRD
 * back out in worse words, and the research's finding was that the long list is
 * the problem, not that it is under-annotated.
 *
 * The line's job is the difference a first-timer cannot see: whether the spell
 * needs an attack roll or forces a save, whether it costs a bonus action or a
 * reaction, and whether holding concentration means giving up something else.
 */
export const SPELL_IN_PLAY: Readonly<Record<string, string>> = {
  bane: 'Three enemies roll worse on their attacks and saves for a minute — Bless, pointed the other way.',
  bless:
    'Three friends add a d4 to every attack roll and save for a minute. Quietly the best thing you can do at level 1.',
  'burning-hands':
    'A cone of fire straight off your fingers. Everyone caught dodges for half — best when they bunch up.',
  'charm-person':
    'One person treats you as a friend for an hour. They know afterwards, so use it and be gone.',
  'chromatic-orb':
    'A thrown ball of energy whose damage type you choose. Needs an attack roll, and hits hard when it lands.',
  'cure-wounds':
    'Touch someone and give hit points back. You have to reach them, which is why Healing Word usually wins mid-fight.',
  'detect-magic': 'Ten minutes of seeing what is enchanted nearby, and what kind of magic it is.',
  'divine-favor':
    'One bonus action, then every weapon hit you land for the next minute burns as well.',
  druidcraft: 'Small nature tricks: read the weather, light or snuff a flame, make a bud open.',
  'eldritch-blast':
    'Your reliable attack: an attack roll at 120 feet, forever, and it grows extra beams as you level.',
  'ensnaring-strike':
    'Your next hit wraps them in thorns. They are restrained until they tear free.',
  entangle:
    'Grasping weeds fill a 20-foot square. Anything that fails is stuck there and cannot come at you.',
  'faerie-fire':
    'Everything in the area is outlined in light: nothing can hide, and every attack against them has advantage.',
  'feather-fall':
    'A reaction as you fall. Up to five of you drift down instead of hitting the floor.',
  'fire-bolt': 'Your workhorse: an attack roll at 120 feet for fire damage, and it never runs out.',
  guidance:
    'A d4 on one ability check for whoever you touch. Worth casting before almost any roll out of combat.',
  'guiding-bolt':
    'An attack roll for heavy radiant damage, and the next attack on that target has advantage.',
  'healing-word':
    'A bonus action at 60 feet. Small healing, but it gets a friend off the floor without walking over.',
  'hellish-rebuke':
    'A reaction the moment something hurts you: it burns, and dodging only halves it.',
  hex: 'A bonus action that adds damage to every hit you land on one target, and cripples one of its ability checks.',
  'hunters-mark':
    'A bonus action that adds damage to every hit you land on one target, and moves on when that one drops.',
  light: 'Something you own glows like a torch for an hour. Free, and it solves most of the dark.',
  longstrider: 'One of you moves 10 feet further every turn for the next hour.',
  'mage-armor':
    'Eight hours of armour made of nothing — the answer for a caster who cannot wear any.',
  'mage-hand':
    'A floating hand at 30 feet that fetches, opens and pulls the levers you would rather not stand next to.',
  'magic-missile':
    'Darts that never miss. No attack roll, no save — the spell you finish something off with.',
  'minor-illusion':
    'A sound, or a small object, out of nothing. The most useful cantrip in the game if you are inventive.',
  prestidigitation:
    'The odd-jobs cantrip: clean, chill, flavour, mark, spark. A hundred small problems, solved.',
  'produce-flame':
    'A flame in your hand for light, or thrown as an attack roll. Both, and it costs nothing.',
  'ray-of-frost':
    'An attack roll for cold damage that also drags 10 feet off their speed until your next turn.',
  'sacred-flame':
    'No attack roll — they dodge or they burn, and it ignores cover, so nothing hides from it.',
  shield:
    'A reaction as an attack comes in: +5 armour class, which usually turns that hit into a miss.',
  'shield-of-faith':
    'A bonus action for +2 armour class on one of you for ten minutes. It costs your concentration.',
  shillelagh:
    'Your club or staff swings with your spellcasting ability instead of Strength, and hits harder for it.',
  sleep:
    'Enemies drop unconscious unless they save, and wake when damaged. It can end a fight before it starts.',
  'spare-the-dying':
    'Stabilise a dying friend from 15 feet away. No more death saves, and no slot spent.',
  thunderwave:
    'Everything in front of you takes thunder damage and is shoved 10 feet back. Your get-off-me spell.',
  'vicious-mockery':
    'An insult that actually hurts: psychic damage, and their next attack is at disadvantage.',
}
