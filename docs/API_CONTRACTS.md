# StadiumOps AI — API Contracts

> REST API contract for the Vercel serverless deployment.

## 1. Conventions

### Base URL

- Local dev: `http://localhost:3000/api`
- Production: `https://smart-stadiums-tournament-operation-nine.vercel.app/api`

### Auth

Currently no authentication (public demo). All endpoints are publicly callable.
Rate limited at 30 requests per minute per IP.

### Standard success envelope

```json
{
  "data": { ... }
}
```

### Standard error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "message: Message too long (max 2000 chars)",
    "details": { "field": "message" }
  }
}
```

### HTTP status codes used

| Code | Meaning                         |
| ---- | ------------------------------- |
| 200  | Success (or SSE stream started) |
| 400  | Validation error (Zod failed)   |
| 405  | Method not allowed              |
| 429  | Rate limited                    |
| 500  | Internal error                  |

---

## 2. Endpoints

### `GET /api/health`

**Response 200:**

```json
{
  "data": {
    "status": "ok",
    "service": "stadiumops-api",
    "version": "0.3.0",
    "time": "2026-07-14T...",
    "cache": { "size": 0, "ttlMs": 300000 }
  }
}
```

---

### `POST /api/chat`

Streams an assistant reply token-by-token via Server-Sent Events.

**Headers:**

```
Content-Type: application/json
Accept: text/event-stream
```

**Request body** (validated by `ChatMessageSchema`):

```json
{
  "message": "Where is the nearest restroom from Section 312?",
  "sessionId": "sess_abc123",
  "locale": "en",
  "stadiumId": "st_metlife",
  "matchId": "m03"
}
```

**Response:** `Content-Type: text/event-stream`

SSE events:

```
event: token
data: {"type":"token","value":"The nearest"}

event: token
data: {"type":"token","value":" restroom"}

event: metadata
data: {"type":"metadata","intent":"facility_info","confidence":0.85,"suggestedActions":[...],"emergencyEscalated":false}

event: done
data: {"type":"done","messageId":"msg_xyz","tokenUsage":{"promptTokens":486,"completionTokens":63,"totalTokens":549}}
```

**Error events:**

```
event: error
data: {"type":"error","code":"RATE_LIMITED","message":"Too many requests"}
```

---

### `GET /api/diagnostics`

Returns Gemini API key status and model availability (no key value exposed).

**Response 200:**

```json
{
  "data": {
    "service": "stadiumops-api",
    "gemini": {
      "keySet": true,
      "isValidFormat": true,
      "keyType": "AI Studio newer (AQ....) ⚠️",
      "apiTest": {
        "status": "success ✅",
        "workingModel": "gemini-flash-latest"
      }
    }
  }
}
```

---

## 3. Rate limits

| Endpoint               | Limit  |
| ---------------------- | ------ |
| `GET /api/health`      | 30/min |
| `POST /api/chat`       | 30/min |
| `GET /api/diagnostics` | 30/min |

Rate limit headers on every response:

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 28
```
