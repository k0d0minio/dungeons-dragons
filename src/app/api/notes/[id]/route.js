import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUserFromToken } from '../../../../lib/auth'

// GET - Get specific note
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
    
    const note = await prisma.note.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })
    
    if (!note) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, note })
  } catch (error) {
    console.error('Error fetching note:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch note' },
      { status: 500 }
    )
  }
}

// PUT - Update note
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
    
    const { title, content, type, characterId, tags, priority, isPrivate } = await request.json()
    
    const note = await prisma.note.updateMany({
      where: {
        id: params.id,
        userId: user.id
      },
      data: {
        title,
        content,
        type,
        characterId: characterId || null,
        tags: tags || [],
        priority: priority || 'NORMAL',
        isPrivate: isPrivate || false
      }
    })
    
    if (note.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      )
    }
    
    const updatedNote = await prisma.note.findUnique({
      where: { id: params.id }
    })
    
    return NextResponse.json({ success: true, note: updatedNote })
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update note' },
      { status: 500 }
    )
  }
}

// DELETE - Delete note
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
    
    const note = await prisma.note.deleteMany({
      where: {
        id: params.id,
        userId: user.id
      }
    })
    
    if (note.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete note' },
      { status: 500 }
    )
  }
}
