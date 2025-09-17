import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUserFromToken } from '../../../../lib/auth'

// GET - Load combat participants
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
    
    const { searchParams } = new URL(request.url)
    const combatSessionId = searchParams.get('combatSessionId')
    
    if (!combatSessionId) {
      return NextResponse.json(
        { success: false, error: 'Combat session ID is required' },
        { status: 400 }
      )
    }
    
    // Verify combat session belongs to user
    const combatSession = await prisma.combatSession.findFirst({
      where: {
        id: combatSessionId,
        userId: user.id
      }
    })
    
    if (!combatSession) {
      return NextResponse.json(
        { success: false, error: 'Combat session not found' },
        { status: 404 }
      )
    }
    
    const participants = await prisma.combatParticipant.findMany({
      where: { combatSessionId },
      orderBy: { initiative: 'desc' }
    })
    
    return NextResponse.json({ success: true, participants })
  } catch (error) {
    console.error('Error fetching combat participants:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch combat participants' },
      { status: 500 }
    )
  }
}

// POST - Create new combat participant
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
    
    const { 
      combatSessionId, 
      name, 
      initiative, 
      armorClass, 
      hitPoints, 
      maxHitPoints, 
      isPlayer, 
      isActive 
    } = await request.json()
    
    if (!combatSessionId || !name || initiative === undefined) {
      return NextResponse.json(
        { success: false, error: 'Combat session ID, name, and initiative are required' },
        { status: 400 }
      )
    }
    
    // Verify combat session belongs to user
    const combatSession = await prisma.combatSession.findFirst({
      where: {
        id: combatSessionId,
        userId: user.id
      }
    })
    
    if (!combatSession) {
      return NextResponse.json(
        { success: false, error: 'Combat session not found' },
        { status: 404 }
      )
    }
    
    const participant = await prisma.combatParticipant.create({
      data: {
        combatSessionId,
        name,
        initiative: parseInt(initiative),
        armorClass: armorClass || null,
        hitPoints: hitPoints || null,
        maxHitPoints: maxHitPoints || null,
        isPlayer: isPlayer || false,
        isActive: isActive || false
      }
    })
    
    return NextResponse.json({ success: true, participant })
  } catch (error) {
    console.error('Error creating combat participant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create combat participant' },
      { status: 500 }
    )
  }
}
