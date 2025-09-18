import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';

export async function GET(request) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // Get all campaigns (players can join any campaign)
    const campaigns = await prisma.campaign.findMany({
      include: {
        dm: {
          select: { id: true, username: true }
        },
        sessions: {
          orderBy: { sessionNumber: 'desc' },
          take: 1
        },
        _count: {
          select: { diceRolls: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ success: true, campaigns });

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // Only DMs can create campaigns
    if (user.role !== 'DM') {
      return NextResponse.json({ success: false, error: 'Only DMs can create campaigns' }, { status: 403 });
    }

    const { name, description, mode } = await request.json();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Campaign name is required' }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description: description || null,
        mode: mode || 'PREPARATION',
        dmId: user.id
      },
      include: {
        dm: {
          select: { id: true, username: true }
        }
      }
    });

    return NextResponse.json({ success: true, campaign });

  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ success: false, error: 'Failed to create campaign' }, { status: 500 });
  }
}
