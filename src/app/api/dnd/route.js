import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://www.dnd5eapi.co/api';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  
  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint parameter is required' }, { status: 400 });
  }

  // Try multiple API endpoints in case one is down
  const apiEndpoints = [
    'https://www.dnd5eapi.co/api',
    'https://dnd5eapi.co/api',
    'https://api.open5e.com'
  ];

  for (const baseUrl of apiEndpoints) {
    try {
      console.log(`Trying API endpoint: ${baseUrl}/${endpoint}`);
      
      const response = await fetch(`${baseUrl}/${endpoint}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; D&D-Reference-App/1.0)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(8000), // 8 second timeout
      });
      
      console.log(`Response status from ${baseUrl}: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully fetched data for endpoint: ${endpoint} from ${baseUrl}`);
        return NextResponse.json(data);
      } else {
        console.log(`HTTP error from ${baseUrl}: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error with ${baseUrl} for endpoint ${endpoint}:`, error.message);
      continue; // Try next endpoint
    }
  }

  // If all endpoints fail, return mock data for development
  console.log(`All API endpoints failed for ${endpoint}, returning mock data`);
  
  const mockData = {
    classes: {
      count: 12,
      results: [
        { index: "barbarian", name: "Barbarian", url: "/api/classes/barbarian" },
        { index: "bard", name: "Bard", url: "/api/classes/bard" },
        { index: "cleric", name: "Cleric", url: "/api/classes/cleric" },
        { index: "druid", name: "Druid", url: "/api/classes/druid" },
        { index: "fighter", name: "Fighter", url: "/api/classes/fighter" },
        { index: "monk", name: "Monk", url: "/api/classes/monk" },
        { index: "paladin", name: "Paladin", url: "/api/classes/paladin" },
        { index: "ranger", name: "Ranger", url: "/api/classes/ranger" },
        { index: "rogue", name: "Rogue", url: "/api/classes/rogue" },
        { index: "sorcerer", name: "Sorcerer", url: "/api/classes/sorcerer" },
        { index: "warlock", name: "Warlock", url: "/api/classes/warlock" },
        { index: "wizard", name: "Wizard", url: "/api/classes/wizard" }
      ]
    },
    races: {
      count: 9,
      results: [
        { index: "dragonborn", name: "Dragonborn", url: "/api/races/dragonborn" },
        { index: "dwarf", name: "Dwarf", url: "/api/races/dwarf" },
        { index: "elf", name: "Elf", url: "/api/races/elf" },
        { index: "gnome", name: "Gnome", url: "/api/races/gnome" },
        { index: "half-elf", name: "Half-Elf", url: "/api/races/half-elf" },
        { index: "half-orc", name: "Half-Orc", url: "/api/races/half-orc" },
        { index: "halfling", name: "Halfling", url: "/api/races/halfling" },
        { index: "human", name: "Human", url: "/api/races/human" },
        { index: "tiefling", name: "Tiefling", url: "/api/races/tiefling" }
      ]
    },
    spells: {
      count: 319,
      results: [
        { index: "acid-splash", name: "Acid Splash", url: "/api/spells/acid-splash" },
        { index: "aid", name: "Aid", url: "/api/spells/aid" },
        { index: "alarm", name: "Alarm", url: "/api/spells/alarm" },
        { index: "alter-self", name: "Alter Self", url: "/api/spells/alter-self" },
        { index: "animal-friendship", name: "Animal Friendship", url: "/api/spells/animal-friendship" }
      ]
    }
  };

  const mockResponse = mockData[endpoint] || { count: 0, results: [] };
  
  return NextResponse.json({
    ...mockResponse,
    _mock: true,
    _message: "Using mock data - D&D API is currently unavailable"
  });
}
