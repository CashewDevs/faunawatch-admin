import { AppStrings } from "../../../../core/constants/appStrings";
import type { ModerationFlow } from "../../viewmodels/useModerationFlow";

interface ModerationNoticeProps {
  moderation: ModerationFlow;
}

/**
 * The result of the last decision, under the header on the right. Success
 * messages close on their own; errors stay until dismissed.
 */
export function ModerationNotice({ moderation }: ModerationNoticeProps) {
  const { notice } = moderation;

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
            onClick={moderation.dismissNotice}
            aria-label={AppStrings.posts.moderation.dismiss}
            className="-my-0.5 shrink-0 rounded px-1 text-base leading-5 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
