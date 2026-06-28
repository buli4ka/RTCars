import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

const SORT_FIELDS = ['auctionDate', 'currentBid', 'year'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

export type VehicleSortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

/** Parse a query-string boolean ("true"/"false") into a real boolean. */
const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true' || value === true) return true;

  if (value === 'false' || value === false) return false;

  return value;
};

export class QueryVehiclesDto {
  @ApiPropertyOptional({ default: DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(DEFAULT_PAGE)
  page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({ default: DEFAULT_LIMIT, maximum: MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number = DEFAULT_LIMIT;

  // ── Exact, case-insensitive filters ────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() make?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fuelType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transmission?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bodyStyle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driveType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;

  // ── Partial, case-insensitive filters ──────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() damageMain?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;

  // ── Numeric filters ─────────────────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  yearMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  yearMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceId?: number;

  // ── Boolean filters ─────────────────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  keysPresent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  runAndDrive?: boolean;

  @ApiPropertyOptional({ description: 'Defaults to true (active lots only)' })
  @IsOptional()
  @Transform(toBoolean)
  isActive?: boolean;

  // ── Sorting ──────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ enum: SORT_FIELDS, default: 'auctionDate' })
  @IsOptional()
  @IsIn(SORT_FIELDS)
  sortBy: VehicleSortField = 'auctionDate';

  @ApiPropertyOptional({ enum: SORT_ORDERS, default: 'asc' })
  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder: SortOrder = 'asc';
}
