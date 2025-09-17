import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUserFromToken } from '../../../../lib/auth'

// GET - Load inventory items
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
    const inventoryId = searchParams.get('inventoryId')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    
    if (!inventoryId) {
      return NextResponse.json(
        { success: false, error: 'Inventory ID is required' },
        { status: 400 }
      )
    }
    
    // Verify inventory belongs to user
    const inventory = await prisma.inventory.findFirst({
      where: {
        id: inventoryId,
        userId: user.id
      }
    })
    
    if (!inventory) {
      return NextResponse.json(
        { success: false, error: 'Inventory not found' },
        { status: 404 }
      )
    }
    
    const where = { inventoryId }
    if (type) where.type = type
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('Error fetching inventory items:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory items' },
      { status: 500 }
    )
  }
}

// POST - Create new inventory item
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
      inventoryId, 
      name, 
      type, 
      weight, 
      quantity, 
      value, 
      description, 
      isMagic, 
      rarity, 
      attunement, 
      magicProperties, 
      equipped, 
      equippedSlot 
    } = await request.json()
    
    if (!inventoryId || !name || !type) {
      return NextResponse.json(
        { success: false, error: 'Inventory ID, name, and type are required' },
        { status: 400 }
      )
    }
    
    // Verify inventory belongs to user
    const inventory = await prisma.inventory.findFirst({
      where: {
        id: inventoryId,
        userId: user.id
      }
    })
    
    if (!inventory) {
      return NextResponse.json(
        { success: false, error: 'Inventory not found' },
        { status: 404 }
      )
    }
    
    const item = await prisma.inventoryItem.create({
      data: {
        inventoryId,
        name,
        type,
        weight: weight || 0,
        quantity: quantity || 1,
        value: value || 0,
        description: description || null,
        isMagic: isMagic || false,
        rarity: rarity || 'COMMON',
        attunement: attunement || false,
        magicProperties: magicProperties || null,
        equipped: equipped || false,
        equippedSlot: equippedSlot || null
      }
    })
    
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Error creating inventory item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create inventory item' },
      { status: 500 }
    )
  }
}
