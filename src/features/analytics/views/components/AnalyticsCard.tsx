import type { ReactNode } from "react";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { CardQueryState } from "../../viewmodels/cardQueryState";

interface AnalyticsCardProps {
  title: string;
  /** Pill shown right after the title. */
  titleBadge?: ReactNode;
  description: string;
  /** Badge, icon, or control at the top right. */
  trailing?: ReactNode;
  /** Extra header content under the description (e.g. a legend). */
  headerExtra?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * White rounded card with a title, description, and optional top-right slot.
 */
export function AnalyticsCard({
  title,
  titleBadge,
  description,
  trailing,
  headerExtra,
  className = "",
  children,
}: AnalyticsCardProps) {
  return (
    <section
      aria-label={title}
      className={`flex min-w-0 flex-col gap-5 rounded-3xl bg-white p-6 shadow-xs ${className}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-40 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl leading-7 font-semibold tracking-[-0.4px] text-ink">
              {title}
            </h2>
            {titleBadge}
          </div>
          <p className="max-w-[360px] text-sm leading-5 text-slate">
            {description}
          </p>
        </div>
        {trailing}
        {headerExtra}
      </header>
      {children}
    </section>
  );
}

interface CardContentProps {
  state: CardQueryState;
  isEmpty: boolean;
  children: ReactNode;
}

/**
 * Loading, error (with retry), or empty message in place of a card's
 * content; the content itself otherwise.
 */
export function CardContent({ state, isEmpty, children }: CardContentProps) {
  const strings = AppStrings.analytics;

  if (state.isLoading) {
    return (
      <p role="status" className="py-12 text-center text-sm text-muted">
        {strings.loading}
      </p>
    );
  }
  if (state.isError) {
    return (
      <p className="py-12 text-center text-sm text-muted">
        <span role="alert">{strings.error}</span>{" "}
        <button
          type="button"
          onClick={state.retry}
          className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {strings.retry}
        </button>
      </p>
    );
  }
  if (isEmpty) {
    return (
      <p className="py-12 text-center text-sm text-muted">{strings.empty}</p>
    );
  }
  return children;
}

/** Small round colour key beside a label; `fillClass` from analyticsColors. */
export function LegendDot({
  fillClass,
  sizeClass = "size-2.5",
}: {
  fillClass: string;
  sizeClass?: string;
}) {
  return (
    <svg aria-hidden="true" className={`shrink-0 ${sizeClass}`}>
      <circle cx="50%" cy="50%" r="50%" className={fillClass} />
    </svg>
  );
}

/** Pill with the selected range, e.g. "30-day". */
export function RangeBadge({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-chip px-3 py-1 text-xs leading-4 font-bold tracking-[0.24px] text-deep-blue">
      {children}
    </span>
  );
}
