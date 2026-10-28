import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getSessionStatus,
  type SessionSource,
  type SessionUser,
} from "../models/authSession";
import { onSessionChange, signOut } from "../services/authService";
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

/**
 * Tracks the Supabase session and whether its user is an admin.
 *
 * This is UX only: RLS and is_admin() enforce admin access on the backend.
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<SessionState>(initialState);
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

  const value = useMemo<AuthSession>(
    () => ({
      status,
      admin: status === "signedIn" ? (adminCheck.data ?? null) : null,
      signOut,
    }),
    [status, adminCheck.data],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}
