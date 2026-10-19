import type { ReactNode } from "react";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  isDisabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Extra items after the options, e.g. a disabled "Custom". */
  children?: ReactNode;
}

export const segmentButtonClass =
  "rounded-lg px-3 py-1.5 text-sm leading-5 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Pill group of mutually exclusive options; the selected one is raised
 * on white.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  children,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-0.5 rounded-xl bg-surface-tint p-1"
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            disabled={option.isDisabled}
            onClick={() => {
              onChange(option.value);
            }}
            className={`${segmentButtonClass} ${
              isSelected
                ? "bg-white text-primary shadow-xs"
                : "text-slate enabled:hover:bg-white/60"
            }`}
          >
            {option.label}
          </button>
        );
      })}
      {children}
    </div>
  );
}
