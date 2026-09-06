'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MAX_NOTE_LENGTH, MAX_SESSION_ANSWER_LENGTH, type SessionAnswer } from '@/lib/notes/schema'

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
 */
export function CloseSessionCard({
  campaignId,
  draft,
  characters = [],
}: {
  campaignId: string
  /** The generated summary, as the DM finds it in the box. May be empty. */
  draft: string
  /** The party, for the questions. */
  characters?: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  const [body, setBody] = useState(draft)
  const [answers, setAnswers] = useState<Answers>({})
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
        body: JSON.stringify(
          answered.length > 0 ? { body: recap, answers: answered } : { body: recap },
        ),
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
