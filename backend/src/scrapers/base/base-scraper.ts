import { Logger } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { type IScraper, type VehicleData } from './scraper.interface';

// Register the stealth plugin once for the whole process. It masks
// navigator.webdriver, WebGL vendor, plugin list, etc. — the signals
// PerimeterX/HUMAN use to fingerprint headless browsers.
let stealthRegistered = false;
function registerStealth(): void {
  if (stealthRegistered) return;

  chromium.use(StealthPlugin());
  stealthRegistered = true;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Resource types dropped to save proxy bandwidth (~5–10× reduction). Scripts and
// the document still load so the anti-bot challenge resolves normally.
const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);

/**
 * Abstract base for browser-based scrapers. Owns the Playwright lifecycle and
 * anti-bot hardening so concrete scrapers only implement navigation + parsing.
 */
export abstract class BaseScraper implements IScraper {
  protected readonly logger: Logger;

  private browser?: Browser;
  private context?: BrowserContext;

  abstract readonly sourceSlug: string;
  abstract scrape(): AsyncGenerator<VehicleData>;

  constructor(protected readonly config: ConfigService) {
    this.logger = new Logger(this.constructor.name);
  }

  /** Launch a hardened browser context. Uses SCRAPER_PROXY when configured. */
  protected async launchContext(): Promise<BrowserContext> {
    registerStealth();

    const proxyUrl = this.config.get<string>('SCRAPER_PROXY');

    if (proxyUrl) {
      this.logger.log('Launching browser with residential proxy');
    } else {
      this.logger.warn('SCRAPER_PROXY not set — scraping from direct IP');
    }

    this.browser = await chromium.launch({
      headless: true,
      proxy: this.parseProxy(proxyUrl),
      args: ['--disable-blink-features=AutomationControlled'],
    });

    this.context = await this.browser.newContext({
      userAgent: DEFAULT_USER_AGENT,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      viewport: { width: 1920, height: 1080 },
    });

    // Conserve proxy bandwidth: we only need the document + scripts (which solve
    // the anti-bot challenge) and the JSON API responses — never the heavy media.
    await this.context.route('**/*', (route) => {
      if (BLOCKED_RESOURCE_TYPES.has(route.request().resourceType())) {
        return route.abort();
      }

      return route.continue();
    });

    return this.context;
  }

  protected async newPage(): Promise<Page> {
    const context = this.context ?? (await this.launchContext());

    return context.newPage();
  }

  /**
   * Split SCRAPER_PROXY into Playwright's proxy shape. Credentials must be
   * passed as username/password — Chromium ignores them when embedded in the
   * server URL (resulting in HTTP 407 Proxy Authentication Required).
   */
  private parseProxy(
    proxyUrl: string | undefined,
  ): { server: string; username?: string; password?: string } | undefined {
    if (!proxyUrl) return undefined;

    const url = new URL(proxyUrl);
    const server = `${url.protocol}//${url.host}`;

    return url.username
      ? {
          server,
          username: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
        }
      : { server };
  }

  /** Randomised pause to avoid robotic request cadence. */
  protected async humanDelay(minMs = 500, maxMs = 1500): Promise<void> {
    const ms = minMs + Math.floor(Math.random() * (maxMs - minMs));
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Tear down browser resources. Always call in a finally block. */
  protected async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
    this.context = undefined;
    this.browser = undefined;
  }
}
