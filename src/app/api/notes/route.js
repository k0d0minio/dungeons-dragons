import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUserFromToken } from '../../../lib/auth'

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
    
    const where = { userId: user.id }
    
    if (type) where.type = type
    if (characterId) where.characterId = characterId
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    const notes = await prisma.note.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ success: true, notes })
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
