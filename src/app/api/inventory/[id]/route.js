import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUserFromToken } from '../../../../lib/auth'

// GET - Get specific inventory
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
    
    const inventory = await prisma.inventory.findFirst({
      where: {
        id: params.id,
        userId: user.id
      },
      include: {
        items: true,
        character: {
          select: { id: true, name: true }
        }
      }
    })
    
    if (!inventory) {
      return NextResponse.json(
        { success: false, error: 'Inventory not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, inventory })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

// PUT - Update inventory
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
    
    const { name, characterId } = await request.json()
    
    const inventory = await prisma.inventory.updateMany({
      where: {
        id: params.id,
        userId: user.id
      },
      data: {
        name,
        characterId: characterId || null
      }
    })
    
    if (inventory.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Inventory not found' },
        { status: 404 }
      )
    }
    
    const updatedInventory = await prisma.inventory.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        character: {
          select: { id: true, name: true }
        }
      }
    })
    
    return NextResponse.json({ success: true, inventory: updatedInventory })
  } catch (error) {
    console.error('Error updating inventory:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update inventory' },
      { status: 500 }
    )
  }
}

// DELETE - Delete inventory
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
    
    const inventory = await prisma.inventory.deleteMany({
      where: {
        id: params.id,
        userId: user.id
      }
    })
    
    if (inventory.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Inventory not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, message: 'Inventory deleted successfully' })
  } catch (error) {
    console.error('Error deleting inventory:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete inventory' },
      { status: 500 }
    )
  }
}
