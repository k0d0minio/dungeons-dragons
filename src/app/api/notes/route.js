import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUserFromToken } from '../../../lib/auth'
import { filterByPermissions, isDM } from '../../../lib/permissions'

// GET - Load user's notes
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
    const type = searchParams.get('type')
    const characterId = searchParams.get('characterId')
    const search = searchParams.get('search')
    
    // DM sees all notes, Players see their own + DM notes
    let where = {}
    
    if (isDM(user)) {
      // DM sees all notes
      where = {}
    } else {
      // Players see their own notes + DM notes
      where = {
        OR: [
          { userId: user.id },
          { type: 'DM' }
        ]
      }
    }
    
    if (type) where.type = type
    if (characterId) where.characterId = characterId
    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } }
          ]
        }
      ]
    }
    
    const notes = await prisma.note.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        character: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // Filter by permissions (redundant but safe)
    const filteredNotes = filterByPermissions(user, notes, 'note')
    
    return NextResponse.json({ 
      success: true, 
      notes: filteredNotes,
      userRole: user.role,
      isDM: isDM(user)
    })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

// POST - Create new note
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
    
    const { title, content, type, characterId, tags, priority, isPrivate } = await request.json()
    
    if (!title || !content || !type) {
      return NextResponse.json(
        { success: false, error: 'Title, content, and type are required' },
        { status: 400 }
      )
    }
    
    const note = await prisma.note.create({
      data: {
        userId: user.id,
        title,
        content,
        type,
        characterId: characterId || null,
        tags: tags || [],
        priority: priority || 'NORMAL',
        isPrivate: isPrivate || false
      }
    })
    
    return NextResponse.json({ success: true, note })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create note' },
      { status: 500 }
    )
  }
}
