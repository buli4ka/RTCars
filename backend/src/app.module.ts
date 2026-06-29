import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { FeesModule } from './fees/fees.module';
import { AdminModule } from './admin/admin.module';
import { ScrapersModule } from './scrapers/scrapers.module';
import { JobsModule } from './jobs/jobs.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

// Rate limit: 100 requests per minute per client (in-memory store).
const THROTTLE_TTL_MS = 60_000;
const THROTTLE_LIMIT = 100;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: THROTTLE_TTL_MS, limit: THROTTLE_LIMIT }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    FeesModule,
    AdminModule,
    ScrapersModule,
    JobsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
