import type { SupportedStorage } from "@supabase/supabase-js";

/**
 * Storage adapter for the Supabase client that implements "Remember me".
 *
 * The Supabase client still owns the session: it decides what to store and
 * when. This adapter only decides where: localStorage (survives closing the
 * browser) or sessionStorage (cleared when the browser closes).
 */

type StorageTarget = "local" | "session";

/** Set at sign-in; null means "keep using wherever the session already is". */
let preferredTarget: StorageTarget | null = null;

function storageFor(target: StorageTarget): Storage {
  return target === "local" ? window.localStorage : window.sessionStorage;
}

function otherTarget(target: StorageTarget): StorageTarget {
  return target === "local" ? "session" : "local";
}

/**
 * Chooses where the next session is stored. Call before signing in.
 * `true` keeps the session after the browser closes; `false` ends it.
 */
export function setSessionPersistence(remember: boolean): void {
  preferredTarget = remember ? "local" : "session";
}

/** Where an existing key lives, so token refreshes stay in the same place. */
function currentTarget(key: string): StorageTarget {
  return window.sessionStorage.getItem(key) !== null ? "session" : "local";
}

export const authStorage: SupportedStorage = {
  getItem(key) {
    return (
      window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key)
    );
  },
  setItem(key, value) {
    const target = preferredTarget ?? currentTarget(key);
    storageFor(target).setItem(key, value);
    storageFor(otherTarget(target)).removeItem(key);
  },
  removeItem(key) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

/** Test-only: forget the sign-in preference between tests. */
export function resetSessionPersistenceForTests(): void {
  preferredTarget = null;
}
