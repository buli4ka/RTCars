/**
 * Anti-bot GATE test for the Copart scraper — the go/no-go check for the
 * scraping pipeline. Runs the real CopartScraper standalone (no Nest, no DB).
 *
 *   1. Set SCRAPER_PROXY in backend/.env (residential/mobile proxy).
 *   2. npx ts-node --transpile-only scripts/gate-copart.ts
 *
 * PASS = prints N>0 lots with real data. FAIL = 0 lots / block / timeout.
 */
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { CopartScraper } from '../src/scrapers/copart/copart.scraper';

async function main(): Promise<void> {
  const scraper = new CopartScraper(new ConfigService());

  let count = 0;
  const sample: unknown[] = [];
  for await (const vehicle of scraper.scrape()) {
    count += 1;
    if (sample.length < 3) sample.push(vehicle);
  }

  console.log(`\n=== GATE RESULT: ${count} lots extracted ===`);
  console.log(JSON.stringify(sample, null, 2));

  if (count === 0) {
    console.error('FAIL: no lots (likely anti-bot block or selector drift)');
    process.exitCode = 1;
  } else {
    console.log('PASS: anti-bot beaten — real lots extracted. Project is green.');
  }
}

main().catch((error: unknown) => {
  console.error('GATE THREW:', error);
  process.exitCode = 1;
});
