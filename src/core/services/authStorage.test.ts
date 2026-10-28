import { afterEach, describe, expect, it } from "vitest";
import { authStorage, setSessionPersistence } from "./authStorage";

const key = "sb-test-auth-token";
const verifierKey = "sb-test-auth-token-code-verifier";

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("authStorage", () => {
  it("keeps a remembered session in localStorage", async () => {
    setSessionPersistence(true);
    await authStorage.setItem(key, "session");

    expect(window.localStorage.getItem(key)).toBe("session");
    expect(window.sessionStorage.getItem(key)).toBeNull();
    expect(await authStorage.getItem(key)).toBe("session");
  });

  it("keeps a non-remembered session in sessionStorage", async () => {
    setSessionPersistence(false);
    await authStorage.setItem(key, "session");

    expect(window.sessionStorage.getItem(key)).toBe("session");
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it("moves the session when the preference changes on the next sign-in", async () => {
    setSessionPersistence(true);
    await authStorage.setItem(key, "first");
    setSessionPersistence(false);
    await authStorage.setItem(key, "second");

    expect(window.sessionStorage.getItem(key)).toBe("second");
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it("keeps token refreshes where the session already is after a reload", async () => {
    window.sessionStorage.setItem(key, "restored");
    await authStorage.setItem(key, "refreshed");

    expect(window.sessionStorage.getItem(key)).toBe("refreshed");
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it("defaults to localStorage when nothing is stored yet", async () => {
    await authStorage.setItem(key, "value");

    expect(window.localStorage.getItem(key)).toBe("value");
  });

  it.each([
    [false, window.sessionStorage, window.localStorage],
    [true, window.localStorage, window.sessionStorage],
  ])(
    "keeps the remember-me choice (%s) across the Google sign-in redirect",
    async (remember, kept, other) => {
      // Before the redirect: supabase-js stores the PKCE code verifier.
      setSessionPersistence(remember);
      await authStorage.setItem(verifierKey, "verifier");
      // After the page reloads, the verifier is read back and the new
      // session is saved; nothing is held in memory across the reload.
      expect(await authStorage.getItem(verifierKey)).toBe("verifier");
      await authStorage.setItem(key, "session");

      expect(kept.getItem(verifierKey)).toBe("verifier");
      expect(kept.getItem(key)).toBe("session");
      expect(other.getItem(key)).toBeNull();
    },
  );

  it("removes the session from both storages", async () => {
    window.localStorage.setItem(key, "a");
    window.sessionStorage.setItem(key, "b");
    await authStorage.removeItem(key);

    expect(window.localStorage.getItem(key)).toBeNull();
    expect(window.sessionStorage.getItem(key)).toBeNull();
  });
});
