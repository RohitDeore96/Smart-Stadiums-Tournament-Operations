/**
 * @file scripts/seed-stadiums.ts
 * @description Admin SDK script to seed Firestore with the 16 FIFA World Cup
 *   2026 host stadiums. Run AFTER Firebase Admin SDK is configured in Phase 2.
 *
 *   Usage (Phase 2):
 *     npx tsx scripts/seed-stadiums.ts
 *
 *   Phase 1 note: this is a data-only script — it imports the Stadium type
 *   from @stadiumops/shared to prove the type contract. Execution requires
 *   the Admin SDK which arrives in Phase 2.
 */

import type { Stadium } from '../packages/shared/src/types/match.js';

const STADIA: Omit<Stadium, 'id'>[] = [
  {
    name: 'MetLife Stadium',
    city: 'New York/New Jersey',
    country: 'USA',
    capacity: 82500,
    location: { latitude: 40.8128, longitude: -74.0742 },
    primaryLocales: ['en', 'es'],
    zones: [
      { id: 'gate_a', name: 'Gate A', type: 'gate', capacity: 5000 },
      { id: 'gate_b', name: 'Gate B', type: 'gate', capacity: 5000 },
      { id: 'gate_c', name: 'Gate C', type: 'gate', capacity: 5000 },
      { id: 'gate_d', name: 'Gate D', type: 'gate', capacity: 5000 },
      { id: 'sec_100', name: 'Section 100', type: 'section', capacity: 2000 },
      { id: 'sec_200', name: 'Section 200', type: 'section', capacity: 2000 },
      { id: 'sec_300', name: 'Section 300', type: 'section', capacity: 2000 },
      { id: 'concourse_north', name: 'Concourse North', type: 'concourse', capacity: 8000 },
      { id: 'concourse_south', name: 'Concourse South', type: 'concourse', capacity: 8000 },
    ],
  },
  {
    name: 'SoFi Stadium',
    city: 'Los Angeles',
    country: 'USA',
    capacity: 70240,
    location: { latitude: 33.9535, longitude: -118.3388 },
    primaryLocales: ['en', 'es'],
    zones: [
      { id: 'gate_a', name: 'Gate A', type: 'gate', capacity: 4500 },
      { id: 'gate_b', name: 'Gate B', type: 'gate', capacity: 4500 },
    ],
  },
  {
    name: 'AT&T Stadium',
    city: 'Dallas',
    country: 'USA',
    capacity: 80000,
    location: { latitude: 32.7473, longitude: -97.0945 },
    primaryLocales: ['en', 'es'],
    zones: [],
  },
  {
    name: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
    country: 'USA',
    capacity: 71000,
    location: { latitude: 33.7554, longitude: -84.4011 },
    primaryLocales: ['en'],
    zones: [],
  },
  {
    name: 'Gillette Stadium',
    city: 'Boston',
    country: 'USA',
    capacity: 65000,
    location: { latitude: 42.0909, longitude: -71.2643 },
    primaryLocales: ['en', 'pt'],
    zones: [],
  },
  {
    name: 'Lincoln Financial Field',
    city: 'Philadelphia',
    country: 'USA',
    capacity: 67594,
    location: { latitude: 39.9008, longitude: -75.1674 },
    primaryLocales: ['en'],
    zones: [],
  },
  {
    name: "Levi's Stadium",
    city: 'San Francisco Bay Area',
    country: 'USA',
    capacity: 68500,
    location: { latitude: 37.403, longitude: -121.9696 },
    primaryLocales: ['en', 'es', 'zh'],
    zones: [],
  },
  {
    name: 'Lumen Field',
    city: 'Seattle',
    country: 'USA',
    capacity: 69000,
    location: { latitude: 47.5952, longitude: -122.3316 },
    primaryLocales: ['en'],
    zones: [],
  },
  {
    name: 'Arrowhead Stadium',
    city: 'Kansas City',
    country: 'USA',
    capacity: 76416,
    location: { latitude: 39.0487, longitude: -94.484 },
    primaryLocales: ['en'],
    zones: [],
  },
  {
    name: 'NRG Stadium',
    city: 'Houston',
    country: 'USA',
    capacity: 72000,
    location: { latitude: 29.6847, longitude: -95.4107 },
    primaryLocales: ['en', 'es'],
    zones: [],
  },
  {
    name: 'Hard Rock Stadium',
    city: 'Miami',
    country: 'USA',
    capacity: 65000,
    location: { latitude: 25.958, longitude: -80.2389 },
    primaryLocales: ['en', 'es', 'pt'],
    zones: [],
  },
  {
    name: 'BMO Field',
    city: 'Toronto',
    country: 'Canada',
    capacity: 45000,
    location: { latitude: 43.6232, longitude: -79.4176 },
    primaryLocales: ['en', 'fr'],
    zones: [],
  },
  {
    name: 'BC Place',
    city: 'Vancouver',
    country: 'Canada',
    capacity: 54500,
    location: { latitude: 49.2767, longitude: -123.112 },
    primaryLocales: ['en', 'fr', 'zh'],
    zones: [],
  },
  {
    name: 'Estadio Azteca',
    city: 'Mexico City',
    country: 'Mexico',
    capacity: 83000,
    location: { latitude: 19.3029, longitude: -99.1504 },
    primaryLocales: ['es'],
    zones: [],
  },
  {
    name: 'Estadio Akron',
    city: 'Guadalajara',
    country: 'Mexico',
    capacity: 48000,
    location: { latitude: 20.7128, longitude: -103.4274 },
    primaryLocales: ['es'],
    zones: [],
  },
  {
    name: 'Estadio BBVA',
    city: 'Monterrey',
    country: 'Mexico',
    capacity: 53500,
    location: { latitude: 25.7489, longitude: -100.2453 },
    primaryLocales: ['es'],
    zones: [],
  },
];

/**
 * Generates a stable stadium ID from name + city.
 * Stable IDs are important for foreign keys (matches reference stadiumId).
 */
function toStadiumId(name: string, city: string): string {
  const slug = `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `st_${slug}`;
}

async function main(): Promise<void> {
  const stadia: Stadium[] = STADIA.map((s) => ({
    ...s,
    id: toStadiumId(s.name, s.city),
    zones: s.zones.map((z) => ({ ...z, id: `${s.id}__${z.id}`.slice(0, 40) })),
  }));

  // eslint-disable-next-line no-console
  console.log(`Prepared ${stadia.length} stadia for seeding:`);
  for (const s of stadia) {
    // eslint-disable-next-line no-console
    console.log(`  • ${s.id}  →  ${s.name} (${s.city}, ${s.country})  capacity=${s.capacity}`);
  }

  // Phase 2: uncomment + complete the Firestore write block below.
  //
  // import admin from 'firebase-admin';
  // admin.initializeApp({ credential: admin.credential.applicationDefault() });
  // const db = admin.firestore();
  // const batch = db.batch();
  // for (const s of stadia) {
  //   batch.set(db.collection('stadiums').doc(s.id), {
  //     ...s,
  //     createdAt: admin.firestore.FieldValue.serverTimestamp(),
  //     updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  //   });
  // }
  // await batch.commit();
  // console.log('✓ Seeded all stadia');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
