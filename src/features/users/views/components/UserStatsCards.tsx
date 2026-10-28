import type { ReactNode } from "react";
import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import { formatNumber } from "../../../../core/utils/formatters";
import type { UserStats } from "../../models/adminUser";

interface UserStatsCardsProps {
  stats: UserStats | undefined;
  activeRate: number;
  /** Width limit of the row; Analytics lets it span the full width. */
  widthClass?: string;
}

const placeholder = "—";

/**
 * Row of four summary cards: total, active, suspended, and new users.
 * Also shown on the Analytics Overview tab.
 */
export function UserStatsCards({
  stats,
  activeRate,
  widthClass = "max-w-[960px]",
}: UserStatsCardsProps) {
  const strings = AppStrings.users.stats;
  const value = (count: number | undefined) =>
    count === undefined ? placeholder : formatNumber(count);

  return (
    <ul className={`flex gap-3 ${widthClass}`} aria-busy={!stats}>
      <StatCard label={strings.totalUsers} value={value(stats?.totalUsers)}>
        {stats && (
          <span className="flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-[11px] leading-[14px] font-semibold tracking-[0.44px] text-teal">
            <img src={AppAssets.users.iconTrendUp} alt="" />+
            {formatNumber(stats.newThisWeek)} {strings.thisWeek}
          </span>
        )}
      </StatCard>
      <StatCard label={strings.activeUsers} value={value(stats?.activeUsers)}>
        {stats && (
          <span className="flex items-center gap-1 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-teal">
            <img src={AppAssets.users.iconCheckCircle} alt="" />
            {activeRate}% {strings.activeRate}
          </span>
        )}
      </StatCard>
      <StatCard
        label={strings.suspendedUsers}
        value={value(stats?.suspendedUsers)}
      >
        {stats && (
          <span className="flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-[11px] leading-[14px] font-semibold tracking-[0.44px] text-danger">
            <img src={AppAssets.users.iconShieldAlert} alt="" />+
            {formatNumber(stats.suspendedThisMonth)} {strings.thisMonth}
          </span>
        )}
      </StatCard>
      <StatCard label={strings.newThisMonth} value={value(stats?.newThisMonth)}>
        {stats && stats.newUsersChangePercent !== null && (
          <span className="flex items-center gap-1 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-primary">
            <img src={AppAssets.users.iconArrowUpRight} alt="" />
            {stats.newUsersChangePercent >= 0 ? "+" : ""}
            {stats.newUsersChangePercent}% {strings.vsLastMonth}
          </span>
        )}
      </StatCard>
    </ul>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  children: ReactNode;
}

function StatCard({ label, value, children }: StatCardProps) {
  return (
    <li className="flex min-w-0 flex-1 items-start justify-between gap-2 rounded-2xl bg-white p-5 shadow-xs">
      <div className="flex shrink-0 flex-col gap-1">
        <span className="text-xs leading-4 font-medium tracking-[0.24px] text-muted">
          {label}
        </span>
        <span className="text-[28px] leading-[44px] font-extrabold tracking-[-0.7px] text-navy">
          {value}
        </span>
      </div>
      {children}
    </li>
  );
}
