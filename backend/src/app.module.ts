import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { FeesModule } from './fees/fees.module';
import { AdminModule } from './admin/admin.module';
import { ScrapersModule } from './scrapers/scrapers.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    FeesModule,
    AdminModule,
    ScrapersModule,
    JobsModule,
  ],
})
export class AppModule {}
