import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUserFromToken } from '../../../lib/auth'

// GET - Load user's characters
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
    
    const characters = await prisma.character.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ success: true, characters })
  } catch (error) {
    console.error('Error fetching characters:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch characters' },
      { status: 500 }
    )
  }
}

// POST - Create new character
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
    
    const characterData = await request.json()
    
    if (!characterData.name || !characterData.class || !characterData.race) {
      return NextResponse.json(
        { success: false, error: 'Name, class, and race are required' },
        { status: 400 }
      )
    }
    
    // Extract ability scores from nested object
    const { abilityScores, ...restData } = characterData
    
    const character = await prisma.character.create({
      data: {
        userId: user.id,
        name: characterData.name,
        class: characterData.class,
        race: characterData.race,
        level: characterData.level || 1,
        experience: characterData.experience || 0,
        background: characterData.background || null,
        alignment: characterData.alignment || null,
        strength: abilityScores?.strength || 10,
        dexterity: abilityScores?.dexterity || 10,
        constitution: abilityScores?.constitution || 10,
        intelligence: abilityScores?.intelligence || 10,
        wisdom: abilityScores?.wisdom || 10,
        charisma: abilityScores?.charisma || 10,
        hitPoints: characterData.hitPoints?.current || 8,
        maxHitPoints: characterData.hitPoints?.maximum || 8,
        armorClass: characterData.armorClass || 10,
        speed: characterData.speed || 30,
        personality: characterData.notes?.personality || null,
        ideals: characterData.notes?.ideals || null,
        bonds: characterData.notes?.bonds || null,
        flaws: characterData.notes?.flaws || null
      }
    })
    
    return NextResponse.json({ success: true, character })
  } catch (error) {
    console.error('Error creating character:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create character' },
      { status: 500 }
    )
  }
}
