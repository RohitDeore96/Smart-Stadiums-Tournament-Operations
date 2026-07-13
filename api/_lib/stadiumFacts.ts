/**
 * @file api/_lib/stadiumFacts.ts
 * @description RAG knowledge base — stadium-specific facts injected into
 *   the system prompt to ground Gemini responses and prevent hallucination.
 *   This is a lightweight "poor man's RAG" — static facts embedded directly
 *   rather than a vector index, which is appropriate for a single-stadium demo.
 */

export interface StadiumFact {
  category: 'gate' | 'restroom' | 'first_aid' | 'food' | 'parking' | 'section' | 'general';
  text: string;
}

/**
 * MetLife Stadium facts (FIFA World Cup 2026 host venue).
 * These are injected into the system prompt to ground the model's responses
 * in actual stadium data, reducing hallucination risk.
 */
export const STADIUM_FACTS: StadiumFact[] = [
  // Gates
  {
    category: 'gate',
    text: 'Gate A is located on the north side of the stadium, near the main ticket plaza and the Patriot Place entrance.',
  },
  {
    category: 'gate',
    text: 'Gate B is located on the east side, accessible from the parking lots via the pedestrian bridge.',
  },
  {
    category: 'gate',
    text: 'Gate C is located on the south side, near the train station and public transit stop.',
  },
  {
    category: 'gate',
    text: 'Gate D is located on the west side, near the VIP and premium seating entrance.',
  },

  // Restrooms
  {
    category: 'restroom',
    text: 'Restrooms are located on every concourse level (100, 200, 300) near sections 101, 112, 124, 201, 212, 224, 301, 312, 324.',
  },
  {
    category: 'restroom',
    text: 'Accessible/family restrooms are available near each gate and at first aid stations.',
  },
  {
    category: 'restroom',
    text: 'The nearest restrooms to Section 312 are on the 300-level concourse between sections 310 and 314.',
  },

  // First Aid
  {
    category: 'first_aid',
    text: 'First Aid stations are located near Gate A (Section 101), Gate C (Section 124), and on the 300-level near Section 312.',
  },
  {
    category: 'first_aid',
    text: 'There are 4 first aid stations total, staffed by licensed medical professionals during all events.',
  },

  // Food
  {
    category: 'food',
    text: 'Food courts are on the north concourse (near Section 112) and south concourse (near Section 124).',
  },
  {
    category: 'food',
    text: 'Concession stands are available throughout all concourse levels, offering hot dogs, burgers, pizza, vegetarian options, and beverages.',
  },
  {
    category: 'food',
    text: 'Water fountains are available near every restroom area on all levels.',
  },

  // Parking
  {
    category: 'parking',
    text: 'Parking lots are labeled P1 through P6. P1-P3 are closest to Gates A and B. P4-P6 are closer to Gates C and D.',
  },
  {
    category: 'parking',
    text: 'ADA accessible parking is available in Lot P1, closest to Gate A.',
  },

  // Sections
  {
    category: 'section',
    text: 'Section 100 level is the lower bowl (closest to the field). Section 200 is the club level. Section 300 is the upper bowl.',
  },
  {
    category: 'section',
    text: 'Sections 100-124 are on the north side. Sections 125-149 are on the south side. Lower numbers are on the east, higher on the west.',
  },

  // General
  {
    category: 'general',
    text: 'Stadium capacity is 82,500. The venue is located in East Rutherford, New Jersey, USA.',
  },
  {
    category: 'general',
    text: 'WiFi is available throughout the stadium. Network name: StadiumGuest. No password required.',
  },
  {
    category: 'general',
    text: 'ATMs are located near each gate and at the main concourse information desks.',
  },
];

/**
 * Returns formatted stadium facts for injection into the system prompt.
 * Grouped by category for readability.
 */
export function getStadiumFactsForPrompt(): string {
  const grouped: Record<string, string[]> = {};
  for (const fact of STADIUM_FACTS) {
    const cat = fact.category;
    grouped[cat] ??= [];
    grouped[cat].push(fact.text);
  }

  const sections: string[] = [];
  for (const [category, facts] of Object.entries(grouped)) {
    sections.push(`### ${category.toUpperCase()}`);
    for (const fact of facts) {
      sections.push(`- ${fact}`);
    }
  }

  return sections.join('\n');
}
