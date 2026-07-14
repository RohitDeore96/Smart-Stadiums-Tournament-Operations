/**
 * @file api/_mock/stadiumData.ts
 * @description API-side copy of mock stadium data for tool dispatchers.
 *   Kept separate from apps/web/src/services/mockData.ts because the
 *   Vercel serverless function cannot import from the web workspace.
 *   In production, tool dispatchers would query Firestore directly.
 */

export interface MockZone {
  id: string;
  name: string;
  type: string;
  capacity: number;
}

export interface MockStadium {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity: number;
  zones: MockZone[];
}

export interface MockIncident {
  id: string;
  stadiumId: string;
  zoneId: string;
  reporterUid: string | null;
  category: 'medical' | 'security' | 'fire' | 'crowd_flow' | 'lost_child' | 'facilities' | 'other';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  assignedResponderUid: string | null;
  resolutionNotes: string | null;
}

export const MOCK_STADIUM: MockStadium = {
  id: 'st_metlife',
  name: 'MetLife Stadium',
  city: 'New York/New Jersey',
  country: 'USA',
  capacity: 82500,
  zones: [
    { id: 'gate_a', name: 'Gate A', type: 'gate', capacity: 5000 },
    { id: 'gate_b', name: 'Gate B', type: 'gate', capacity: 5000 },
    { id: 'gate_c', name: 'Gate C', type: 'gate', capacity: 5000 },
    { id: 'gate_d', name: 'Gate D', type: 'gate', capacity: 5000 },
    { id: 'sec_100', name: 'Section 100', type: 'section', capacity: 2000 },
    { id: 'sec_200', name: 'Section 200', type: 'section', capacity: 2000 },
    { id: 'sec_300', name: 'Section 300', type: 'section', capacity: 2000 },
    { id: 'sec_400', name: 'Section 400', type: 'section', capacity: 2000 },
    { id: 'concourse_north', name: 'Concourse North', type: 'concourse', capacity: 8000 },
    { id: 'concourse_south', name: 'Concourse South', type: 'concourse', capacity: 8000 },
    { id: 'food_court', name: 'Food Court', type: 'food', capacity: 3000 },
    { id: 'first_aid', name: 'First Aid Station', type: 'first_aid', capacity: 200 },
  ],
};

export const MOCK_INCIDENTS: MockIncident[] = [
  {
    id: 'inc_001',
    stadiumId: 'st_metlife',
    zoneId: 'sec_200',
    reporterUid: null,
    category: 'medical',
    title: 'Fan feeling faint',
    description: 'Older gentleman in row 12 appears dehydrated, conscious and responsive.',
    severity: 'medium',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    assignedResponderUid: 'resp_01',
    resolutionNotes: null,
  },
  {
    id: 'inc_002',
    stadiumId: 'st_metlife',
    zoneId: 'gate_b',
    reporterUid: null,
    category: 'crowd_flow',
    title: 'Long queue at Gate B',
    description: 'Queue extending past the ticket check, ~200 people waiting. Gate A has capacity.',
    severity: 'low',
    status: 'open',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    assignedResponderUid: null,
    resolutionNotes: null,
  },
  {
    id: 'inc_003',
    stadiumId: 'st_metlife',
    zoneId: 'food_court',
    reporterUid: null,
    category: 'facilities',
    title: 'Spill near food court',
    description: 'Drink spill near the food court entrance, slippery floor.',
    severity: 'low',
    status: 'resolved',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    assignedResponderUid: 'resp_02',
    resolutionNotes: 'Cleaned up by facilities team. Sign placed.',
  },
];
