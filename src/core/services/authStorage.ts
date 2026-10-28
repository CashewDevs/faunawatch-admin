import type { SupportedStorage } from "@supabase/supabase-js";

/**
 * Storage adapter for the Supabase client that implements "Remember me".
 *
 * The Supabase client still owns the session: it decides what to store and
 * when. This adapter only decides where: localStorage (survives closing the
 * browser) or sessionStorage (cleared when the browser closes).
 */

type StorageTarget = "local" | "session";

/**
 * The sign-in choice is kept in this tab's sessionStorage (it is a
 * preference, not a token) so it survives the full-page redirect of
 * Google sign-in, where the session is only saved after the page reloads.
 */
const preferenceKey = "faunawatch-admin.session-persistence";

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
  window.sessionStorage.setItem(preferenceKey, remember ? "local" : "session");
}

/** The choice made at sign-in in this tab, or null if none was made. */
function preferredTarget(): StorageTarget | null {
  const value = window.sessionStorage.getItem(preferenceKey);
  return value === "local" || value === "session" ? value : null;
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
    const target = preferredTarget() ?? currentTarget(key);
    storageFor(target).setItem(key, value);
    storageFor(otherTarget(target)).removeItem(key);
  },
  removeItem(key) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};
