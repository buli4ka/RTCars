export interface VehicleData {
  externalId: string;
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyStyle?: string;
  color?: string;
  fuelType?: string;
  transmission?: string;
  driveType?: string;
  engineSize?: string;
  odometer?: number;
  damageMain?: string;
  damageSec?: string;
  keysPresent?: boolean;
  runAndDrive?: boolean;
  location?: string;
  auctionDate?: Date;
  currentBid?: number;
  buyNowPrice?: number;
  imageUrls?: string[];
  lotNumber?: string;
  auctionUrl?: string;
}

export interface IScraper {
  readonly sourceSlug: string;
  scrape(): AsyncGenerator<VehicleData>;
}
