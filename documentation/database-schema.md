# RTCars — Database Schema

Full Prisma schema. File lives at `backend/src/prisma/schema.prisma`.

---

## Entities

### Source

Represents an auction platform. First-class entity — adding a new scraper source is an INSERT, not a code change.

```prisma
model Source {
  id       String    @id   // "copart" | "iaa" | "copart-korea" etc.
  name     String          // "Copart", "IAA"
  baseUrl  String
  country  String    @default("US")
  currency String    @default("USD")
  isActive Boolean   @default(true)
  vehicles Vehicle[]
}
```

**Seed data:**
```sql
INSERT INTO "Source" VALUES ('copart', 'Copart', 'https://www.copart.com', 'US', 'USD', true);
INSERT INTO "Source" VALUES ('iaa',    'IAA',    'https://www.iaai.com',   'US', 'USD', true);
```

---

### Vehicle

Core entity. Populated by scrapers via `upsert` on `(sourceId, externalId)`.

```prisma
model Vehicle {
  id              String    @id @default(cuid())
  externalId      String                          // Lot number from source
  sourceId        String
  source          Source    @relation(fields: [sourceId], references: [id])

  // Identity
  vin             String?
  make            String
  model           String
  year            Int
  trim            String?

  // Specs
  odometer        Int?
  odometerUnit    String    @default("mi")        // "mi" | "km"
  fuelType        String?                          // "Gasoline"|"Diesel"|"Electric"|"Hybrid"|"Flex"
  transmission    String?                          // "Automatic"|"Manual"|"CVT"
  engineType      String?                          // "Gas"|"Diesel"|"Electric"|"Hybrid"
  engineDisplacement Float?                       // Litres: 2.0, 3.5
  cylinders       Int?
  driveType       String?                          // "FWD"|"RWD"|"AWD"|"4WD"
  bodyStyle       String?                          // "Sedan"|"SUV"|"Truck"|"Coupe"|"Van"|"Convertible"|"Wagon"
  color           String?
  keysPresent     Boolean?
  runAndDrive     Boolean?

  // Condition
  primaryDamage   String?
  secondaryDamage String?
  condition       String?                          // "Run and Drive", "Enhanced Vehicle" etc.

  // Auction
  auctionDate     DateTime
  auctionLocation String
  currentBid      Decimal?  @db.Decimal(10, 2)
  buyNowPrice     Decimal?  @db.Decimal(10, 2)
  estimatedValue  Decimal?  @db.Decimal(10, 2)
  currency        String    @default("USD")
  saleType        String?                          // "Regular" | "Pure Sale"

  // Media
  images          String[]                         // PostgreSQL array of image URLs from source
  thumbnailUrl    String?

  // Meta
  detailUrl       String                           // Link back to original listing
  isActive        Boolean   @default(true)         // Set to false when auction ends
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  favorites    Favorite[]
  bidHistory   BidHistory[]

  @@unique([sourceId, externalId])                 // Prevents duplicates across scrape runs
  @@index([make, model, year])
  @@index([auctionDate])
  @@index([isActive])
  @@index([vin])
}
```

---

### BidHistory

Stores `currentBid` snapshots over time. Populated during scrape runs when `currentBid` changes. Powers the bid history chart on vehicle detail page.

```prisma
model BidHistory {
  id          String   @id @default(cuid())
  vehicleId   String
  vehicle     Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  bid         Decimal  @db.Decimal(10, 2)
  recordedAt  DateTime @default(now())

  @@index([vehicleId, recordedAt])
}
```

---

### User

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  name         String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  favorites     Favorite[]
  refreshTokens RefreshToken[]
}
```

---

### RefreshToken

Stored in DB for revocation support (logout invalidates the token).

```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

---

### Favorite

Many-to-many between User and Vehicle via explicit join table.

```prisma
model Favorite {
  id        String   @id @default(cuid())
  userId    String
  vehicleId String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  vehicle   Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, vehicleId])
}
```

---

### ScrapeJob

Audit trail for scraping runs. Allows monitoring health of scrapers without external tooling.

```prisma
model ScrapeJob {
  id           String       @id @default(cuid())
  sourceId     String
  status       ScrapeStatus @default(PENDING)
  startedAt    DateTime?
  completedAt  DateTime?
  itemsFound   Int?
  itemsNew     Int?
  errorMessage String?
  createdAt    DateTime     @default(now())
}

enum ScrapeStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}
```

---

## Design Notes

- **Images as `String[]`** — PostgreSQL native array avoids a join table for an ordered list of URLs. Images are served directly from Copart/IAA CDN (not re-hosted).
- **`@@unique([sourceId, externalId])`** — safe to re-run scrapers at any frequency; upsert by this key prevents duplicates.
- **`@@index([vin])`** — allows fast VIN search without full-text.
- **No enum for fuelType/transmission/etc.** — stored as nullable strings. Values vary between sources; enforcing a DB enum would require migrations when a new source introduces a new value.
