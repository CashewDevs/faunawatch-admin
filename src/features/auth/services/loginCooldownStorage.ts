import {
  emptyLoginCooldown,
  parseLoginCooldown,
  type LoginCooldownState,
} from "../models/loginCooldown";

/**
 * Keeps the login cooldown in localStorage so it survives reloads, new tabs
 * and closing the browser. It stores only attempt counts and times, never
 * the email or anything else about the account.
 *
 * Storage can be blocked (e.g. some private modes); the cooldown then
 * lasts only as long as the page.
 */

const storageKey = "faunawatch-admin.login-cooldown";

export function loadLoginCooldown(): LoginCooldownState {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw === null
      ? emptyLoginCooldown
      : parseLoginCooldown(JSON.parse(raw));
  } catch {
    return emptyLoginCooldown;
  }
}

export function saveLoginCooldown(state: LoginCooldownState): void {
  try {
    if (state.failures === 0 && state.lockedUntil === 0) {
      window.localStorage.removeItem(storageKey);
    } else {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    }
  } catch {
    // Blocked storage: keep the cooldown in memory only.
  }
}

/**
 * Calls back when another tab changes the cooldown. Returns a function that
 * stops listening.
 */
export function onLoginCooldownChange(
  callback: (state: LoginCooldownState) => void,
): () => void {
  const handleStorage = (event: StorageEvent) => {
    // A null key means another tab cleared all of this site's storage.
    if (event.key === storageKey || event.key === null) {
      callback(loadLoginCooldown());
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}
