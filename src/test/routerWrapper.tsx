import type { ReactNode } from "react";
import { MemoryRouter, type InitialEntry } from "react-router";
import { createQueryWrapper } from "./queryWrapper";

/**
 * Fresh QueryClient plus an in-memory router starting at `initialEntry`,
 * for ViewModels and screens that read the URL or router state.
 */
export function createRouterQueryWrapper(initialEntry: InitialEntry = "/") {
  const QueryWrapper = createQueryWrapper();
  return function RouterQueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryWrapper>
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      </QueryWrapper>
    );
  };
}
