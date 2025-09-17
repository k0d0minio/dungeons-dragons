import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUserFromToken } from '../../../lib/auth'

// GET - Load user's combat sessions
export async function GET(request) {
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
    
    const combatSessions = await prisma.combatSession.findMany({
      where: { userId: user.id },
      include: {
        participants: {
          orderBy: { initiative: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ success: true, combatSessions })
  } catch (error) {
    console.error('Error fetching combat sessions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch combat sessions' },
      { status: 500 }
    )
  }
}

// POST - Create new combat session
export async function POST(request) {
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
    
    const { name, participants = [] } = await request.json()
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Combat session name is required' },
        { status: 400 }
      )
    }
    
    const combatSession = await prisma.combatSession.create({
      data: {
        userId: user.id,
        name,
        round: 1,
        turn: 1,
        isActive: false
      },
      include: {
        participants: true
      }
    })
    
    // Add participants if provided
    if (participants.length > 0) {
      const participantData = participants.map(participant => ({
        combatSessionId: combatSession.id,
        name: participant.name,
        initiative: participant.initiative,
        armorClass: participant.armorClass,
        hitPoints: participant.hitPoints,
        maxHitPoints: participant.maxHitPoints,
        isPlayer: participant.isPlayer || false,
        isActive: false
      }))
      
      await prisma.combatParticipant.createMany({
        data: participantData
      })
      
      // Reload with participants
      const updatedSession = await prisma.combatSession.findUnique({
        where: { id: combatSession.id },
        include: {
          participants: {
            orderBy: { initiative: 'desc' }
          }
        }
      })
      
      return NextResponse.json({ success: true, combatSession: updatedSession })
    }
    
    return NextResponse.json({ success: true, combatSession })
  } catch (error) {
    console.error('Error creating combat session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create combat session' },
      { status: 500 }
    )
  }
}
