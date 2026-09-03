import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CHARACTER_WELCOME_KEY } from '@/lib/characters/welcome-flag'

import { WelcomeBand } from './welcome-band'

// The band's contract (`triage/creation-completion-learn-link`): it appears on
// the first opening of a character that was just made, names them, offers
// `/learn`, goes away on a tap, and is never seen again.

const store = window.localStorage as jest.Mocked<Storage>

const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

beforeEach(() => {
  store.getItem.mockReturnValue(null)
})

it('greets a character the wizard has just made', async () => {
  store.getItem.mockReturnValue(CHARACTER_ID)

  render(<WelcomeBand characterId={CHARACTER_ID} name="Vex Ashbrand" />)

  expect(await screen.findByText(/Vex Ashbrand is ready/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Learn to play' })).toHaveAttribute('href', '/learn')
})

it('spends the note on the first render, so a reload does not greet twice', async () => {
  store.getItem.mockReturnValue(CHARACTER_ID)

  render(<WelcomeBand characterId={CHARACTER_ID} name="Vex Ashbrand" />)

  await screen.findByText(/Vex Ashbrand is ready/)
  expect(store.removeItem).toHaveBeenCalledWith(CHARACTER_WELCOME_KEY)
})

it('goes away on a tap', async () => {
  const user = userEvent.setup()
  store.getItem.mockReturnValue(CHARACTER_ID)

  render(<WelcomeBand characterId={CHARACTER_ID} name="Vex Ashbrand" />)

  await user.click(await screen.findByRole('button', { name: 'Got it' }))

  expect(screen.queryByText(/Vex Ashbrand is ready/)).not.toBeInTheDocument()
})

// The ordinary case, and the one that matters most: every sheet opened on every
// other day of this character's life renders nothing at all.
it('says nothing on a sheet nobody left a note for', () => {
  render(<WelcomeBand characterId={CHARACTER_ID} name="Vex Ashbrand" />)

  expect(screen.queryByText(/Vex Ashbrand is ready/)).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Learn to play' })).not.toBeInTheDocument()
})

it('says nothing when the note names a different character', () => {
  store.getItem.mockReturnValue('00000000-0000-4000-8000-000000000001')

  render(<WelcomeBand characterId={CHARACTER_ID} name="Vex Ashbrand" />)

  expect(screen.queryByText(/Vex Ashbrand is ready/)).not.toBeInTheDocument()
  expect(store.removeItem).not.toHaveBeenCalled()
})
