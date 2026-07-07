# StadiumOps AI — API Contracts

> Phase 1 REST API contract. All endpoints are versioned `/api/v1/*` and return the standard envelope from `@stadiumops/shared`.

## 1. Conventions

### Base URL

- Local dev: `http://localhost:8080/api/v1`
- Cloud Run: `https://stadiumops-api-<hash>-<region>.a.run.app/api/v1`

### Auth

Every protected endpoint requires:

```
Authorization: Bearer <firebase-id-token>
```

The ID token is a Firebase Auth JWT (1-hour TTL). The backend verifies via Firebase Admin SDK.

### Standard success envelope

```json
{
  "data": { … },
  "meta": { "nextCursor": "...", "pageSize": 20, "hasMore": false }
}
```

### Standard error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "message: Message too long (max 2000 chars)",
    "details": { "field": "message" },
    "requestId": "req_abc123"
  }
}
```

### HTTP status codes used

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| 200  | Success                                        |
| 201  | Created                                        |
| 204  | No content (successful delete/update)          |
| 400  | Validation error (Zod failed)                  |
| 401  | Missing or invalid auth token                  |
| 403  | Authenticated but not allowed (role)           |
| 404  | Resource not found                             |
| 422  | Semantic error (e.g. invalid state transition) |
| 429  | Rate limited                                   |
| 500  | Internal error (logged with requestId)         |
| 503  | Upstream (Gemini/Firestore) unavailable        |

---

## 2. Endpoints

### 2.1 Health (no auth)

#### `GET /api/v1/health`

**Response 200:**

```json
{
  "data": {
    "status": "ok",
    "service": "stadiumops-api",
    "version": "0.1.0",
    "time": "2026-06-12T15:30:00.000Z"
  }
}
```

---

### 2.2 Chat (streaming via SSE)

#### `POST /api/v1/chat`

Streams an assistant reply token-by-token. The connection stays open until a `done` event is sent.

**Headers:**

```
Authorization: Bearer <id-token>
Content-Type: application/json
Accept: text/event-stream
```

**Request body** (validated by `ChatMessageSchema`):

```json
{
  "message": "Where is the nearest restroom from Section 312?",
  "sessionId": "sess_abc123", // optional — creates new session if omitted
  "locale": "en", // BCP-47, default "en"
  "stadiumId": "st_metlife", // optional
  "matchId": "m03" // optional
}
```

**Response:** `Content-Type: text/event-stream`

Each event is `event: <type>\ndata: <json>\n\n`. Event types:

```
event: token
data: {"type":"token","value":"The nearest"}

event: token
data: {"type":"token","value":" restroom"}

event: token
data: {"type":"token","value":" is on the"}

event: metadata
data: {"type":"metadata","intent":"facility_info","confidence":0.92,"suggestedActions":[{"type":"show_route","label":"Show route","payload":{"destination":"restroom_312_north"}}],"emergencyEscalated":false}

