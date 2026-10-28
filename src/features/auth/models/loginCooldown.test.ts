import { describe, expect, it } from "vitest";
import {
  emptyLoginCooldown,
  getCooldownRemainingMs,
  parseLoginCooldown,
  recordFailedSignIn,
  recordRateLimited,
  type LoginCooldownState,
} from "./loginCooldown";

const start = 1_000_000_000;
const second = 1000;
const minute = 60 * second;

/** Records `count` wrong passwords one second apart, from `start`. */
function failTimes(count: number, from = emptyLoginCooldown) {
  let state: LoginCooldownState = from;
  for (let index = 0; index < count; index += 1) {
    state = recordFailedSignIn(state, start + index * second);
  }
  return { state, lastAt: start + (count - 1) * second };
}

/** The state and time right after the `count`th wrong password. */
function lastLock(count: number): [LoginCooldownState, number] {
  const { state, lastAt } = failTimes(count);
  return [state, lastAt];
}

describe("recordFailedSignIn", () => {
  it("allows four wrong passwords without locking", () => {
    const { state, lastAt } = failTimes(4);

    expect(state.failures).toBe(4);
    expect(getCooldownRemainingMs(state, lastAt)).toBe(0);
  });

  it("locks for 30 seconds on the fifth wrong password", () => {
    const { state, lastAt } = failTimes(5);

    expect(getCooldownRemainingMs(state, lastAt)).toBe(30 * second);
  });

  it("doubles the lock for each further wrong password", () => {
    expect(getCooldownRemainingMs(...lastLock(6))).toBe(60 * second);
    expect(getCooldownRemainingMs(...lastLock(7))).toBe(2 * minute);
    expect(getCooldownRemainingMs(...lastLock(8))).toBe(4 * minute);
  });

  it("never locks for more than five minutes", () => {
    expect(getCooldownRemainingMs(...lastLock(9))).toBe(5 * minute);
    expect(getCooldownRemainingMs(...lastLock(20))).toBe(5 * minute);
  });

  it("stops counting wrong passwords older than 15 minutes", () => {
    const { state, lastAt } = failTimes(4);

    const later = recordFailedSignIn(state, lastAt + 15 * minute + 1);

    expect(later.failures).toBe(1);
    expect(getCooldownRemainingMs(later, lastAt + 15 * minute + 1)).toBe(0);
  });

  it("unlocks once the lock has passed", () => {
    const { state, lastAt } = failTimes(5);

    expect(getCooldownRemainingMs(state, lastAt + 30 * second)).toBe(0);
  });
});

describe("recordRateLimited", () => {
  it("locks for 60 seconds", () => {
    const state = recordRateLimited(emptyLoginCooldown, start);

    expect(getCooldownRemainingMs(state, start)).toBe(60 * second);
    expect(state.failures).toBe(0);
  });

  it("keeps a longer lock that is already running", () => {
    const { state, lastAt } = failTimes(8);

    const limited = recordRateLimited(state, lastAt);

    expect(getCooldownRemainingMs(limited, lastAt)).toBe(4 * minute);
  });
});

describe("getCooldownRemainingMs", () => {
  it("caps a lock far in the future (clock change or tampering)", () => {
    const state = {
      ...emptyLoginCooldown,
      lockedUntil: start + 365 * 24 * 60 * minute,
    };

    expect(getCooldownRemainingMs(state, start)).toBe(5 * minute);
  });
});

describe("parseLoginCooldown", () => {
  it("accepts a valid stored cooldown", () => {
    const stored = { failures: 3, lastFailureAt: start, lockedUntil: 0 };

    expect(parseLoginCooldown(stored)).toEqual(stored);
  });

  it.each([
    null,
    "locked",
    42,
    {},
    { failures: -1, lastFailureAt: start, lockedUntil: 0 },
    { failures: "5", lastFailureAt: start, lockedUntil: 0 },
    { failures: 1, lastFailureAt: Number.NaN, lockedUntil: 0 },
    { failures: 1, lastFailureAt: start, lockedUntil: Infinity },
  ])("treats %o as no cooldown", (value) => {
    expect(parseLoginCooldown(value)).toEqual(emptyLoginCooldown);
  });
});
