/**
 * Keeps the page an admin asked for across the Google sign-in redirect,
 * which reloads the site and drops router state. sessionStorage is per tab
 * and cleared when the tab closes; it holds only a same-site path.
 *
 * Storage can be blocked (e.g. some private modes); the admin then lands on
 * the default screen after a Google sign-in.
 */

const storageKey = "faunawatch-admin.return-path";

export function saveReturnPath(path: string): void {
  try {
    window.sessionStorage.setItem(storageKey, path);
  } catch {
    // Blocked storage: fall back to the default screen.
  }
}

/** The saved path, unvalidated; null when none or storage is blocked. */
export function loadReturnPath(): string | null {
  try {
    return window.sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function clearReturnPath(): void {
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Blocked storage: nothing was saved.
  }
}
