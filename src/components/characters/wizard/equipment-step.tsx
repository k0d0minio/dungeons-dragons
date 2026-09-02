'use client'

import {
  backgroundEquipmentOptions,
  classEquipmentOptions,
  type EquipmentOption,
  type WizardChoices,
} from '@/lib/characters/wizard'
import { BACKGROUNDS } from '@/lib/characters/rules'
import { CLASSES } from '@/lib/srd/classes'

import { OptionList, type WizardOption } from './option-list'

/** "Chain Mail, Greatsword, Flail, 8 × Javelin, Dungeoneer's Pack". */
function contentsOf(option: EquipmentOption): string {
  return option.items
    .map((item) => (item.quantity > 1 ? `${item.quantity} × ${item.name}` : item.name))
    .join(', ')
}

function toOptions(options: EquipmentOption[]): WizardOption[] {
  return options.map((option, position) => ({
    value: String(position),
    // The gear itself is the title, not "Option A" — the choice is between
    // *things*, and a list of two letters says nothing about either.
    title: option.items.length > 0 ? contentsOf(option) : `${option.gold} gp and buy your own`,
    meta: option.gold > 0 && option.items.length > 0 ? [`and ${option.gold} gp`] : [],
    recommended: position === 0,
  }))
}

/**
 * Step 6: what this character walks in carrying.
 *
 * Two questions, not one: the class hands out a kit and the background hands
 * out another, and the SRD lets each be swapped for a purse instead. Both are
 * offered exactly as the SRD writes them, parsed out of the data rather than
 * re-typed here, so a set that changes upstream changes on this screen.
 *
 * Armour and shields arrive worn, which is what makes the sheet's derived AC
 * (DND-035) show the right number the first time the character is opened —
 * nobody has to know that equipping the chain mail is what turns 11 into 16.
 */
export function EquipmentStep({
  choices,
  onChange,
}: {
  choices: WizardChoices
  onChange: (next: WizardChoices) => void
}) {
  const classOptions = classEquipmentOptions(choices.classIndex)
  const backgroundOptions = backgroundEquipmentOptions(choices.backgroundIndex)
  const className = CLASSES.get(choices.classIndex)?.name ?? 'Your class'
  const backgroundName = BACKGROUNDS.get(choices.backgroundIndex)?.name

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-medium">What {className.toLowerCase()}s start with</h3>
        {classOptions.length > 0 ? (
          <OptionList
            name="class-equipment"
            legend={`${className} starting equipment`}
            options={toOptions(classOptions)}
            value={String(Math.min(choices.classEquipmentOption, classOptions.length - 1))}
            onChange={(value) => onChange({ ...choices, classEquipmentOption: Number(value) })}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            The reference data lists no starting equipment for this class.
          </p>
        )}
      </section>

      {backgroundOptions.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            What your {backgroundName ? backgroundName.toLowerCase() : 'background'} adds
          </h3>
          <OptionList
            name="background-equipment"
            legend={`${backgroundName ?? 'Background'} starting equipment`}
            options={toOptions(backgroundOptions)}
            value={String(
              Math.min(choices.backgroundEquipmentOption, backgroundOptions.length - 1),
            )}
            onChange={(value) => onChange({ ...choices, backgroundEquipmentOption: Number(value) })}
          />
        </section>
      ) : null}

      <p className="text-muted-foreground text-xs">
        All of it lands in your inventory, with armour and shields already worn — your armour class
        follows from what you are wearing.
      </p>
    </div>
  )
}
