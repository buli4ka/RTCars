// Fallback values used when env vars are not set.
// BCRYPT_ROUNDS and REFRESH_TOKEN_TTL_DAYS can be overridden via .env.
export const MIN_PASSWORD_LENGTH = 8;

export const DEFAULT_BCRYPT_ROUNDS = 10;
export const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 7;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
