import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUserFromToken } from '../../../../../lib/auth'

// GET - Get specific combat participant
export async function GET(request, { params }) {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    const participant = await prisma.combatParticipant.findFirst({
      where: {
        id: params.id,
        combatSession: {
          userId: user.id
        }
      }
    })
    
    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Combat participant not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, participant })
  } catch (error) {
    console.error('Error fetching combat participant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch combat participant' },
      { status: 500 }
    )
  }
}

// PUT - Update combat participant
export async function PUT(request, { params }) {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    const participantData = await request.json()
    
    const participant = await prisma.combatParticipant.updateMany({
      where: {
        id: params.id,
        combatSession: {
          userId: user.id
        }
      },
      data: participantData
    })
    
    if (participant.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Combat participant not found' },
        { status: 404 }
      )
    }
    
    const updatedParticipant = await prisma.combatParticipant.findUnique({
      where: { id: params.id }
    })
    
    return NextResponse.json({ success: true, participant: updatedParticipant })
  } catch (error) {
    console.error('Error updating combat participant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update combat participant' },
      { status: 500 }
    )
  }
}

// DELETE - Delete combat participant
export async function DELETE(request, { params }) {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    const participant = await prisma.combatParticipant.deleteMany({
      where: {
        id: params.id,
        combatSession: {
          userId: user.id
        }
      }
    })
    
    if (participant.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Combat participant not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, message: 'Combat participant deleted successfully' })
  } catch (error) {
    console.error('Error deleting combat participant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete combat participant' },
      { status: 500 }
    )
  }
}
