import { AppStrings } from "../../../../core/constants/appStrings";
import type { PostSummary } from "../../models/post";

interface PostOwnerChangePillsProps {
  post: Pick<PostSummary, "isHiddenByOwner" | "isEditedAfterApproval">;
}

const pillClass =
  "rounded-full px-2.5 py-1 text-[11px] leading-[14px] font-bold tracking-[0.44px] whitespace-nowrap drop-shadow-xs";

/**
 * "Hidden by owner" and "Edited after approval": what the reporter did to
 * their post in the app. Nothing when neither applies. Each pill explains
 * itself on hover and to screen readers.
 */
export function PostOwnerChangePills({ post }: PostOwnerChangePillsProps) {
  const strings = AppStrings.posts.ownerChange;
  return (
    <>
      {post.isHiddenByOwner && (
        <span
          title={strings.hiddenHint}
          className={`${pillClass} bg-deep-blue text-white`}
        >
          {strings.hidden}
          <span className="sr-only">. {strings.hiddenHint}</span>
        </span>
      )}
      {post.isEditedAfterApproval && (
        <span
          title={strings.editedHint}
          className={`${pillClass} bg-amber-soft text-amber-ink`}
        >
          {strings.edited}
          <span className="sr-only">. {strings.editedHint}</span>
        </span>
      )}
    </>
  );
}
