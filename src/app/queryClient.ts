import { QueryClient } from "@tanstack/react-query";

/** Shared TanStack Query client for all Supabase-backed server state. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
