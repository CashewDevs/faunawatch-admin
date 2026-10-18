import { getInitials } from "../../../../core/utils/names";
import type { PostReporter } from "../../models/post";

interface ReporterAvatarProps {
  reporter: Pick<PostReporter, "fullName" | "avatarUrl">;
  size: "sm" | "lg";
}

const sizeClass = {
  sm: "size-7 text-[10px]",
  lg: "size-12 text-sm",
} as const;

/**
 * Round reporter photo, or their initials when there is none.
 */
export function ReporterAvatar({ reporter, size }: ReporterAvatarProps) {
  if (reporter.avatarUrl) {
    return (
      <img
        src={reporter.avatarUrl}
        alt=""
        className={`${sizeClass[size]} shrink-0 rounded-full bg-avatar object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass[size]} flex shrink-0 items-center justify-center rounded-full bg-avatar leading-4 font-bold text-primary`}
    >
      {getInitials(reporter.fullName)}
    </span>
  );
}
