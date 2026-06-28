import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [JobsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
