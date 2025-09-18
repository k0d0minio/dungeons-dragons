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
    const { message, conversationHistory, character, context, additionalData, systemPrompt } = await request.json();

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
        if (msg.role === 'user') {
          return `Human: ${msg.content}`;
        } else {
          return `Assistant: ${msg.content}`;
        }
      })
      .join('\n\n');

    // Use provided system prompt or default
    let finalSystemPrompt = systemPrompt || `You are the Wise Elder, a venerable sage who has walked the realms of Dungeons & Dragons for countless ages. You possess deep knowledge of all D&D 5e rules, mechanics, and gameplay.

Always maintain your wise, patient mentor persona. Provide helpful, accurate D&D information.

When helping beginners:
- Explain concepts in simple, clear terms
- Provide step-by-step guidance
- Give concrete examples and scenarios
- Encourage creativity and experimentation
- Ask questions to understand their preferences
- Suggest beginner-friendly options
- Explain the "why" behind recommendations
- Use encouraging language and celebrate their choices`;

    // Add character building context if needed
    if (context === 'character_building' && !systemPrompt) {
      finalSystemPrompt += `

CHARACTER BUILDING MODE:
You are helping a player create their D&D character step by step. Your role is to:
1. Ask ONE question at a time to gather character information
2. Guide them through character creation in a logical order
3. Suggest appropriate choices based on their responses
4. When you have enough information, ask if they want to save the character

Current character data: ${JSON.stringify(character || {})}

Ask questions to fill in missing essential fields (name, class, race, level, background, alignment). 
When you have enough information, ask: "Would you like me to save this character to your sheet?"

If the player confirms they want to save, respond with: "SAVE_CHARACTER" and include the complete character data.`;
    } else if (context === 'character_advice') {
      finalSystemPrompt += `

CHARACTER ADVICE MODE:
The player has a completed character and wants advice on:
- Level-up strategies and ability score improvements
- Feat recommendations
- Equipment suggestions
- Combat tactics
- Roleplay opportunities
- Campaign preparation

Provide specific, actionable advice based on their character's current stats and abilities.`;
    } else if (context.startsWith('preparation_')) {
      const prepType = context.replace('preparation_', '');
      
      switch (prepType) {
        case 'character-building':
          finalSystemPrompt += `

PREPARATION MODE - CHARACTER BUILDING:
You're helping a beginner learn character creation. Focus on:
- Explaining what each stat does in simple terms
- Suggesting beginner-friendly race/class combinations
- Walking through the character sheet step by step
- Explaining how choices affect gameplay
- Encouraging them to think about their character's personality

Start by asking what kind of hero they want to be and what interests them most.`;
          break;

        case 'backstory-development':
          finalSystemPrompt += `

PREPARATION MODE - BACKSTORY DEVELOPMENT:
You're helping a beginner create a compelling backstory. Focus on:
- Asking about their character's past, motivations, and goals
- Suggesting story elements that connect to their class/race
- Providing examples of good backstory elements
- Helping them create NPCs and relationships
- Making their backstory relevant to the campaign

Start by asking about their character's origin or what drives them.`;
          break;

        case 'leveling-strategies':
          finalSystemPrompt += `

PREPARATION MODE - LEVELING STRATEGIES:
You're teaching a beginner about character advancement. Focus on:
- Explaining how leveling up works
- Suggesting good ability score improvements
- Recommending useful feats for their class
- Explaining multiclassing in simple terms
- Giving examples of how choices affect gameplay

Start by asking about their character's current level and what they want to improve.`;
          break;

        case 'game-mechanics':
          finalSystemPrompt += `

PREPARATION MODE - GAME MECHANICS:
You're teaching D&D basics to a beginner. Focus on:
- Explaining dice rolling and modifiers
- Teaching combat basics step by step
- Explaining ability scores and skills
- Covering saving throws and checks
- Providing examples and practice scenarios

Start by asking what they want to learn about first.`;
          break;

        case 'roleplay-examples':
          finalSystemPrompt += `

PREPARATION MODE - ROLEPLAY EXAMPLES:
You're helping a beginner learn to roleplay. Focus on:
- Teaching how to speak in character
- Providing dialogue examples
- Explaining how to interact with NPCs
- Giving tips for staying in character
- Encouraging creativity and confidence

Start by asking about their character's personality and how they want to roleplay.`;
          break;

        case 'overview':
        default:
          finalSystemPrompt += `

PREPARATION MODE - OVERVIEW:
You're a comprehensive D&D mentor helping beginners prepare for their first campaign. You can help with:
- Character creation and development
- Backstory writing and storytelling
- Understanding game mechanics
- Learning roleplay techniques
- Planning character advancement

Ask what they'd like to work on first, or suggest starting with character creation.`;
          break;
      }
    }

    finalSystemPrompt += `

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
        system: finalSystemPrompt,
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

    return NextResponse.json({ 
      success: true, 
      response: aiResponse 
    });

  } catch (error) {
    console.error('Wise Elder API error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from the Wise Elder' },
      { status: 500 }
    );
  }
}
