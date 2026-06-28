import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('scrape/:source')
  @ApiOperation({ summary: 'Manually trigger a scrape for a source' })
  triggerScrape(@Param('source') source: string): Promise<{ jobId: string }> {
    return this.adminService.triggerScrape(source);
  }

  @Get('scrape-jobs')
  @ApiOperation({ summary: 'List recent scrape jobs' })
  jobHistory() {
    return this.adminService.jobHistory();
  }
}
