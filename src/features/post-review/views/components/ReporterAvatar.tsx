import { getAvatarSrc } from "../../../../core/constants/appAssets";
import type { AvatarImage } from "../../../../core/utils/avatars";
import { getInitials } from "../../../../core/utils/names";

interface ReporterAvatarProps {
  name: string;
  avatar: AvatarImage | null;
  size: "sm" | "lg";
}

const sizeClass = {
  sm: "size-7 text-[10px]",
  lg: "size-12 text-sm",
} as const;

/**
 * Round reporter photo or preset avatar, or their initials when there is
 * none.
 */
export function ReporterAvatar({ name, avatar, size }: ReporterAvatarProps) {
  if (avatar) {
    return (
      <img
        src={getAvatarSrc(avatar)}
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
      {getInitials(name)}
    </span>
  );
}
