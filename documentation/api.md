# RTCars — API Reference

Base URL: `http://localhost:4000/api/v1`  
Interactive docs (Swagger UI): `http://localhost:4000/api/docs`

---

## Vehicles

### GET /vehicles

Returns paginated list of vehicles with filtering.

**Query params:**

| Param | Type | Example |
|---|---|---|
| `page` | number | `1` |
| `limit` | number | `24` |
| `make` | string | `Toyota` |
| `model` | string | `Camry` |
| `yearMin` | number | `2015` |
| `yearMax` | number | `2022` |
| `damage` | string | `Front End` |
| `location` | string | `Los Angeles` |
| `sourceId` | string | `copart` |
| `vin` | string | `1HGBH41JXMN109186` |
| `fuelType` | string | `Electric` |
| `transmission` | string | `Automatic` |
| `engineType` | string | `Gas` |
| `engineDisplacement` | number | `2.0` |
| `bodyStyle` | string | `SUV` |
| `driveType` | string | `AWD` |
| `color` | string | `Black` |
| `keysPresent` | boolean | `true` |
| `runAndDrive` | boolean | `true` |
| `sortBy` | `auctionDate\|currentBid\|year` | `auctionDate` |
| `sortOrder` | `asc\|desc` | `asc` |
| `search` | string | `honda civic hatchback` |

**Response:**
```json
{
  "data": [
    {
      "id": "clx...",
      "make": "Toyota",
      "model": "Camry",
      "year": 2019,
      "vin": "4T1BF1FK0KU...",
      "currentBid": 3200,
      "auctionDate": "2026-04-15T14:00:00Z",
      "auctionLocation": "Los Angeles, CA",
      "primaryDamage": "Front End",
      "thumbnailUrl": "https://...",
      "sourceId": "copart",
      "isActive": true
    }
  ],
  "meta": {
    "total": 1420,
    "page": 1,
    "limit": 24,
    "totalPages": 60
  }
}
```

---

### GET /vehicles/:id

Returns full vehicle details including all images and specs.

---

### GET /vehicles/:id/bid-history

Returns bid history for the auction chart.

```json
[
  { "bid": 1200, "recordedAt": "2026-04-10T08:00:00Z" },
  { "bid": 1800, "recordedAt": "2026-04-10T12:00:00Z" },
  { "bid": 3200, "recordedAt": "2026-04-10T16:00:00Z" }
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
