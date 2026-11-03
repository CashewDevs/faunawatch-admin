import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { getReturnPath } from "../models/returnPath";
import { clearReturnPath, loadReturnPath } from "../services/returnPathStorage";

/**
 * Where the login screen sends an admin once signed in: the page in router
 * state, else the one saved before a Google sign-in (read once, when the
 * login screen loads). The saved page is cleared after sign-in so it can't
 * apply to a later one.
 */
export function useReturnPath(isSignedIn: boolean): string {
  // Router state is untyped; getReturnPath validates it.
  const state: unknown = useLocation().state;
  const [savedPath] = useState(loadReturnPath);

  useEffect(() => {
    if (isSignedIn) clearReturnPath();
  }, [isSignedIn]);

  return getReturnPath(state, savedPath);
}
