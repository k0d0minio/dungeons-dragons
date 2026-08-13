import { render, screen } from '@testing-library/react'
import { ReferenceDetailSheet, type ReferenceType } from './reference-detail-sheet'

jest.mock('./spell-detail', () => ({ SpellDetail: () => <div>spell body</div> }))
jest.mock('./class-detail', () => ({ ClassDetail: () => <div>class body</div> }))
jest.mock('./race-detail', () => ({ RaceDetail: () => <div>race body</div> }))
jest.mock('./equipment-detail', () => ({ EquipmentDetail: () => <div>equipment body</div> }))
jest.mock('./monster-detail', () => ({ MonsterDetail: () => <div>monster body</div> }))

describe('ReferenceDetailSheet', () => {
  it('renders nothing when no item is selected', () => {
    render(<ReferenceDetailSheet selection={null} onClose={jest.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each<[ReferenceType, string]>([
    ['spell', 'spell body'],
    ['class', 'class body'],
    ['race', 'race body'],
    ['equipment', 'equipment body'],
    ['monster', 'monster body'],
  ])('opens the %s detail view', (type, body) => {
    render(
      <ReferenceDetailSheet
        selection={{ type, index: 'some-index', name: 'Some Name' }}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Some Name')).toBeInTheDocument()
    expect(screen.getByText(body)).toBeInTheDocument()
  })

  it('offers a close control', () => {
    render(
      <ReferenceDetailSheet
        selection={{ type: 'spell', index: 'fireball', name: 'Fireball' }}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })
})
