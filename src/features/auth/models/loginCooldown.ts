/**
 * Login-form cooldown after repeated failed sign-ins.
 *
 * This is a usability measure, NOT a security control: it only slows the
 * login form in this browser, and anyone can bypass it by clearing site data
 * or calling Supabase Auth directly. Brute-force protection is enforced by
 * Supabase Auth's server-side rate limits.
 */

export interface LoginCooldownState {
  /** Wrong-password attempts in a row, within the failure window. */
  failures: number;
  /** When the last wrong password was entered (ms since epoch). */
  lastFailureAt: number;
  /** The form is locked until this time (ms since epoch); 0 when unlocked. */
  lockedUntil: number;
}

export const LoginCooldownPolicy = {
  /** Wrong passwords allowed before the first lockout. */
  freeAttempts: 5,
  /** First lockout; each further wrong password doubles it. */
  baseLockMs: 30_000,
  maxLockMs: 5 * 60_000,
  /** A wrong password older than this no longer counts. */
  failureWindowMs: 15 * 60_000,
  /** Wait after Supabase reports too many requests. */
  rateLimitLockMs: 60_000,
} as const;

export const emptyLoginCooldown: LoginCooldownState = {
  failures: 0,
  lastFailureAt: 0,
  lockedUntil: 0,
};

/** Records a wrong password and locks the form once the limit is passed. */
export function recordFailedSignIn(
  state: LoginCooldownState,
  now: number,
): LoginCooldownState {
  const isWithinWindow =
    now - state.lastFailureAt <= LoginCooldownPolicy.failureWindowMs;
  const failures = (isWithinWindow ? state.failures : 0) + 1;
  const extraFailures = failures - LoginCooldownPolicy.freeAttempts;
  const lockMs =
    extraFailures < 0
      ? 0
      : Math.min(
          LoginCooldownPolicy.baseLockMs * 2 ** extraFailures,
          LoginCooldownPolicy.maxLockMs,
        );
  return {
    failures,
    lastFailureAt: now,
    lockedUntil: lockMs > 0 ? now + lockMs : state.lockedUntil,
  };
}

/** Locks the form after Supabase rejects a sign-in as rate-limited. */
export function recordRateLimited(
  state: LoginCooldownState,
  now: number,
): LoginCooldownState {
  return {
    ...state,
    lockedUntil: Math.max(
      state.lockedUntil,
      now + LoginCooldownPolicy.rateLimitLockMs,
    ),
  };
}

/**
 * Time left on the lock. Never more than the longest possible lock, so a
 * clock change or a tampered value can't lock the form indefinitely.
 */
export function getCooldownRemainingMs(
  state: LoginCooldownState,
  now: number,
): number {
  const longestLockMs = Math.max(
    LoginCooldownPolicy.maxLockMs,
    LoginCooldownPolicy.rateLimitLockMs,
  );
  return Math.min(Math.max(state.lockedUntil - now, 0), longestLockMs);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Validates a stored cooldown; anything malformed is treated as none. */
export function parseLoginCooldown(value: unknown): LoginCooldownState {
  if (typeof value !== "object" || value === null) return emptyLoginCooldown;
  const { failures, lastFailureAt, lockedUntil } = value as Record<
    string,
    unknown
  >;
  if (!isCount(failures) || !isCount(lastFailureAt) || !isCount(lockedUntil)) {
    return emptyLoginCooldown;
  }
  return { failures: Math.floor(failures), lastFailureAt, lockedUntil };
}
