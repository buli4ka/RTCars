/**
 * Run a single scrape through the real persistence path (upsert + BidHistory +
 * ScrapeJob) without HTTP/auth and without starting the BullMQ scheduler/worker.
 *
 *   npx ts-node --transpile-only scripts/scrape-once.ts [sourceSlug]   # default: copart
 */
import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { PrismaModule } from '../src/prisma/prisma.module';
import { ScrapersModule } from '../src/scrapers/scrapers.module';
import { ScrapeRunnerService } from '../src/scrapers/scrape-runner.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, ScrapersModule],
})
class ScrapeCliModule {}

async function main(): Promise<void> {
  const slug = process.argv[2] ?? 'copart';
  const app = await NestFactory.createApplicationContext(ScrapeCliModule, {
    logger: ['log', 'warn', 'error'],
  });

  const runner = app.get(ScrapeRunnerService);
  const result = await runner.run(slug);
  console.log(`\n=== persisted: ${JSON.stringify(result)} ===`);

  await app.close();
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error('SCRAPE FAILED:', error);
  process.exit(1);
});
