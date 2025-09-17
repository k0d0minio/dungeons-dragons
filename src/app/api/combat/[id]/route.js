import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUserFromToken } from '../../../../lib/auth'

// GET - Get specific combat session
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
    
    const combatSession = await prisma.combatSession.findFirst({
      where: {
        id: params.id,
        userId: user.id
      },
      include: {
        participants: {
          orderBy: { initiative: 'desc' }
        }
      }
    })
    
    if (!combatSession) {
      return NextResponse.json(
        { success: false, error: 'Combat session not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, combatSession })
  } catch (error) {
    console.error('Error fetching combat session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch combat session' },
      { status: 500 }
    )
  }
}

// PUT - Update combat session
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
    
    const { name, round, turn, isActive } = await request.json()
    
    const combatSession = await prisma.combatSession.updateMany({
      where: {
        id: params.id,
        userId: user.id
      },
      data: {
        name,
        round: round || 1,
        turn: turn || 1,
        isActive: isActive || false
      }
    })
    
    if (combatSession.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Combat session not found' },
        { status: 404 }
      )
    }
    
    const updatedSession = await prisma.combatSession.findUnique({
      where: { id: params.id },
      include: {
        participants: {
          orderBy: { initiative: 'desc' }
        }
      }
    })
    
    return NextResponse.json({ success: true, combatSession: updatedSession })
  } catch (error) {
    console.error('Error updating combat session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update combat session' },
      { status: 500 }
    )
  }
}

// DELETE - Delete combat session
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
    
    const combatSession = await prisma.combatSession.deleteMany({
      where: {
        id: params.id,
        userId: user.id
      }
    })
    
    if (combatSession.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Combat session not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, message: 'Combat session deleted successfully' })
  } catch (error) {
    console.error('Error deleting combat session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete combat session' },
      { status: 500 }
    )
  }
}
