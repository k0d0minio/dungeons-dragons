// The twelve SRD 5.2.1 classes and their one subclass each, local (`srd-2024-migration/srd-data-layer`).
//
// Classes and subclasses live in one module because nothing needs one without
// the other: every 2024 class chooses its subclass at level 3 (uniform — no
// level-1 Cleric domains, no level-2 Wizard schools), so a sheet showing class
// features at level 3+ is always also showing subclass features.
//
// The SRD publishes exactly one subclass per class. That is a licensing
// boundary, not an oversight: the other PHB subclasses are not CC-BY and never
// enter this data.
import classData from './data/classes.json'
import subclassData from './data/subclasses.json'
import { collection } from './lookup'
import type { SrdClass, SrdClassFeature, SrdSubclass, SrdSubclassFeature } from './types'

export const CLASSES = collection(classData as SrdClass[])
export const SUBCLASSES = collection(subclassData as SrdSubclass[])

/** The level every 2024 class gains its subclass at. */
export const SUBCLASS_LEVEL = 3

/** The subclasses the SRD publishes for a class — exactly one, or none for an unknown class. */
export function subclassesForClass(classIndex: string): SrdSubclass[] {
  return SUBCLASSES.all.filter((subclass) => subclass.classIndex === classIndex)
}

/**
 * A class's features at or below `level`, in level order.
 *
 * Subclass features are deliberately excluded: a Fighter who is not a Champion
 * does not have Improved Critical, and upstream files both under the class.
 * Use `subclassFeaturesUpTo` alongside this one.
 */
export function classFeaturesUpTo(classIndex: string, level: number): SrdClassFeature[] {
  return (CLASSES.get(classIndex)?.features ?? []).filter((feature) => feature.level <= level)
}

/** A subclass's features at or below `level`, in level order. */
export function subclassFeaturesUpTo(subclassIndex: string, level: number): SrdSubclassFeature[] {
  return (SUBCLASSES.get(subclassIndex)?.features ?? []).filter((feature) => feature.level <= level)
}

/**
 * Whether a character of this class and level has chosen a subclass yet.
 *
 * The answer is the same for all twelve classes, but asking it through the data
 * rather than through a literal 3 keeps the one place that would have to change
 * if the SRD ever moved the level.
 */
export function hasSubclassAtLevel(classIndex: string, level: number): boolean {
  const characterClass = CLASSES.get(classIndex)
  return characterClass ? level >= characterClass.subclassLevel : false
}
