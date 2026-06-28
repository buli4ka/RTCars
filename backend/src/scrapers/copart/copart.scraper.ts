import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Page, Response } from 'playwright';
import { BaseScraper } from '../base/base-scraper';
import { VehicleData } from '../base/scraper.interface';

const COPART_ORIGIN = 'https://www.copart.com';
// Public lot-search results page. The page's own JS POSTs to the search API
// (with the PerimeterX token it solved in-browser), which we intercept.
const SEARCH_RESULTS_URL = `${COPART_ORIGIN}/lotSearchResults/?free=true`;
const SEARCH_API_FRAGMENT = '/lots/search-results';

/** Subset of Copart's cryptic lot fields we map. All optional/defensive. */
interface CopartLot {
  ln?: number | string; // lot number
  fv?: string; // full VIN
  lcy?: number; // year
  mkn?: string; // make name
  lm?: string; // model
  lmg?: string; // model group (fallback)
  ltd?: string; // trim level
  bstl?: string; // body style
  clr?: string; // colour
  ft?: string; // fuel type
  tmtp?: string; // transmission type
  drv?: string; // drive
  egn?: string; // engine
  orr?: number; // odometer reading
  dd?: string; // primary damage description
  sdd?: string; // secondary damage description
  yn?: string; // yard name (location)
  lcd?: string; // condition highlight, e.g. "RUNS AND DRIVES"
  ad?: number; // auction date (epoch ms)
  hb?: number; // high bid
  bnp?: number; // buy-it-now price
  tims?: string; // thumbnail image
  dynamicLotDetails?: { currentBid?: number; buyTodayBid?: number };
}

@Injectable()
export class CopartScraper extends BaseScraper {
  readonly sourceSlug = 'copart';

  // Required for DI: Nest can't read constructor params from an inherited
  // constructor, so the subclass must re-declare it to receive ConfigService.
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(config: ConfigService) {
    super(config);
  }

  async *scrape(): AsyncGenerator<VehicleData> {
    const page = await this.newPage();

    try {
      let total = 0;

      for await (const lot of this.streamLots(page)) {
        total += 1;
        yield this.mapLot(lot);
      }

      this.logger.log(`Copart returned ${String(total)} lots`);
    } finally {
      await this.close();
    }
  }

  /**
   * Yield lots across pages. Page 1 comes from the JSON the results page fires
   * (which solves the anti-bot challenge in-browser); further pages replay that
   * same request with an incremented page number, reusing the browser session.
   */
  private async *streamLots(page: Page): AsyncGenerator<CopartLot> {
    const responsePromise = page.waitForResponse(
      (res: Response) => res.url().includes(SEARCH_API_FRAGMENT) && res.ok(),
      { timeout: 45_000 },
    );

    await page.goto(SEARCH_RESULTS_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await this.humanDelay();

    const response = await responsePromise;
    yield* this.extractLots(await response.json());

    // Replay the captured search POST for subsequent pages.
    const request = response.request();
    const postData = request.postData();

    if (!postData) return;

    let body: Record<string, unknown>;

    try {
      body = JSON.parse(postData) as Record<string, unknown>;
    } catch {
      return;
    }

    if (typeof body.page !== 'number') return; // unknown shape — stop at page 1

    const url = request.url();

    for (let p = 1; p < this.maxPages(); p += 1) {
      body.page = (body.page as number) + 1;
      await this.humanDelay();

      const res = await page.request.post(url, {
        data: body,
        headers: { 'content-type': 'application/json' },
      });

      if (!res.ok()) break;

      const lots = this.extractLots(await res.json());

      if (lots.length === 0) break;

      yield* lots;
    }
  }

  private extractLots(body: unknown): CopartLot[] {
    if (typeof body !== 'object' || body === null) return [];

    const data = (body as { data?: unknown }).data;

    if (typeof data !== 'object' || data === null) return [];

    const results = (data as { results?: unknown }).results;

    if (typeof results !== 'object' || results === null) return [];

    const content = (results as { content?: unknown }).content;

    return Array.isArray(content) ? (content as CopartLot[]) : [];
  }

  private mapLot(lot: CopartLot): VehicleData {
    const externalId = lot.ln != null ? String(lot.ln) : '';
    const currentBid = lot.dynamicLotDetails?.currentBid ?? lot.hb ?? undefined;

    return {
      externalId,
      lotNumber: externalId,
      vin: lot.fv,
      year: lot.lcy,
      make: lot.mkn,
      model: lot.lm ?? lot.lmg,
      trim: lot.ltd,
      bodyStyle: lot.bstl,
      color: lot.clr,
      fuelType: lot.ft,
      transmission: lot.tmtp,
      driveType: lot.drv,
      engineSize: lot.egn?.trim(),
      odometer: lot.orr,
      damageMain: lot.dd,
      damageSec: lot.sdd?.length ? lot.sdd : undefined,
      runAndDrive: lot.lcd ? /run/i.test(lot.lcd) : undefined,
      location: lot.yn,
      auctionDate: lot.ad ? new Date(lot.ad) : undefined,
      currentBid,
      buyNowPrice: lot.bnp ?? lot.dynamicLotDetails?.buyTodayBid,
      imageUrls: lot.tims ? [lot.tims] : [],
      auctionUrl: externalId ? `${COPART_ORIGIN}/lot/${externalId}` : undefined,
    };
  }
}
