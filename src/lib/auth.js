import jwt from 'jsonwebtoken'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here'

// Create a new user
export async function createUser(username, password, role = 'PLAYER') {
  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role
      }
    })
    
    return { success: true, user: { id: user.id, username: user.username, role: user.role } }
  } catch (error) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Username already exists' }
    }
    return { success: false, error: 'Failed to create user' }
  }
}

// Validate user login
export async function validateUser(username, password) {
  try {
    const user = await prisma.user.findUnique({
      where: { username }
    })
    
    if (!user) {
      return { success: false, error: 'Invalid username or password' }
    }
    
    const isValid = await bcrypt.compare(password, user.password)
    
    if (!isValid) {
      return { success: false, error: 'Invalid username or password' }
    }
    
    return { 
      success: true, 
      user: { id: user.id, username: user.username, role: user.role } 
    }
  } catch (error) {
    return { success: false, error: 'Login failed' }
  }
}

// Generate JWT token
export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

// Get user from token
export async function getUserFromToken(token) {
  const decoded = verifyToken(token)
  if (!decoded) return null
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, role: true }
    })
    return user
  } catch (error) {
    return null
  }
}
