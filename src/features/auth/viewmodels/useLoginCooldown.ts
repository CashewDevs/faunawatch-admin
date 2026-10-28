import { useEffect, useState } from "react";
import type { AuthErrorKind } from "../models/authSession";
import {
  emptyLoginCooldown,
  getCooldownRemainingMs,
  recordFailedSignIn,
  recordRateLimited,
  type LoginCooldownState,
} from "../models/loginCooldown";
import {
  loadLoginCooldown,
  onLoginCooldownChange,
  saveLoginCooldown,
} from "../services/loginCooldownStorage";

/**
 * The login form's cooldown after repeated failed sign-ins, shared by every
 * tab of this browser. Usability only; see models/loginCooldown.ts.
 */
export function useLoginCooldown() {
  const [state, setState] = useState(loadLoginCooldown);
  const [now, setNow] = useState(() => Date.now());
  const remainingMs = getCooldownRemainingMs(state, now);
  const isCoolingDown = remainingMs > 0;

  useEffect(
    () =>
      onLoginCooldownChange((next) => {
        setState(next);
        setNow(Date.now());
      }),
    [],
  );

  // Count down once a second while locked.
  useEffect(() => {
    if (!isCoolingDown) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [isCoolingDown]);

  const update = (next: LoginCooldownState, at: number) => {
    setState(next);
    setNow(at);
    saveLoginCooldown(next);
  };

  /**
   * Records how an email sign-in ended: null for a correct password (even
   * a non-admin one), otherwise the failure kind.
   */
  const recordSignInResult = (failure: AuthErrorKind | null) => {
    const at = Date.now();
    if (failure === null) {
      update(emptyLoginCooldown, at);
    } else if (failure === "invalidCredentials") {
      update(recordFailedSignIn(state, at), at);
    } else if (failure === "rateLimited") {
      update(recordRateLimited(state, at), at);
    }
  };

  return {
    isCoolingDown,
    /** Whole seconds left, rounded up; 0 when not locked. */
    remainingSeconds: Math.ceil(remainingMs / 1000),
    recordSignInResult,
  };
}
