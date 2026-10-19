import type { UseQueryResult } from "@tanstack/react-query";

/** Loading / error / retry for one analytics card, from its query. */
export interface CardQueryState {
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}

export function toCardQueryState(query: UseQueryResult): CardQueryState {
  return {
    isLoading: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
}
