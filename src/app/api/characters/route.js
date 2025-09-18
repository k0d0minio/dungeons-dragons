import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUserFromToken } from '../../../lib/auth'
import { filterByPermissions, isDM } from '../../../lib/permissions'

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
    
    // DM sees all characters, Players see only their own
    const whereClause = isDM(user) ? {} : { userId: user.id }
    
    const characters = await prisma.character.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // Filter by permissions (redundant but safe)
    const filteredCharacters = filterByPermissions(user, characters, 'character')
    
    return NextResponse.json({ 
      success: true, 
      characters: filteredCharacters,
      userRole: user.role,
      isDM: isDM(user)
    })
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
    
    const currentUser = await getUserFromToken(token)
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    const characterData = await request.json()
    
    if (!characterData.name) {
      return NextResponse.json(
        { success: false, error: 'Character name is required' },
        { status: 400 }
      )
    }
    
    let targetUserId = currentUser.id
    
    // If DM is creating a character for a new player, create the user first
    if (isDM(currentUser) && characterData.password) {
      // Use character name as username
      const username = characterData.name
      
      // Check if username already exists
      const existingUser = await prisma.user.findUnique({
        where: { username: username }
      })
      
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Character name already taken as username' },
          { status: 400 }
        )
      }
      
      // Create new user
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash(characterData.password, 12)
      
      const newUser = await prisma.user.create({
        data: {
          username: username,
          password: hashedPassword,
          role: characterData.role || 'PLAYER'
        }
      })
      
      targetUserId = newUser.id
    }
    
    // Extract ability scores from nested object
    const { abilityScores, ...restData } = characterData
    
    const character = await prisma.character.create({
      data: {
        userId: targetUserId,
        name: characterData.name,
        class: characterData.class,
        race: characterData.race,
        level: characterData.level || 1,
        experience: characterData.experience || 0,
        background: characterData.background || null,
        alignment: characterData.alignment || null,
        strength: abilityScores?.strength || characterData.strength || 10,
        dexterity: abilityScores?.dexterity || characterData.dexterity || 10,
        constitution: abilityScores?.constitution || characterData.constitution || 10,
        intelligence: abilityScores?.intelligence || characterData.intelligence || 10,
        wisdom: abilityScores?.wisdom || characterData.wisdom || 10,
        charisma: abilityScores?.charisma || characterData.charisma || 10,
        hitPoints: characterData.hitPoints || 8,
        maxHitPoints: characterData.maxHitPoints || 8,
        armorClass: characterData.armorClass || 10,
        speed: characterData.speed || 30,
        personality: characterData.personality || null,
        ideals: characterData.ideals || null,
        bonds: characterData.bonds || null,
        flaws: characterData.flaws || null
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
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
