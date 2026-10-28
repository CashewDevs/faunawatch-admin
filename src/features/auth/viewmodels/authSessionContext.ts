import { createContext, useContext } from "react";
import type { AdminProfile, SessionStatus } from "../models/authSession";

export interface AuthSession {
  status: SessionStatus;
  /** The confirmed admin; null unless status is "signedIn". */
  admin: AdminProfile | null;
  signOut: () => Promise<void>;
}

export const AuthSessionContext = createContext<AuthSession | null>(null);

/** The current admin session. Must be used inside AuthSessionProvider. */
export function useAuthSession(): AuthSession {
  const session = useContext(AuthSessionContext);
  if (!session) {
    throw new Error("useAuthSession must be used inside AuthSessionProvider.");
  }
  return session;
}
