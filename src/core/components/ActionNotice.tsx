import { AppStrings } from "../constants/appStrings";
import type { Notice } from "../hooks/useNotice";

interface ActionNoticeProps {
  notice: Notice | null;
  onDismiss: () => void;
}

/**
 * The result of the last admin action, under the header on the right.
 * Success messages close on their own; errors stay until dismissed.
 */
export function ActionNotice({ notice, onDismiss }: ActionNoticeProps) {
  return (
    // Always mounted, so screen readers announce what is put inside.
    <div
      role={notice?.tone === "error" ? "alert" : "status"}
      className="pointer-events-none fixed top-20 right-8 z-40 flex max-w-sm justify-end"
    >
      {notice && (
        <div
          key={notice.id}
          className={`pointer-events-auto flex animate-fade-in items-start gap-3 rounded-lg px-4 py-3 text-sm leading-5 font-semibold shadow-lg motion-reduce:animate-none ${
            notice.tone === "success"
              ? "bg-teal-soft text-teal"
              : "bg-danger-tint text-danger"
          }`}
        >
          <p>{notice.message}</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={AppStrings.common.dismissMessage}
            className="-my-0.5 shrink-0 rounded px-1 text-base leading-5 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
