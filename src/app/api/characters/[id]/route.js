import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUserFromToken } from '../../../../lib/auth'

// GET - Get specific character
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
    
    const character = await prisma.character.findFirst({
      where: {  
        id: params.id,
        userId: user.id
      }
    })
    
    if (!character) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, character })
  } catch (error) {
    console.error('Error fetching character:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch character' },
      { status: 500 }
    )
  }
}

// PUT - Update character
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
    
    const characterData = await request.json()
    
    // Extract ability scores from nested object
    const { abilityScores, ...restData } = characterData
    
    const updateData = {
      name: characterData.name,
      class: characterData.class,
      race: characterData.race,
      level: characterData.level,
      experience: characterData.experience,
      background: characterData.background,
      alignment: characterData.alignment,
      strength: abilityScores?.strength,
      dexterity: abilityScores?.dexterity,
      constitution: abilityScores?.constitution,
      intelligence: abilityScores?.intelligence,
      wisdom: abilityScores?.wisdom,
      charisma: abilityScores?.charisma,
      hitPoints: characterData.hitPoints?.current,
      maxHitPoints: characterData.hitPoints?.maximum,
      armorClass: characterData.armorClass,
      speed: characterData.speed,
      personality: characterData.notes?.personality,
      ideals: characterData.notes?.ideals,
      bonds: characterData.notes?.bonds,
      flaws: characterData.notes?.flaws
    }
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })
    
    const character = await prisma.character.updateMany({
      where: {
        id: params.id,
        userId: user.id
      },
      data: updateData
    })
    
    if (character.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      )
    }
    
    const updatedCharacter = await prisma.character.findUnique({
      where: { id: params.id }
    })
    
    return NextResponse.json({ success: true, character: updatedCharacter })
  } catch (error) {
    console.error('Error updating character:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update character' },
      { status: 500 }
    )
  }
}

// DELETE - Delete character
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
    
    const character = await prisma.character.deleteMany({
      where: {
        id: params.id,
        userId: user.id
      }
    })
    
    if (character.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Character not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, message: 'Character deleted successfully' })
  } catch (error) {
    console.error('Error deleting character:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete character' },
      { status: 500 }
    )
  }
}
