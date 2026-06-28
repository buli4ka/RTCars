import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Page } from 'playwright';
import { BaseScraper } from '../base/base-scraper';
import { VehicleData } from '../base/scraper.interface';

const IAA_ORIGIN = 'https://www.iaai.com';
const SEARCH_URL = `${IAA_ORIGIN}/Search`;
const RESULT_LINK = 'a[href*="/VehicleDetail/"]';

/** Raw fields pulled from one IAA result row in the browser. */
interface IaaRawRow {
  externalId: string;
  auctionUrl: string;
  title: string;
  image: string | null;
  runAndDrive: boolean;
  auctionDateRaw: string | null;
  attrs: Record<string, string>;
}

@Injectable()
export class IaaScraper extends BaseScraper {
  readonly sourceSlug = 'iaa';

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(config: ConfigService) {
    super(config);
  }

  async *scrape(): AsyncGenerator<VehicleData> {
    const page = await this.newPage();

    try {
      const rows = await this.loadResultRows(page);
      this.logger.log(`IAA returned ${String(rows.length)} lots`);

      for (const row of rows) {
        yield this.mapRow(row);
      }
    } finally {
      await this.close();
    }
  }

  /**
   * IAA renders results server-side as table rows (no JSON API). Each field is
   * exposed via a `title="Label: value"` attribute, which gives stable,
   * label-keyed extraction. Throws if no rows render — the anti-bot signal.
   */
  private async loadResultRows(page: Page): Promise<IaaRawRow[]> {
    await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector(RESULT_LINK, { timeout: 45_000 });
    await this.humanDelay();

    return page.evaluate(() => {
      const out: IaaRawRow[] = [];
      const rows = document.querySelectorAll('.table-row');

      for (const row of rows) {
        const link = row.querySelector<HTMLAnchorElement>('a[href*="/VehicleDetail/"]');

        if (!link) continue;

        const idMatch = /\/VehicleDetail\/(\d+)/.exec(link.href);

        if (!idMatch) continue;

        const attrs: Record<string, string> = {};

        // Most fields: title="Label: value".
        for (const el of row.querySelectorAll('[title]')) {
          const t = el.getAttribute('title')?.trim() ?? '';
          const m = /^([^:]+):\s*(.*)$/.exec(t);

          if (m?.[2]) attrs[m[1].trim()] = m[2].trim();
        }

        // VIN and a few others use a visible label span instead of a title.
        for (const li of row.querySelectorAll('li.data-list__item')) {
          const label = li.querySelector('.data-list__label')?.textContent.replace(':', '').trim();
          const value = li.querySelector('.data-list__value')?.textContent.trim();

          if (label && value && !(label in attrs)) attrs[label] = value;
        }

        const watch = row.querySelector('[onclick*="AddDelWatch"]');
        const onclick = watch?.getAttribute('onclick') ?? '';
        const dateMatch = /'(\d{1,2}\/\d{1,2}\/\d{4}[^']*)'/.exec(onclick);

        out.push({
          externalId: idMatch[1],
          auctionUrl: link.href,
          title: row.querySelector('h4 a')?.textContent.trim() ?? '',
          image: row.querySelector('img[data-src]')?.getAttribute('data-src') ?? null,
          runAndDrive: /run\s*&\s*drive/i.test((row as HTMLElement).innerText),
          auctionDateRaw: dateMatch ? dateMatch[1] : null,
          attrs,
        });
      }

      return out;
    });
  }

  private mapRow(row: IaaRawRow): VehicleData {
    const { attrs } = row;
    const { year, make, model, trim } = this.parseTitle(row.title);
    const auctionDate = row.auctionDateRaw ? new Date(row.auctionDateRaw) : undefined;

    return {
      externalId: row.externalId,
      lotNumber: attrs['Stock #'] ?? row.externalId,
      vin: attrs.VIN,
      year,
      make,
      model,
      trim,
      bodyStyle: attrs['Body Style'],
      color: attrs['Exterior Color'],
      fuelType: attrs['Fuel Type'],
      transmission: attrs.Transmission,
      driveType: attrs['Driveline Type'],
      engineSize: attrs.Engine,
      odometer: this.parseOdometer(attrs.Odometer),
      damageMain: attrs['Primary Damage'],
      damageSec: attrs['Secondary Damage'] || undefined,
      keysPresent: attrs.Key ? /available/i.test(attrs.Key) : undefined,
      runAndDrive: row.runAndDrive,
      location: attrs.Branch,
      auctionDate: auctionDate && !Number.isNaN(auctionDate.getTime()) ? auctionDate : undefined,
      imageUrls: row.image ? [row.image] : [],
      auctionUrl: row.auctionUrl,
    };
  }

  /** "2017 NISSAN SENTRA SV" → year/make/model/trim. */
  private parseTitle(title: string): {
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
  } {
    const tokens = title.split(/\s+/).filter(Boolean);
    const year = /^\d{4}$/.test(tokens[0] ?? '') ? Number(tokens[0]) : undefined;
    const [make, model, ...trimTokens] = year ? tokens.slice(1) : tokens;

    return {
      year,
      make,
      model,
      trim: trimTokens.length ? trimTokens.join(' ') : undefined,
    };
  }

  /** "128,738 mi" → 128738. */
  private parseOdometer(raw: string | undefined): number | undefined {
    if (!raw) return undefined;

    const digits = raw.replace(/[^\d]/g, '');

    return digits ? Number(digits) : undefined;
  }
}
