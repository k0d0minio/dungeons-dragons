// API Routes for D&D 5e Content
// These routes mirror the actual D&D 5e API structure and handle URL parameters

import { NextResponse } from 'next/server'

const DND_API_BASE_URL = 'https://www.dnd5eapi.co/api'

// Generic fetch function with error handling
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
  } catch (error) {
    console.error(`Failed to fetch from D&D API ${endpoint}:`, error)
    throw error
  }
}

// ============================================================================
// SPELLS API ROUTES
// ============================================================================

// GET /api/dnd5e/spells - Get all spells
export async function GET() {
  try {
    const data = await fetchFromDndApi('/spells')
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch spells' },
      { status: 500 }
    )
  }
}
