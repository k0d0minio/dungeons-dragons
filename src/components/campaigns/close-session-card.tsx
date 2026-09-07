'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  formatSessionDate,
  MAX_NOTE_LENGTH,
  MAX_SESSION_ANSWER_LENGTH,
  type SessionAnswer,
} from '@/lib/notes/schema'

/** A plan the night could have run from, as the picker lists it. */
export interface CloseSessionPlan {
  id: string
  title: string
  sessionDate: string | null
}

/** The `<option>` value for "this night ran from no plan" — never an id. */
const NO_PLAN = ''

/** The three lines the DM asks each player as the table packs up. */
const QUESTIONS = [
  { key: 'favouriteMoment', label: 'Favourite moment?' },
  { key: 'wantsNext', label: 'What does your character want next?' },
  { key: 'highlight', label: 'Their highlight tonight' },
] as const

type AnswerKey = (typeof QUESTIONS)[number]['key']
type Answers = Record<string, Partial<Record<AnswerKey, string>>>

/**
 * The end of the evening (`dm-run-suite/session-log-recap`, D41).
 *
 * **The draft is the app's; the recap is the DM's.** The box opens pre-filled
 * with the facts the log derived and the lines the DM captured, and every one
 * of them is there to be deleted: what publishes is whatever is in the box when
 * the button is pressed, which is why this is a textarea and not a list with
 * checkboxes beside it. "Automatic capture, human words" only works if the
 * words are editable prose by the time anyone reads them.
 *
 * **Publishing and closing are one act**, and the button says both. A session
 * closed without a recap would be a state with nothing to show for it, and a
 * recap published without closing would leave tomorrow's log still carrying
 * tonight's fights — so there is one button, and its caption is the whole
 * consequence: the party reads this, and the log starts again.
 *
 * The draft arrives as a prop from the server render rather than being fetched:
 * this page is opened once, at the end of a session, and a spinner between the
 * DM and the box would be a spinner on the one screen where they are trying to
 * finish and go home.
 *
 * Above the recap, one row per player character
 * (`first-table/between-sessions-questions`): the two questions the research
 * recommends at the end of every night — favourite moment, what the character
 * wants next — and a one-line highlight. The DM asks at the table and types;
 * the answers land dated under *Threads* in that character's DM note, where
 * the next prep reads them, and the highlights are offered to the recap as
 * lines the DM can keep. Every field is optional: whoever is still at the
 * table answers.
 *
 * And, since `dm-chronology/session-chain`, one line above the box naming the
 * **plan this night gets filed under**. The server would stamp the same plan
 * without asking — it is tonight's by the rule the Play tab runs on — so this
 * is not a field the DM has to fill in; it is the app saying out loud which
 * night it thinks this was, on the one screen where a DM who moved the evening
 * would notice. Changing it is a select, and "no plan" is one of its options:
 * a night that just happened is a night, and a recap linked to the wrong plan
 * is worse than one linked to nothing.
 */
