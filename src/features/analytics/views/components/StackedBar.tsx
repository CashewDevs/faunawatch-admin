interface StackedBarSegment {
  key: string;
  label: string;
  /** Raw count; sets the segment's length. */
  value: number;
  /** Rounded share shown to screen readers. */
  percent: number;
  /** Tailwind fill class, e.g. "fill-primary". */
  fillClass: string;
}

interface StackedBarProps {
  segments: readonly StackedBarSegment[];
  /** Accessible name; each segment's label and share is read after it. */
  label: string;
  heightClass?: string;
}

/**
 * Horizontal 100% bar split into coloured segments, with a 2px white gap
 * between them. Drawn as SVG so lengths come from attributes, not inline
 * styles. The breakdown is also given as text for screen readers.
 */
export function StackedBar({
  segments,
  label,
  heightClass = "h-5",
}: StackedBarProps) {
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  const description = visible
    .map((segment) => `${segment.label} ${String(segment.percent)}%`)
    .join(", ");

  const widths = visible.map((segment) =>
    total > 0 ? (segment.value / total) * 100 : 0,
  );
  const rects = visible.map((segment, index) => ({
    ...segment,
    width: widths[index] ?? 0,
    x: widths.slice(0, index).reduce((sum, width) => sum + width, 0),
  }));

  return (
    <svg
      role="img"
      aria-label={`${label}: ${description}`}
      className={`w-full overflow-hidden rounded-lg ${heightClass}`}
    >
      {rects.map((rect) => (
        <rect
          key={rect.key}
          x={`${String(rect.x)}%`}
          width={`${String(rect.width)}%`}
          height="100%"
          className={`${rect.fillClass} stroke-white stroke-2`}
        />
      ))}
    </svg>
  );
}

interface MeterBarProps {
  /** 0–100. */
  percent: number;
  fillClass: string;
  heightClass?: string;
  className?: string;
}

/** Single rounded bar on a light track; decorative, so pair it with text. */
export function MeterBar({
  percent,
  fillClass,
  heightClass = "h-2",
  className = "w-full",
}: MeterBarProps) {
  return (
    <svg
      aria-hidden="true"
      className={`overflow-hidden rounded-full ${heightClass} ${className}`}
    >
      <rect width="100%" height="100%" className="fill-chip" />
      {percent > 0 && (
        <rect
          width={`${String(Math.min(100, percent))}%`}
          height="100%"
          rx="4"
          className={fillClass}
        />
      )}
    </svg>
  );
}
