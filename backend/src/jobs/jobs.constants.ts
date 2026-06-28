/** BullMQ queue that runs scrape jobs. */
export const SCRAPE_QUEUE = 'scrape';

/** Fallback Redis port when REDIS_URL omits one. */
export const DEFAULT_REDIS_PORT = 6379;

/** Payload for a scrape job. */
export interface ScrapeJobData {
  sourceSlug: string;
}

export const MS_PER_HOUR = 60 * 60 * 1000;

/** Default repeat interval (hours) when SCRAPE_INTERVAL_HOURS is unset. */
export const DEFAULT_SCRAPE_INTERVAL_HOURS = 4;
