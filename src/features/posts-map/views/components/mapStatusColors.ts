import type { KnownPostStatus } from "../../../post-review/models/post";

/**
 * Each status's brand colour, shared by the pins (their frame and pointer,
 * where the app's pin is blue) and the filter chips, so the chips double as
 * the map's legend.
 */
export const mapStatusFill: Record<KnownPostStatus, string> = {
  pending: "bg-accent-gold",
  changes_requested: "bg-amber",
  approved: "bg-teal",
  declined: "bg-danger",
};
