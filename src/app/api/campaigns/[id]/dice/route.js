import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { verifyToken } from '../../../../../lib/auth';

// Roll dice function
function rollDice(diceType) {
  // Parse dice notation like "1d20", "2d6+3", "1d4-1"
  const match = diceType.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) {
    throw new Error('Invalid dice notation');
  }

  const numDice = parseInt(match[1]);
  const diceSize = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;

  let total = 0;
  const rolls = [];

  for (let i = 0; i < numDice; i++) {
    const roll = Math.floor(Math.random() * diceSize) + 1;
    rolls.push(roll);
    total += roll;
  }

  return {
    rolls,
    modifier,
    total: total + modifier
  };
}

export async function POST(request, { params }) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const { diceType, reason, characterId, isPublic } = await request.json();

    if (!diceType) {
      return NextResponse.json({ success: false, error: 'Dice type is required' }, { status: 400 });
    }

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id }
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Roll the dice
    const rollResult = rollDice(diceType);

    // Save the roll to database
    const diceRoll = await prisma.diceRoll.create({
      data: {
        campaignId: params.id,
        userId: user.id,
        characterId: characterId || null,
        diceType,
        result: rollResult.rolls[0], // Store first die result
        modifier: rollResult.modifier,
        total: rollResult.total,
        reason: reason || null,
        isPublic: isPublic !== false // Default to public
      },
      include: {
        user: {
          select: { id: true, username: true }
        },
        character: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      roll: diceRoll,
      rollDetails: {
        diceType,
        rolls: rollResult.rolls,
        modifier: rollResult.modifier,
        total: rollResult.total
      }
    });

  } catch (error) {
    console.error('Error rolling dice:', error);
    return NextResponse.json({ success: false, error: 'Failed to roll dice' }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 20;

    // Get recent dice rolls for this campaign
    const diceRolls = await prisma.diceRoll.findMany({
      where: { 
        campaignId: params.id,
        isPublic: true // Only show public rolls
      },
      include: {
        user: {
          select: { id: true, username: true }
        },
        character: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json({ success: true, diceRolls });

  } catch (error) {
    console.error('Error fetching dice rolls:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch dice rolls' }, { status: 500 });
  }
}
