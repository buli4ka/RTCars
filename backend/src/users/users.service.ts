import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, createdAt: true },
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async getFavorites(userId: number) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: {
        vehicle: {
          include: { source: { select: { slug: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addFavorite(userId: number, vehicleId: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_vehicleId: { userId, vehicleId } },
    });

    if (existing) throw new ConflictException('Already in favorites');

    return this.prisma.favorite.create({
      data: { userId, vehicleId },
    });
  }

  async removeFavorite(userId: number, vehicleId: number) {
    await this.prisma.favorite.deleteMany({ where: { userId, vehicleId } });
  }
}
