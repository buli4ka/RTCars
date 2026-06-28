import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';

const SOURCE_SELECT = { source: { select: { slug: true, name: true } } };

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryVehiclesDto) {
    const where = this.buildWhere(query);
    const { page, limit, sortBy, sortOrder } = query;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        include: SOURCE_SELECT,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: SOURCE_SELECT,
    });

    if (!vehicle) throw new NotFoundException('Vehicle not found');

    return vehicle;
  }

  bidHistory(id: number) {
    return this.prisma.bidHistory.findMany({
      where: { vehicleId: id },
      orderBy: { recordedAt: 'asc' },
      select: { id: true, bid: true, recordedAt: true },
    });
  }

  private buildWhere(query: QueryVehiclesDto): Prisma.VehicleWhereInput {
    const where: Prisma.VehicleWhereInput = {
      isActive: query.isActive ?? true,
    };

    // Exact, case-insensitive matches.
    const exact = [
      'make',
      'model',
      'fuelType',
      'transmission',
      'bodyStyle',
      'driveType',
      'color',
    ] as const;

    for (const key of exact) {
      const value = query[key];

      if (typeof value === 'string') {
        where[key] = { equals: value, mode: 'insensitive' };
      }
    }

    // Partial, case-insensitive matches.
    if (query.location) where.location = { contains: query.location, mode: 'insensitive' };

    if (query.damageMain) where.damageMain = { contains: query.damageMain, mode: 'insensitive' };

    if (query.vin) where.vin = { contains: query.vin, mode: 'insensitive' };

    if (query.sourceId !== undefined) where.sourceId = query.sourceId;

    if (query.keysPresent !== undefined) where.keysPresent = query.keysPresent;

    if (query.runAndDrive !== undefined) where.runAndDrive = query.runAndDrive;

    if (query.yearMin !== undefined || query.yearMax !== undefined) {
      where.year = {
        ...(query.yearMin !== undefined && { gte: query.yearMin }),
        ...(query.yearMax !== undefined && { lte: query.yearMax }),
      };
    }

    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      where.OR = [
        { make: contains },
        { model: contains },
        { trim: contains },
        { lotNumber: contains },
      ];
    }

    return where;
  }
}
