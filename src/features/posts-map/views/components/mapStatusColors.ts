import type { KnownPostStatus } from "../../../post-review/models/post";

/**
 * Each status's brand colour, shared by the pins and the filter chips so
 * the chips double as the map's legend.
 */
export const mapStatusFill: Record<KnownPostStatus, string> = {
  pending: "bg-accent-gold",
  changes_requested: "bg-amber",
  approved: "bg-teal",
  declined: "bg-danger",
};

/** The paw on the pin: dark on the light gold, white on the rest. */
export const mapStatusIcon: Record<KnownPostStatus, string> = {
  pending: "brightness-0 opacity-70",
  changes_requested: "",
  approved: "",
  declined: "",
};
