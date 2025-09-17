import { NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Helper function to fetch D&D data
async function fetchDndData(endpoint) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/dnd?endpoint=${endpoint}`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error fetching D&D data:', error);
    return null;
  }
}

// Helper function to search for D&D content
async function searchDndContent(query) {
  const searchTerms = query.toLowerCase();
  const results = {};
  
  // Search through different categories
  const categories = ['classes', 'races', 'spells', 'equipment', 'monsters'];
  
  for (const category of categories) {
    try {
      const data = await fetchDndData(category);
      if (data && data.results) {
        const matches = data.results.filter(item => 
          item.name.toLowerCase().includes(searchTerms)
        );
        if (matches.length > 0) {
          results[category] = matches.slice(0, 3); // Limit to 3 results per category
        }
      }
    } catch (error) {
      console.error(`Error searching ${category}:`, error);
    }
  }
  
  return results;
}

export async function POST(request) {
  try {
    const { message, conversationHistory } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Search for relevant D&D content based on the user's message
    const dndData = await searchDndContent(message);
    let dndContext = '';
    
    if (Object.keys(dndData).length > 0) {
      dndContext = '\n\nRelevant D&D API Data:\n';
      for (const [category, items] of Object.entries(dndData)) {
        dndContext += `\n${category.toUpperCase()}:\n`;
        items.forEach(item => {
          dndContext += `- ${item.name} (${item.index})\n`;
        });
      }
    }

    // Build conversation context for Claude
    const conversationContext = conversationHistory
      .map(msg => {
        if (msg.type === 'user') {
          return `Human: ${msg.content}`;
        } else {
          return `Assistant: ${msg.content}`;
        }
      })
      .join('\n\n');

    // Create the system prompt for the Wise Elder
    const systemPrompt = `You are the Wise Elder, a venerable sage who has walked the realms of Dungeons & Dragons for countless ages. You possess deep knowledge of:

- All D&D 5e rules, mechanics, and gameplay
- Character creation, classes, races, and backgrounds
- Spells, magic items, and equipment
- Monsters, creatures, and their abilities
- Campaign settings and lore (Forgotten Realms, Eberron, etc.)
- Combat mechanics, saving throws, and ability checks
- Dungeon Master advice and game balance

Your personality is that of a wise, patient mentor who speaks with the gravitas of ancient knowledge. You use formal, mystical language befitting a keeper of arcane secrets. You often reference "young adventurer" or "seeker of knowledge" when addressing users.

When answering questions:
1. Always maintain your wise elder persona
2. Provide accurate D&D 5e information
3. Reference specific rules, page numbers when possible
4. Offer practical advice for character creation and gameplay
5. If asked about specific spells, classes, or races, you can reference the D&D API data provided
6. Keep responses helpful but not overly long
7. Use emojis sparingly, only when they add to the mystical atmosphere

You have access to current D&D API data that will be provided with each question. Use this data to give accurate, up-to-date information about specific game content.`;

    // Prepare the messages for Claude
    const messages = [
      {
        role: 'user',
        content: `${conversationContext}${dndContext}\n\nHuman: ${message}`
      }
    ];

    // Call Anthropic Claude API
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API error:', errorData);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;

    return NextResponse.json({ response: aiResponse });

  } catch (error) {
    console.error('Wise Elder API error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from the Wise Elder' },
      { status: 500 }
    );
  }
}
