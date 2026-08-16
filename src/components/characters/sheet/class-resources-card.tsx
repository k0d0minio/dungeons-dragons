'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  regainResource,
  setResources,
  spendResource,
  type CombatState,
} from '@/lib/characters/combat'
import type { ClassResource, ClassResourceRecharge } from '@/lib/db/schema'

const RECHARGE_OPTIONS: Array<{ value: ClassResourceRecharge; label: string }> = [
  { value: 'short-rest', label: 'Short rest' },
  { value: 'long-rest', label: 'Long rest' },
  { value: 'manual', label: 'Manual' },
]

function rechargeLabel(recharge: ClassResourceRecharge): string {
  return RECHARGE_OPTIONS.find((option) => option.value === recharge)?.label ?? recharge
}

/** Three 44px segments rather than a Radix select: one tap, no overlay. */
function RechargePicker({
  name,
  value,
  onChange,
}: {
  name: string
  value: ClassResourceRecharge
  onChange: (next: ClassResourceRecharge) => void
}) {
  return (
    <div className="flex gap-1" role="group" aria-label={`${name} recharge`}>
      {RECHARGE_OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={value === option.value ? 'default' : 'outline'}
          className="h-11 flex-1 px-2 text-xs"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

/**
 * Class resource pools — rage, ki, Channel Divinity — as generic counters with
 * a recharge rule (D23, DND-033). Spending and regaining are the in-session
 * taps; the pools themselves are set up in the folded-away editor, because a
 * character gains a new one at a level-up, not mid-turn. Rests refill them by
 * recharge rule — that wiring lives in `rests.ts`, not here.
 */
export function ClassResourcesCard({
  state,
  apply,
}: {
  state: CombatState
  apply: (transition: (state: CombatState) => CombatState) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftMax, setDraftMax] = useState('')
  const [draftRecharge, setDraftRecharge] = useState<ClassResourceRecharge>('long-rest')

  const resources = state.classResources

  function addResource() {
    const name = draftName.trim()
    const max = Number.parseInt(draftMax, 10)
    if (!name || !Number.isFinite(max) || max < 1) return

    apply((current) =>
      setResources(current, [
        ...current.classResources,
        { name, max, used: 0, recharge: draftRecharge },
      ]),
    )
    setDraftName('')
    setDraftMax('')
    setDraftRecharge('long-rest')
  }

  function updateResource(position: number, patch: Partial<ClassResource>) {
    apply((current) =>
      setResources(
        current,
        current.classResources.map((resource, index) =>
          index === position ? { ...resource, ...patch } : resource,
        ),
      ),
    )
  }

  function removeResource(position: number) {
    apply((current) =>
      setResources(
        current,
        current.classResources.filter((_, index) => index !== position),
      ),
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Class resources</CardTitle>
        <Button
          type="button"
          variant="ghost"
          className="h-11 px-3"
          aria-pressed={editing}
          onClick={() => setEditing((open) => !open)}
        >
          {editing ? 'Done' : resources.length > 0 ? 'Edit' : 'Add'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {resources.length === 0 && !editing ? (
          <p className="text-muted-foreground text-sm">
            Nothing tracked yet. Add the pools your class spends — Rage, Ki, Channel Divinity…
          </p>
        ) : null}

        {!editing && resources.length > 0 ? (
          <ul className="space-y-2" aria-label="Class resources">
            {resources.map((resource, position) => (
              <li
                key={`${resource.name}-${position}`}
                className="flex items-center justify-between gap-2"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{resource.name}</span>
                  <span className="text-muted-foreground block text-xs">
                    {rechargeLabel(resource.recharge)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11"
                    aria-label={`Spend one ${resource.name}`}
                    disabled={resource.used >= resource.max}
                    onClick={() => apply((current) => spendResource(current, position))}
                  >
                    −
                  </Button>
                  <span className="w-12 text-center text-base font-semibold tabular-nums">
                    {resource.max - resource.used}/{resource.max}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11"
                    aria-label={`Regain one ${resource.name}`}
                    disabled={resource.used <= 0}
                    onClick={() => apply((current) => regainResource(current, position))}
                  >
                    +
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {editing ? (
          <div className="space-y-4">
            {resources.map((resource, position) => (
              <div key={position} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    className="h-11 flex-1"
                    aria-label={`Rename ${resource.name}`}
                    value={resource.name}
                    onChange={(event) => updateResource(position, { name: event.target.value })}
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={99}
                    className="h-11 w-20 tabular-nums"
                    aria-label={`Maximum ${resource.name}`}
                    value={resource.max}
                    onChange={(event) => {
                      const max = Number.parseInt(event.target.value, 10)
                      if (Number.isFinite(max)) updateResource(position, { max })
                    }}
                  />
                </div>
                <RechargePicker
                  name={resource.name}
                  value={resource.recharge}
                  onChange={(recharge) => updateResource(position, { recharge })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive h-11 w-full"
                  onClick={() => removeResource(position)}
                >
                  Remove {resource.name}
                </Button>
              </div>
            ))}

            <div className="space-y-2 rounded-md border border-dashed p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="resource-name" className="text-xs">
                    Name
                  </Label>
                  <Input
                    id="resource-name"
                    className="h-11"
                    placeholder="Rage"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                  />
                </div>
                <div className="w-20 space-y-1.5">
                  <Label htmlFor="resource-max" className="text-xs">
                    Max
                  </Label>
                  <Input
                    id="resource-max"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={99}
                    className="h-11 tabular-nums"
                    placeholder="3"
                    value={draftMax}
                    onChange={(event) => setDraftMax(event.target.value)}
                  />
                </div>
              </div>
              <RechargePicker
                name="New resource"
                value={draftRecharge}
                onChange={setDraftRecharge}
              />
              <Button
                type="button"
                className="h-11 w-full"
                disabled={!draftName.trim() || !(Number.parseInt(draftMax, 10) >= 1)}
                onClick={addResource}
              >
                Add resource
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
