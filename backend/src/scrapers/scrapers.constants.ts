export const HOUR_MS = 60 * 60 * 1000;

/** A lot not re-observed within this window is presumed gone (marked inactive). */
export const DEFAULT_STALE_AFTER_HOURS = 72;

/** Bounded pagination per run keeps proxy bandwidth predictable. */
export const DEFAULT_MAX_PAGES = 3;
