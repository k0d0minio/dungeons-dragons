// GET /api/dnd5e/equipment/[index] - Get specific equipment by index
import { NextRequest, NextResponse } from 'next/server'

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

export async function GET(
  _request: NextRequest,
  { params }: { params: { index: string } }
) {
  try {
    const { index } = params
    
    if (!index) {
      return NextResponse.json(
        { error: 'Equipment index is required' },
        { status: 400 }
      )
    }

    const data = await fetchFromDndApi(`/equipment/${index}`)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    )
  }
}
