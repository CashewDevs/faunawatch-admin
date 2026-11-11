import type {
  PostSeverity,
  ReportCategory,
} from "../../../post-review/models/post";
import type {
  DeclineReason,
  DensityLevel,
  ReviewOutcome,
  TrendSeries,
} from "../../models/analytics";

/**
 * Series colours from the Figma frames, as Tailwind fill classes for the
 * SVG marks and legend dots. Each entity keeps its colour whatever its rank
 * or filter. Literal class names so Tailwind can find them.
 */

export const trendSeriesFill: Record<TrendSeries, string> = {
  submitted: "fill-primary",
  approved: "fill-amber-ink",
  declined: "fill-danger",
};

/** Recharts needs colour strings; these reference the same theme tokens. */
export const trendSeriesColor: Record<TrendSeries, string> = {
  submitted: "var(--color-primary)",
  approved: "var(--color-amber-ink)",
  declined: "var(--color-danger)",
};

export const reviewOutcomeFill: Record<ReviewOutcome, string> = {
  approved: "fill-amber-ink",
  declined: "fill-danger",
  awaitingTriage: "fill-cyan",
};

export const reviewOutcomeColor: Record<ReviewOutcome, string> = {
  approved: "var(--color-amber-ink)",
  declined: "var(--color-danger)",
  awaitingTriage: "var(--color-cyan)",
};

export const categoryFill: Record<ReportCategory, string> = {
  animal_in_need: "fill-primary",
  potentially_dangerous_animal: "fill-danger",
  possible_invasive_species: "fill-cyan",
  other_wildlife_incident: "fill-amber-ink",
};

export const severityFill: Record<PostSeverity, string> = {
  low: "fill-amber-ink",
  medium: "fill-cyan",
  high: "fill-danger",
  unrated: "fill-muted",
};

export const densityFill: Record<DensityLevel, string> = {
  low: "fill-amber-ink",
  moderate: "fill-primary",
  high: "fill-cyan",
  critical: "fill-danger",
};

/** Halo behind a hotspot marker, a tint of its density colour. */
export const densityHaloFill: Record<DensityLevel, string> = {
  low: "fill-amber-ink/25",
  moderate: "fill-primary/25",
  high: "fill-cyan/50",
  critical: "fill-danger/25",
};

/** By reviewer position, busiest first; the last is the folded "Others". */
export const reviewerFill: readonly string[] = [
  "fill-primary",
  "fill-amber-ink",
  "fill-cyan",
];

export const otherReviewersFill = "fill-muted";

export const declineReasonFill: Record<DeclineReason, string> = {
  inaccurateSpecies: "fill-danger",
  lowQualityPhoto: "fill-cyan",
  domesticSpecimen: "fill-primary",
  duplicateSighting: "fill-amber-ink",
  inaccurateLocation: "fill-muted",
  inappropriateContent: "fill-teal",
  notWildlife: "fill-accent-gold",
};
