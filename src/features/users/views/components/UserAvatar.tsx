import { getAvatarSrc } from "../../../../core/constants/appAssets";
import { getInitials } from "../../../../core/utils/names";
import type { AdminUser } from "../../models/adminUser";

interface UserAvatarProps {
  user: AdminUser;
}

/**
 * 40px round avatar: the user's photo, or their initials when there is none.
 */
export function UserAvatar({ user }: UserAvatarProps) {
  const isSuspended = user.status === "suspended";

  if (user.avatar) {
    return (
      <img
        src={getAvatarSrc(user.avatar)}
        alt=""
        className="size-10 shrink-0 rounded-full bg-avatar object-cover shadow-xs"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs leading-4 font-bold tracking-[0.24px] ${
        isSuspended
          ? "bg-danger-soft text-danger"
          : "bg-avatar text-primary shadow-xs"
      }`}
    >
      {getInitials(user.fullName)}
    </span>
  );
}
