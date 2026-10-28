import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAuthErrorKind,
  getSessionStatus,
  type AuthErrorKind,
  type SessionSource,
  type SessionUser,
} from "../models/authSession";
import {
  getOAuthRedirectFailure,
  onSessionChange,
  signOut,
} from "../services/authService";
import { adminProfileQuery } from "./adminProfileQuery";
import { AuthSessionContext, type AuthSession } from "./authSessionContext";

interface SessionState {
  user: SessionUser | null | undefined;
  source: SessionSource;
}

const initialState: SessionState = { user: undefined, source: "restored" };

function isSameUser(
  a: SessionUser | null | undefined,
  b: SessionUser | null,
): boolean {
  return a?.id === b?.id && a?.email === b?.email;
}

/** Why the admin check refused the current user, if it did. */
function getRefusal(
  hasUser: boolean,
  check: { isError: boolean; error: unknown; data: unknown },
): AuthErrorKind | null {
  if (!hasUser) return null;
  if (check.isError) return getAuthErrorKind(check.error);
  return check.data === null ? "notAdmin" : null;
}

/**
 * Tracks the Supabase session and whether its user is an admin.
 *
 * Also remembers why a session was refused (a failed Google redirect, a
 * non-admin account or a failed admin check), because a Google sign-in
 * comes back through a page load rather than the login form.
 *
 * This is UX only: RLS and is_admin() enforce admin access on the backend.
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<SessionState>(initialState);
  const [rejection, setRejection] = useState<AuthErrorKind | null>(null);
  const { user } = session;

  useEffect(
    () =>
      onSessionChange((nextUser, source) => {
        // Drop all cached admin data whenever the session ends.
        if (!nextUser) queryClient.clear();
        // Token refreshes report the same user; keep state stable.
        setSession((previous) =>
          isSameUser(previous.user, nextUser) && previous.user !== undefined
            ? previous
            : { user: nextUser, source },
        );
      }),
    [queryClient],
  );

  useEffect(() => {
    let isActive = true;
    void getOAuthRedirectFailure().then((failure) => {
      if (isActive && failure) setRejection(failure.kind);
    });
    return () => {
      isActive = false;
    };
  }, []);

  const adminCheck = useQuery({
    ...adminProfileQuery(user ?? { id: "", email: null }),
    enabled: Boolean(user),
  });

  const status = getSessionStatus({
    user,
    source: session.source,
    isChecking: adminCheck.isPending,
    isCheckFailed: adminCheck.isError,
    profile: adminCheck.data,
  });

  // A saved session whose user is not an admin is ended right away.
  const isConfirmedNonAdmin = Boolean(user) && adminCheck.data === null;
  useEffect(() => {
    if (isConfirmedNonAdmin) void signOut();
  }, [isConfirmedNonAdmin]);

  // Record each refusing admin check once, while rendering, so the reason
  // survives the sign-out that follows. Status stays fail-closed either way.
  const refusal = getRefusal(Boolean(user), adminCheck);
  const checkedAt = adminCheck.isError
    ? adminCheck.errorUpdatedAt
    : adminCheck.dataUpdatedAt;
  const [recordedCheckAt, setRecordedCheckAt] = useState(0);
  if (refusal && checkedAt !== recordedCheckAt) {
    setRecordedCheckAt(checkedAt);
    setRejection(refusal);
  }

  const clearRejection = useCallback(() => {
    setRejection(null);
  }, []);

  const value = useMemo<AuthSession>(
    () => ({
      status,
      admin: status === "signedIn" ? (adminCheck.data ?? null) : null,
      signOut,
      rejection,
      clearRejection,
    }),
    [status, adminCheck.data, rejection, clearRejection],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}