export function CloseSessionCard({
  campaignId,
  draft,
  characters = [],
  plans,
  suggestedPlanId = null,
}: {
  campaignId: string
  /** The generated summary, as the DM finds it in the box. May be empty. */
  draft: string
  /** The party, for the questions. */
  characters?: Array<{ id: string; name: string }>
  /**
   * The campaign's plans, newest night first. Omitted — rather than empty —
   * means this screen has nothing to say about the link, and the request
   * leaves `planId` out so the route's own rule decides.
   */
  plans?: CloseSessionPlan[]
  /** Tonight's plan, as the server picked it. The select opens on it. */
  suggestedPlanId?: string | null
}) {
  const router = useRouter()
  const [body, setBody] = useState(draft)
  const [answers, setAnswers] = useState<Answers>({})
  const [planId, setPlanId] = useState(suggestedPlanId ?? NO_PLAN)
  const [publishing, setPublishing] = useState(false)

  function setAnswer(characterId: string, key: AnswerKey, value: string) {
    setAnswers((current) => ({
      ...current,
      [characterId]: { ...current[characterId], [key]: value },
    }))
  }

  const answered: SessionAnswer[] = characters
    .map((character) => ({ characterId: character.id, ...answers[character.id] }))
    .filter((answer) =>
      QUESTIONS.some((question) => (answer[question.key] ?? '').trim().length > 0),
    )

  const highlights = characters
    .map((character) => ({ name: character.name, line: answers[character.id]?.highlight?.trim() }))
    .filter((entry): entry is { name: string; line: string } => Boolean(entry.line))

  /** Offer the highlights to the recap: one line each, appended once. */
  function addHighlights() {
    const lines = highlights
      .map((entry) => `${entry.name}: ${entry.line}`)
      .filter((line) => !body.includes(line))
    if (lines.length === 0) return
    setBody((current) => `${current.trimEnd()}${current.trim() ? '\n\n' : ''}${lines.join('\n')}`)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()

    const recap = body.trim()
    if (publishing || !recap) return

    setPublishing(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-log/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: recap,
          ...(answered.length > 0 ? { answers: answered } : {}),
          // Sent only when the DM was shown the link: what is on screen is
          // what gets written, including "no plan", which is why `null` goes
          // over the wire rather than the field being dropped.
          ...(plans === undefined ? {} : { planId: planId === NO_PLAN ? null : planId }),
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(payload?.error ?? 'That did not publish. Try again.')
        return
      }

      // Re-rendered rather than cleared by hand: the log this page shows is
      // derived from the window this request just moved, so the server is the
      // only thing that knows what the page says now.
      toast.success('Session closed. Your players can read the recap.')
      router.refresh()
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Close the session</CardTitle>
        <CardDescription>
          Trim this into what the party should remember. Publishing puts it at the top of their
          campaign page and starts the next session&apos;s log.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          {characters.length > 0 ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">
                Two questions and a highlight, per player
              </legend>
              <p className="text-muted-foreground text-xs">
                Ask at the table and type. Each lands in your note on that character.
              </p>
              {characters.map((character) => (
                <div key={character.id} className="space-y-1.5 rounded-md border p-3">
                  <p className="text-sm font-medium">{character.name}</p>
                  {QUESTIONS.map((question) => {
                    const inputId = `answer-${character.id}-${question.key}`
                    return (
                      <div key={question.key} className="space-y-1">
                        <Label htmlFor={inputId} className="text-muted-foreground text-xs">
                          {question.label}
                        </Label>
                        <Input
                          id={inputId}
                          value={answers[character.id]?.[question.key] ?? ''}
                          onChange={(event) =>
                            setAnswer(character.id, question.key, event.target.value)
                          }
                          maxLength={MAX_SESSION_ANSWER_LENGTH}
                          className="h-11"
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full sm:w-auto"
                disabled={highlights.length === 0}
                onClick={addHighlights}
              >
                Add the highlights to the recap
              </Button>
            </fieldset>
          ) : null}

          {plans !== undefined && plans.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="session-plan">The plan this night ran from</Label>
              {/* A native select, like the campaign form's: a handful of names
                  on a phone, where the OS picker is the better control. */}
              <select
                id="session-plan"
                value={planId}
                disabled={publishing}
                onChange={(event) => setPlanId(event.target.value)}
                className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm disabled:opacity-50"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.sessionDate === null
                      ? plan.title
                      : `${plan.title} — ${formatSessionDate(plan.sessionDate)}`}
                  </option>
                ))}
                <option value={NO_PLAN}>No plan — this night just happened</option>
              </select>
              <p className="text-muted-foreground text-xs">
                {planId === NO_PLAN
                  ? 'The recap stands on its own, with nothing planned behind it.'
                  : 'The recap, tonight’s log and this plan become one night under Sessions.'}
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="session-recap">Recap</Label>
            <Textarea
              id="session-recap"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={10}
              maxLength={MAX_NOTE_LENGTH}
              placeholder="Previously on…"
            />
          </div>

          <Button type="submit" className="h-11 w-full" disabled={publishing || !body.trim()}>
            {publishing ? 'Publishing…' : 'Publish recap and close session'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
