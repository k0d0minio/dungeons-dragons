// D&D 5e API service functions
const API_BASE_URL = '/api/dnd';

// Generic fetch function with error handling
async function fetchFromAPI(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}?endpoint=${encodeURIComponent(endpoint)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    throw error;
  }
}

// Fetch list of items (classes, races, spells, etc.)
export async function fetchList(endpoint) {
  return await fetchFromAPI(endpoint);
}

// Fetch specific item by index
export async function fetchItem(endpoint, index) {
  return await fetchFromAPI(`${endpoint}/${index}`);
}

// Fetch item by full URL (for related data)
export async function fetchByUrl(url) {
  // Remove the base URL if present to get just the endpoint
  const endpoint = url.replace('/api/2014/', '').replace('/api/', '');
  return await fetchFromAPI(endpoint);
}

// Fetch multiple items by their URLs
export async function fetchMultipleByUrls(urls) {
  const promises = urls.map(url => fetchByUrl(url));
  return await Promise.all(promises);
}

// Fetch multiple items by their indices
export async function fetchMultipleItems(endpoint, indices) {
  const promises = indices.map(index => fetchItem(endpoint, index));
  return await Promise.all(promises);
}

// Available D&D 5e API endpoints
export const DND_ENDPOINTS = {
  ABILITY_SCORES: 'ability-scores',
  ALIGNMENTS: 'alignments',
  BACKGROUNDS: 'backgrounds',
  CLASSES: 'classes',
  CONDITIONS: 'conditions',
  DAMAGE_TYPES: 'damage-types',
  EQUIPMENT_CATEGORIES: 'equipment-categories',
  EQUIPMENT: 'equipment',
  FEATURES: 'features',
  LANGUAGES: 'languages',
  MAGIC_ITEMS: 'magic-items',
  MAGIC_SCHOOLS: 'magic-schools',
  MONSTERS: 'monsters',
  PROFICIENCIES: 'proficiencies',
  RACES: 'races',
  RULE_SECTIONS: 'rule-sections',
  RULES: 'rules',
  SKILLS: 'skills',
  SPELLS: 'spells',
  STARTING_EQUIPMENT: 'starting-equipment',
  SUBCLASSES: 'subclasses',
  TRAITS: 'traits',
  WEAPON_PROPERTIES: 'weapon-properties'
};

// Helper function to get all available endpoints
export async function getAllEndpoints() {
  return await fetchFromAPI('');
}

// Helper function to fetch sample data from multiple endpoints
export async function fetchSampleData() {
  const endpoints = [
    'classes',
    'races', 
    'spells',
    'monsters',
    'equipment',
    'magic-items',
    'weapon-properties',
    'damage-types',
    'conditions',
    'skills'
  ];

  const sampleData = {};
  
  for (const endpoint of endpoints) {
    try {
      const data = await fetchList(endpoint);
      // Store both the full data and sample items
      sampleData[endpoint] = {
        count: data.count || 0,
        results: data.results?.slice(0, 5) || []
      };
    } catch (error) {
      console.error(`Failed to fetch ${endpoint}:`, error);
      sampleData[endpoint] = {
        count: 0,
        results: []
      };
    }
  }
  
  return sampleData;
}
