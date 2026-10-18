import type { ReactNode } from "react";

interface LoginInputFieldProps {
  id: string;
  label: string;
  type: "email" | "password" | "text";
  value: string;
  onChange: (value: string) => void;
  iconSrc: string;
  autoComplete: string;
  placeholder?: string;
  error?: string;
  /** Optional control rendered inside the input on the right (e.g. a toggle). */
  trailing?: ReactNode;
}

/**
 * Labelled text input with a leading icon, as used on the login card.
 */
export function LoginInputField({
  id,
  label,
  type,
  value,
  onChange,
  iconSrc,
  autoComplete,
  placeholder,
  error,
  trailing,
}: LoginInputFieldProps) {
  const errorId = `${id}-error`;
  const hasError = error !== undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-navy">
        {label}
      </label>
      <div className="relative">
        <img
          src={iconSrc}
          alt=""
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
        />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={`w-full rounded-xl border bg-white py-2.5 pl-10 text-sm font-medium text-navy transition-colors duration-200 placeholder:text-muted focus:ring-2 focus:outline-none motion-reduce:transition-none ${
            trailing ? "pr-11" : "pr-4"
          } ${
            hasError
              ? "border-error focus:ring-error/20"
              : "border-border focus:border-primary focus:ring-primary/20"
          }`}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
            {trailing}
          </div>
        )}
      </div>
      {hasError && (
        <p id={errorId} className="text-xs font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}
