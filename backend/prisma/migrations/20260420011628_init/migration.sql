-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "vin" TEXT,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "trim" TEXT,
    "bodyStyle" TEXT,
    "color" TEXT,
    "fuelType" TEXT,
    "transmission" TEXT,
    "driveType" TEXT,
    "engineSize" TEXT,
    "odometer" INTEGER,
    "damageMain" TEXT,
    "damageSec" TEXT,
    "keysPresent" BOOLEAN,
    "runAndDrive" BOOLEAN,
    "location" TEXT,
    "auctionDate" TIMESTAMP(3),
    "currentBid" DECIMAL(10,2),
    "buyNowPrice" DECIMAL(10,2),
    "imageUrls" TEXT[],
    "lotNumber" TEXT,
    "auctionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidHistory" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "bid" DECIMAL(10,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeJob" (
    "id" SERIAL NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemsCount" INTEGER,
    "error" TEXT,

    CONSTRAINT "ScrapeJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Source_slug_key" ON "Source"("slug");

-- CreateIndex
CREATE INDEX "Vehicle_make_idx" ON "Vehicle"("make");

-- CreateIndex
CREATE INDEX "Vehicle_model_idx" ON "Vehicle"("model");

-- CreateIndex
CREATE INDEX "Vehicle_vin_idx" ON "Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_auctionDate_idx" ON "Vehicle"("auctionDate");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_sourceId_externalId_key" ON "Vehicle"("sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_vehicleId_key" ON "Favorite"("userId", "vehicleId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidHistory" ADD CONSTRAINT "BidHistory_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeJob" ADD CONSTRAINT "ScrapeJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