event: done
data: {"type":"done","messageId":"msg_xyz","tokenUsage":{"promptTokens":182,"completionTokens":34,"totalTokens":216}}
```

**Errors** (sent as event):

```
event: error
data: {"type":"error","code":"SAFETY_FILTER","message":"Your message was flagged. A responder has been notified."}
```

**Validation errors** return normal JSON (not SSE) with 400 status before streaming begins.

---

### 2.3 Matches

#### `GET /api/v1/matches?stadiumId=…&status=…&cursor=…&limit=20`

**Query params:**

- `stadiumId` (optional) — filter by stadium
- `status` (optional) — `scheduled` | `live` | `completed`
- `cursor` (optional) — opaque pagination cursor
- `limit` (optional, default 20, max 50)

**Response 200:**

```json
{
  "data": [
    {
      "id": "m03",
      "matchNumber": "M03",
      "homeTeam": "Mexico",
      "awayTeam": "Canada",
      "stadiumId": "st_metlife",
      "kickoffTimeUTC": "2026-06-12T00:00:00.000Z",
      "score": null,
      "status": "scheduled",
      "stage": "Group A"
    }
  ],
  "meta": {
    "nextCursor": "eyJpZCI6Im0wMyJ9",
    "pageSize": 20,
    "hasMore": true
  }
}
```

#### `GET /api/v1/matches/{matchId}`

Returns a single match document. **404** if not found.

---

### 2.4 Stadiums

#### `GET /api/v1/stadiums`

Returns all 16 host stadiums (small dataset, no pagination needed).

#### `GET /api/v1/stadiums/{stadiumId}`

Returns single stadium with embedded zones.

#### `GET /api/v1/stadiums/{stadiumId}/crowd?zoneType=…`

Returns latest crowd reading per zone.

**Response 200:**

```json
{
  "data": [
    {
      "zoneId": "zone_gate_a",
      "stadiumId": "st_metlife",
      "count": 1240,
      "densityRatio": 0.62,
      "level": "moderate",
      "updatedAt": "2026-06-12T15:29:30.000Z",
      "trend": "rising"
    }
  ]
}
```

---

### 2.5 Incidents

#### `POST /api/v1/incidents`

**Request body** (validated by `IncidentCreateSchema`):

```json
{
  "stadiumId": "st_metlife",
  "zoneId": "zone_sec_312",
  "category": "medical",
  "title": "Fan feeling faint",
  "description": "Older gentleman in row 12 appears dehydrated, conscious.",
  "severity": "medium"
}
```

**Response 201:**

```json
{
  "data": {
    "id": "inc_abc123",
    "status": "open",
    "reporterUid": "uid_xyz",
    "createdAt": "2026-06-12T15:30:00.000Z",
    "updatedAt": "2026-06-12T15:30:00.000Z",
    "assignedResponderUid": null,
    "resolutionNotes": null,
    "…": "…all fields from request…"
  }
}
```

#### `GET /api/v1/incidents?stadiumId=…&status=open&cursor=…&limit=20`

Paginated list. Requires `responder` or `admin` role for non-own incidents.

#### `PATCH /api/v1/incidents/{incidentId}`

**Request body** (validated by `IncidentUpdateSchema`):

```json
{ "status": "in_progress", "assignedResponderUid": "uid_resp_01" }
```

Requires `responder` or `admin` role.

---

### 2.6 Announcements

#### `GET /api/v1/announcements?stadiumId=…&active=true`

Returns active announcements for a stadium, localized by `Accept-Language` header.

**Response 200:**

```json
{
  "data": [
    {
      "id": "ann_001",
      "stadiumId": "st_metlife",
      "severity": "info",
      "text": "Gates open at 5:00 PM",
      "publishedAt": "2026-06-12T10:00:00.000Z",
      "expiresAt": "2026-06-12T17:00:00.000Z"
    }
  ]
}
```

---

### 2.7 Chat session history

#### `GET /api/v1/chat/sessions`

Lists the current user's chat sessions, most recent first.

#### `GET /api/v1/chat/sessions/{sessionId}/messages?cursor=…&limit=50`

Returns messages for a session, paginated. Caller must own the session (403 otherwise).

---

## 3. Rate limits

| Endpoint          | Anonymous | Authenticated |
| ----------------- | --------- | ------------- |
| `GET /health`     | 60/min    | 60/min        |
| `POST /chat`      | —         | 30/min        |
| `POST /incidents` | —         | 10/min        |
| `GET /*`          | —         | 120/min       |

Rate limit headers returned on every response:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1718209860
```

## 4. CORS

Allowed origins (configured via `ALLOWED_ORIGINS` env var):

- Dev: `http://localhost:5173`
- Prod: `https://stadiumops-ai.web.app`, `https://stadiumops-ai.firebaseapp.com`

Preflight `OPTIONS` cached for 1 hour.

## 5. Versioning & deprecation

- API version in URL path (`/api/v1/`).
- Breaking changes ship as `/api/v2/` and run in parallel for 90 days.
- Deprecation announced via `Sunset` response header.
