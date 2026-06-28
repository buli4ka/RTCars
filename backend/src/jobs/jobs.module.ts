import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScrapersModule } from '../scrapers/scrapers.module';
import { DEFAULT_REDIS_PORT, SCRAPE_QUEUE } from './jobs.constants';
import { ScrapeProcessor } from './scrape.processor';
import { ScrapeScheduler } from './scrape.scheduler';

@Module({
  imports: [
    ScrapersModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379');

        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || DEFAULT_REDIS_PORT,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: SCRAPE_QUEUE }),
  ],
  providers: [ScrapeProcessor, ScrapeScheduler],
  exports: [ScrapeScheduler],
})
export class JobsModule {}
