// GET /api/dnd5e/monsters - Get all monsters
import { NextResponse } from 'next/server'

const DND_API_BASE_URL = 'https://www.dnd5eapi.co/api'

async function fetchFromDndApi(endpoint: string) {
  try {
    const response = await fetch(`${DND_API_BASE_URL}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'D&D-Companion-App/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`D&D API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch {
    console.error(`Failed to fetch from D&D API ${endpoint}:`, error)
    throw error
  }
}

export async function GET() {
  try {
    const data = await fetchFromDndApi('/monsters')
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch monsters' },
      { status: 500 }
    )
  }
}
