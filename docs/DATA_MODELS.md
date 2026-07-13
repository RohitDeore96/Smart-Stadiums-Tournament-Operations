# StadiumOps AI — Firestore Data Models

> Phase 1 schema design. All collection paths, document shapes, indexes, and access patterns.

## 1. Collections overview

```
users/{uid}
matches/{matchId}
stadiums/{stadiumId}
stadiums/{stadiumId}/crowdZones/{zoneId}     ← subcollection
incidents/{incidentId}
chatSessions/{sessionId}
chatSessions/{sessionId}/messages/{messageId} ← subcollection
announcements/{announcementId}
```

## 2. Document shapes

### `users/{uid}` — created on first sign-in via Cloud Function trigger

```ts
{
  uid: string,                  // == document ID
  email: string,                // from Firebase Auth
  displayName: string | null,
  preferredLocale: Locale,      // 'en' | 'es' | 'fr' | …
  role: UserRole,               // 'fan' | 'staff' | 'responder' | 'admin'
  homeStadiumId: string | null, // for staff — pins their dashboard
  createdAt: ISODateString,
  lastSeenAt: ISODateString,
  disabled: boolean             // soft-disable; admin-only
}
```

**Access pattern:** read by `uid` (1 doc read). Updated on every login.

---

### `stadiums/{stadiumId}` — pre-seeded via admin script

```ts
{
  id: string,
  name: string,                  // "MetLife Stadium"
  city: string,
  country: string,
  capacity: number,
  location: { latitude: number, longitude: number },
  zones: StadiumZone[],          // embedded array (small, rarely changes)
  primaryLocales: Locale[],
  createdAt: ISODateString,
  updatedAt: ISODateString
}
```

**Access pattern:** read by `stadiumId` (1 doc read). Cached client-side for 1 hour.

---

### `stadiums/{stadiumId}/crowdZones/{zoneId}` — high-write

```ts
{
  zoneId: string,
  stadiumId: string,
  count: number,                 // estimated people in zone
  densityRatio: number,          // count / zone.capacity
  level: CrowdLevel,             // 'low' | 'moderate' | 'high' | 'critical'
  updatedAt: ISODateString,
  trend: 'rising' | 'stable' | 'falling'  // computed by ingest worker
}
```

**Write rate:** 1 write per zone per 30s = ~120 writes/min per stadium.
**Read pattern:** `where("stadiumId","==",X)` — covered by composite index.

---

### `matches/{matchId}` — pre-seeded

```ts
{
  id: string,
  matchNumber: string,           // "M03"
  homeTeam: string,
  awayTeam: string,
  stadiumId: string,
  kickoffTimeUTC: ISODateString,
  score: { home: number, away: number } | null,
  status: MatchStatus,
  stage: string
}
```

**Access pattern:** `where("stadiumId","==",X).orderBy("kickoffTimeUTC")` — composite index declared in `firestore.indexes.json`.

---

### `incidents/{incidentId}` — created by fans and responders

```ts
{
  id: string,
  stadiumId: string,
  zoneId: string,
  reporterUid: string | null,    // null if anonymous kiosk
  category: IncidentCategory,
  title: string,                 // max 140
  description: string,           // max 1000
  severity: IncidentSeverity,
  status: IncidentStatus,
  createdAt: ISODateString,
  updatedAt: ISODateString,
  assignedResponderUid: string | null,
  resolutionNotes: string | null
}
```

**Access patterns:**

1. Open incidents by stadium: `where("stadiumId","==",X).where("status","==","open").orderBy("createdAt","desc")` → indexed.
2. Assigned to responder: `where("assignedResponderUid","==",X).where("status","in",[...])` → indexed.

---

### `chatSessions/{sessionId}` — one per conversation

```ts
{
  id: string,
  userId: string,
  stadiumId: string | null,
  matchId: string | null,
  locale: Locale,
  createdAt: ISODateString,
  updatedAt: ISODateString,
  lastMessagePreview: string | null,  // first 100 chars of last user msg
  archived: boolean
}
```

**Access pattern:** list user's recent sessions: `where("userId","==",X).orderBy("updatedAt","desc")` → indexed.

---

### `chatSessions/{sessionId}/messages/{messageId}` — subcollection

```ts
{
  id: string,
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  locale: Locale,
  createdAt: ISODateString,
  tokenUsage?: { promptTokens, completionTokens, totalTokens }
}
```

**Access pattern:** `where("sessionId","==",X).orderBy("createdAt").limit(50)` for history pagination.

---

### `announcements/{announcementId}` — admin-published, fan-read

```ts
{
  id: string,
  stadiumId: string,
  matchId: string | null,
  severity: 'info' | 'warning' | 'emergency',
  // Localized text — keyed by Locale
  text: Record<Locale, string>,
  publishedAt: ISODateString,
  expiresAt: ISODateString | null,
  active: boolean
}
```

**Access pattern:** `where("stadiumId","==",X).where("active","==",true)` — simple composite.

## 3. Data sizing estimates (per tournament day)

| Collection       | Est. docs/day | Est. reads/day | Est. writes/day |
| ---------------- | ------------- | -------------- | --------------- |
| users            | 50,000        | 100,000        | 50,000          |
| matches          | 3             | 200,000        | 12 (status)     |
| stadiums         | 16            | 200,000        | 0               |
| crowdZones       | 1,000         | 500,000        | 1,440,000       |
| incidents        | 200           | 50,000         | 1,000           |
| chatSessions     | 30,000        | 60,000         | 30,000          |
| chatSession msgs | 300,000       | 100,000        | 300,000         |
| announcements    | 20            | 500,000        | 40              |

**Free-tier fit (dev):** all well within 50k reads / 20k writes per day.
**Prod:** estimate ~$15-25/day on Blaze plan during the tournament.

## 4. Migration strategy

- **Schema versioning:** every doc has implicit `schemaVersion: 1` (add field; backfill via admin script).
- **Backward compat:** new fields are always optional; reads use `?? defaults`.
- **Backfill pattern:** Admin SDK script in `scripts/` iterates in batches of 500, no transaction needed for additive fields.
