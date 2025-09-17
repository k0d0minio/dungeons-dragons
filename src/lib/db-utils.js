import { prisma } from './prisma.js'
import bcrypt from 'bcryptjs'

// User Management
export async function createUser(username, password, role = 'PLAYER') {
  const hashedPassword = await bcrypt.hash(password, 10)
  
  return await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role
    }
  })
}

export async function validateUser(username, password) {
  const user = await prisma.user.findUnique({
    where: { username }
  })
  
  if (!user) return null
  
  const isValid = await bcrypt.compare(password, user.password)
  return isValid ? user : null
}

// Character Management
export async function createCharacter(userId, characterData) {
  return await prisma.character.create({
    data: {
      userId,
      ...characterData
    }
  })
}

export async function getCharactersByUser(userId) {
  return await prisma.character.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })
}

// Notes Management
export async function createNote(userId, noteData) {
  return await prisma.note.create({
    data: {
      userId,
      ...noteData
    }
  })
}

export async function getNotesByUser(userId, filters = {}) {
  const where = { userId }
  
  if (filters.type) where.type = filters.type
  if (filters.characterId) where.characterId = filters.characterId
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { content: { contains: filters.search, mode: 'insensitive' } }
    ]
  }
  
  return await prisma.note.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  })
}

// Inventory Management
export async function createInventory(userId, characterId = null) {
  return await prisma.inventory.create({
    data: {
      userId,
      characterId
    }
  })
}

export async function addInventoryItem(inventoryId, itemData) {
  return await prisma.inventoryItem.create({
    data: {
      inventoryId,
      ...itemData
    }
  })
}

export async function getInventoryByUser(userId) {
  return await prisma.inventory.findFirst({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })
}

// Combat Management
export async function createCombatSession(userId, name) {
  return await prisma.combatSession.create({
    data: {
      userId,
      name
    }
  })
}

export async function addCombatParticipant(combatSessionId, participantData) {
  return await prisma.combatParticipant.create({
    data: {
      combatSessionId,
      ...participantData
    }
  })
}

export async function getCombatSessionsByUser(userId) {
  return await prisma.combatSession.findMany({
    where: { userId },
    include: {
      participants: {
        orderBy: { initiative: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}
