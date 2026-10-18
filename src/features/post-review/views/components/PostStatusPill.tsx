import { AppStrings } from "../../../../core/constants/appStrings";
import type { PostStatus } from "../../models/post";

const statusClass: Record<PostStatus, string> = {
  pending: "bg-cyan/50 text-teal",
  approved: "bg-teal-soft text-teal",
  declined: "bg-danger-tint text-danger",
};

/** Review status as a tinted pill, e.g. "Pending Review". */
export function PostStatusPill({ status }: { status: PostStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] leading-[14px] font-bold tracking-[0.44px] whitespace-nowrap ${statusClass[status]}`}
    >
      {AppStrings.posts.status[status]}
    </span>
  );
}
