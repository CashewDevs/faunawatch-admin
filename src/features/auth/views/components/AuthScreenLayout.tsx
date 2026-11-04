import type { ReactNode } from "react";
import { LoginBrandPanel } from "./LoginBrandPanel";

/**
 * Signed-out screen layout: brand panel on the left, a centered card on the
 * right.
 */
export function AuthScreenLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <LoginBrandPanel />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  );
}
