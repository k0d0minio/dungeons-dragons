import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUserFromToken } from '../../../lib/auth'

// GET - Load user's inventories
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
    const characterId = searchParams.get('characterId')
    
    const where = { userId: user.id }
    if (characterId) where.characterId = characterId
    
    const inventories = await prisma.inventory.findMany({
      where,
      include: {
        items: true,
        character: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ success: true, inventories })
  } catch (error) {
    console.error('Error fetching inventories:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventories' },
      { status: 500 }
    )
  }
}

// POST - Create new inventory
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
    
    const { name, characterId } = await request.json()
    
    const inventory = await prisma.inventory.create({
      data: {
        userId: user.id,
        name: name || 'Main Inventory',
        characterId: characterId || null
      },
      include: {
        items: true,
        character: {
          select: { id: true, name: true }
        }
      }
    })
    
    return NextResponse.json({ success: true, inventory })
  } catch (error) {
    console.error('Error creating inventory:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create inventory' },
      { status: 500 }
    )
  }
}
