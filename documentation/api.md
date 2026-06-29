# RTCars — API Reference

Base URL: `http://localhost:4000/api/v1`  
Interactive docs (Swagger UI): `http://localhost:4000/api/docs`

---

## Errors & rate limiting

Error responses use Nest's standard shape: `{ "statusCode", "message", "error" }`.

| Code | When |
|---|---|
| `400` | Validation failure (invalid/unknown query or body params) |
| `401` | Missing/invalid JWT on a protected route |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate favorite/email; DB unique violation) |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error (details logged server-side, not leaked) |

Database errors are mapped to meaningful codes by a global Prisma exception filter
(`P2002→409`, `P2025→404`, `P2003/P2000→400`).

**Rate limit:** 100 requests per minute per client (in-memory). Exceeding it returns `429`
with a `Retry-After` header.

---

## Vehicles

### GET /vehicles

Returns paginated list of vehicles with filtering.

**Query params:**

| Param | Type | Example |
|---|---|---|
Defaults to active lots only (`isActive=true`) unless `isActive=false` is passed.

| Param | Type | Example |
|---|---|---|
| `page` | number (default 1) | `1` |
| `limit` | number (default 24, max 100) | `24` |
| `make` | string (exact, case-insensitive) | `FORD` |
| `model` | string (exact, case-insensitive) | `FUSION` |
| `yearMin` | number | `2015` |
| `yearMax` | number | `2022` |
| `damageMain` | string (partial) | `Front End` |
| `location` | string (partial) | `Dallas` |
| `sourceId` | number | `1` |
| `vin` | string (partial) | `1HGBH41JXMN109186` |
| `fuelType` | string | `Electric` |
| `transmission` | string | `Automatic` |
| `bodyStyle` | string | `SUV` |
| `driveType` | string | `AWD` |
| `color` | string | `Black` |
| `keysPresent` | boolean | `true` |
| `runAndDrive` | boolean | `true` |
| `isActive` | boolean (default true) | `false` |
| `sortBy` | `auctionDate\|currentBid\|year` | `auctionDate` |
| `sortOrder` | `asc\|desc` | `asc` |
| `search` | string (matches make/model/trim/lot#) | `honda civic` |

Unknown query params are rejected with `400`.

**Response** (`Decimal` fields like `currentBid` are serialised as strings):
```json
{
  "data": [
    {
      "id": 149,
      "sourceId": 1,
      "make": "FORD",
      "model": "FUSION",
      "year": 2019,
      "vin": "3FA6P0HD6KR******",
      "currentBid": "1700",
      "auctionDate": "2026-06-30T16:00:00.000Z",
      "location": "TX - DALLAS SOUTH",
      "damageMain": "MINOR DENT/SCRATCHES",
      "imageUrls": ["https://..."],
      "isActive": true,
      "source": { "slug": "copart", "name": "Copart" }
    }
  ],
  "total": 360,
  "page": 1,
  "limit": 24,
  "totalPages": 15
}
```

---

### GET /vehicles/:id

Returns full vehicle details including all images and specs.

---

### GET /vehicles/:id/bid-history

Returns bid history for the auction chart.

Ascending by `recordedAt`. `bid` is serialised as a string.

```json
[
  { "id": 30, "bid": "1200", "recordedAt": "2026-04-10T08:00:00Z" },
  { "id": 31, "bid": "1800", "recordedAt": "2026-04-10T12:00:00Z" },
  { "id": 32, "bid": "3200", "recordedAt": "2026-04-10T16:00:00Z" }
]
```

---

## Auth

### POST /auth/register
```json
{ "email": "user@example.com", "password": "...", "name": "John" }
```

### POST /auth/login
```json
{ "email": "user@example.com", "password": "..." }
```

Both return access token in response + set `refreshToken` in httpOnly cookie.

### POST /auth/refresh
Uses `refreshToken` cookie. Returns new access token.

### POST /auth/logout
Invalidates refresh token.

---

## Users

All require `Authorization: Bearer <accessToken>`.

### GET /users/me
Returns current user profile.

### GET /users/me/favorites
Returns paginated list of saved vehicles.

### POST /users/me/favorites/:vehicleId
Adds vehicle to favorites.

### DELETE /users/me/favorites/:vehicleId
Removes vehicle from favorites.

---

## Fees

### GET /fees/calculate

Calculates total cost including all Copart/IAA fees.

**Params:** `?sourceId=copart&bid=5000`

**Response:**
```json
{
  "bid": 5000,
  "buyerFee": 499,
  "titleFee": 20,
  "environmentalFee": 10,
  "total": 5529
}
```

---

## Admin

Require admin role.

### POST /admin/scrape/:sourceId
Manually triggers a scrape job. `sourceId` = `copart` | `iaa`.

### GET /admin/scrape-jobs
Returns history of all scrape runs with status, item counts, and errors.

---

## Error Responses

All errors follow the NestJS default format:
```json
{
  "statusCode": 404,
  "message": "Vehicle not found",
  "error": "Not Found"
}
```
