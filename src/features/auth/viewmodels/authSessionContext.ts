import { createContext, useContext } from "react";
import type {
  AdminProfile,
  AuthErrorKind,
  SessionStatus,
} from "../models/authSession";

export interface AuthSession {
  status: SessionStatus;
  /** The confirmed admin; null unless status is "signedIn". */
  admin: AdminProfile | null;
  signOut: () => Promise<void>;
  /**
   * Why the last session was refused, for the login screen to explain:
   * e.g. a Google sign-in that failed or wasn't an admin. It outlives the
   * refused session; null when there is nothing to explain.
   */
  rejection: AuthErrorKind | null;
  clearRejection: () => void;
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
