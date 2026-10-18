/**
 * Typed static asset path constants for FaunaWatch Admin.
 *
 * Keys represent logical asset names, values represent asset path strings.
 * Views must reference asset paths via this constants object.
 *
 * TODO(webp): The .png and .svg files below are placeholders exported from
 * Figma. Convert them to .webp and update these imports.
 */
import faunawatchLogomark from "../../assets/shared/faunawatch-logomark.png";
import faunawatchLogoVertical from "../../assets/shared/faunawatch-logo-vertical.png";
import sharedIconBell from "../../assets/shared/icon-bell.svg";
import sharedIconLogout from "../../assets/shared/icon-logout.svg";
import sharedIconUsers from "../../assets/shared/icon-users.svg";
import loginIconArrowRight from "../../assets/login/icon-arrow-right.svg";
import loginIconEye from "../../assets/login/icon-eye.svg";
import loginIconLock from "../../assets/login/icon-lock.svg";
import loginIconMail from "../../assets/login/icon-mail.svg";
import loginIconShield from "../../assets/login/icon-shield.svg";
import loginPawPatternTile from "../../assets/login/paw-pattern-tile.png";
import usersIconArrowUpRight from "../../assets/users/icon-arrow-up-right.svg";
import usersIconCheckCircle from "../../assets/users/icon-check-circle.svg";
import usersIconChevronDown from "../../assets/users/icon-chevron-down.svg";
import usersIconChevronLeft from "../../assets/users/icon-chevron-left.svg";
import usersIconChevronRight from "../../assets/users/icon-chevron-right.svg";
import usersIconDownload from "../../assets/users/icon-download.svg";
import usersIconSearch from "../../assets/users/icon-search.svg";
import usersIconShieldAlert from "../../assets/users/icon-shield-alert.svg";
import usersIconTrendUp from "../../assets/users/icon-trend-up.svg";
import usersIconVerified from "../../assets/users/icon-verified.svg";

export const AppAssets = {
  shared: {
    logomark: faunawatchLogomark,
    logoVertical: faunawatchLogoVertical,
    // TODO(loader): Placeholder — replace with the final loading-screen
    // logo and keep index.html's splash <img> in sync.
    loaderLogo: faunawatchLogomark,
    iconBell: sharedIconBell,
    iconLogout: sharedIconLogout,
    iconUsers: sharedIconUsers,
  },
  login: {
    iconArrowRight: loginIconArrowRight,
    iconEye: loginIconEye,
    iconLock: loginIconLock,
    iconMail: loginIconMail,
    iconShield: loginIconShield,
    // Rendered via the `bg-paw-pattern` utility (src/core/theme/patterns.css);
    // listed here so it is preloaded. Keep both paths in sync.
    pawPatternTile: loginPawPatternTile,
  },
  users: {
    iconArrowUpRight: usersIconArrowUpRight,
    iconCheckCircle: usersIconCheckCircle,
    iconChevronDown: usersIconChevronDown,
    iconChevronLeft: usersIconChevronLeft,
    iconChevronRight: usersIconChevronRight,
    iconDownload: usersIconDownload,
    iconSearch: usersIconSearch,
    iconShieldAlert: usersIconShieldAlert,
    iconTrendUp: usersIconTrendUp,
    iconVerified: usersIconVerified,
  },
} as const;

export type AppAssetGroup = keyof typeof AppAssets;
