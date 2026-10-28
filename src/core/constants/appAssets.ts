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
import avatarPanda from "../../assets/shared/avatars/panda.webp";
import avatarBunny from "../../assets/shared/avatars/bunny.webp";
import avatarTweety from "../../assets/shared/avatars/tweety.webp";
import avatarGarfield from "../../assets/shared/avatars/garfield.webp";
import avatarIce from "../../assets/shared/avatars/ice.webp";
import avatarSnoop from "../../assets/shared/avatars/snoop.webp";
import avatarJerry from "../../assets/shared/avatars/jerry.webp";
import avatarPerry from "../../assets/shared/avatars/perry.webp";
import avatarGrizz from "../../assets/shared/avatars/grizz.webp";
import sharedIconChevronLeft from "../../assets/shared/icon-chevron-left.svg";
import sharedIconChevronRight from "../../assets/shared/icon-chevron-right.svg";
import sharedIconAnalytics from "../../assets/shared/icon-analytics.svg";
import sharedIconApprove from "../../assets/shared/icon-approve.svg";
import sharedIconDecline from "../../assets/shared/icon-decline.svg";
import sharedIconPostApprovals from "../../assets/shared/icon-post-approvals.svg";
import sharedIconBell from "../../assets/shared/icon-bell.svg";
import sharedIconLogout from "../../assets/shared/icon-logout.svg";
import sharedIconUsers from "../../assets/shared/icon-users.svg";
import analyticsIconCategory from "../../assets/analytics/icon-category.svg";
import analyticsIconClipboardCheck from "../../assets/analytics/icon-clipboard-check.svg";
import analyticsIconExport from "../../assets/analytics/icon-export.svg";
import analyticsIconWarning from "../../assets/analytics/icon-warning.svg";
import loginIconArrowRight from "../../assets/login/icon-arrow-right.svg";
import loginIconEye from "../../assets/login/icon-eye.svg";
// Google's "G", cropped from the icon-only button in Google's Sign-In
// branding assets (signin-assets.zip). Don't recolour or redraw it.
import loginIconGoogle from "../../assets/login/icon-google.png";
import loginIconLock from "../../assets/login/icon-lock.svg";
import loginIconMail from "../../assets/login/icon-mail.svg";
import loginIconShield from "../../assets/login/icon-shield.svg";
import loginPawPatternTile from "../../assets/login/paw-pattern-tile.png";
import postApprovalsIconAiInvasive from "../../assets/post-approvals/icon-ai-invasive.svg";
import postApprovalsIconAiSparkle from "../../assets/post-approvals/icon-ai-sparkle.svg";
import postApprovalsIconBulkApprove from "../../assets/post-approvals/icon-bulk-approve.svg";
import postApprovalsIconBulkDecline from "../../assets/post-approvals/icon-bulk-decline.svg";
import postApprovalsIconChevronDown from "../../assets/post-approvals/icon-chevron-down.svg";
import postApprovalsIconClearFilters from "../../assets/post-approvals/icon-clear-filters.svg";
import postApprovalsIconInvasive from "../../assets/post-approvals/icon-invasive.svg";
import postApprovalsIconLocationPin from "../../assets/post-approvals/icon-location-pin.svg";
import postApprovalsIconPhotoCount from "../../assets/post-approvals/icon-photo-count.svg";
import postApprovalsIconSearch from "../../assets/post-approvals/icon-search.svg";
import postDetailIconAiSeverity from "../../assets/post-detail/icon-ai-severity.svg";
import postDetailIconAiSparkles from "../../assets/post-detail/icon-ai-sparkles.svg";
import postDetailIconApprovalRate from "../../assets/post-detail/icon-approval-rate.svg";
import postDetailIconArrowRight from "../../assets/post-detail/icon-arrow-right.svg";
import postDetailIconBackArrow from "../../assets/post-detail/icon-back-arrow.svg";
import postDetailIconBuffer from "../../assets/post-detail/icon-buffer.svg";
import postDetailIconCalendar from "../../assets/post-detail/icon-calendar.svg";
import postDetailIconCamera from "../../assets/post-detail/icon-camera.svg";
import postDetailIconCategory from "../../assets/post-detail/icon-category.svg";
import postDetailIconCheckCircle from "../../assets/post-detail/icon-check-circle.svg";
import postDetailIconChevronDown from "../../assets/post-detail/icon-chevron-down.svg";
import postDetailIconCoordinates from "../../assets/post-detail/icon-coordinates.svg";
import postDetailIconCopy from "../../assets/post-detail/icon-copy.svg";
import postDetailIconDelete from "../../assets/post-detail/icon-delete.svg";
import postDetailIconExifVerified from "../../assets/post-detail/icon-exif-verified.svg";
import postDetailIconExternalLink from "../../assets/post-detail/icon-external-link.svg";
import postDetailIconFlag from "../../assets/post-detail/icon-flag.svg";
import postDetailIconFlashOff from "../../assets/post-detail/icon-flash-off.svg";
import postDetailIconGalleryNext from "../../assets/post-detail/icon-gallery-next.svg";
import postDetailIconGalleryPrev from "../../assets/post-detail/icon-gallery-prev.svg";
import postDetailIconInfo from "../../assets/post-detail/icon-info.svg";
import postDetailIconLeaf from "../../assets/post-detail/icon-leaf.svg";
import postDetailIconLocation from "../../assets/post-detail/icon-location.svg";
import postDetailIconMapPin from "../../assets/post-detail/icon-map-pin.svg";
import postDetailIconNight from "../../assets/post-detail/icon-night.svg";
import postDetailIconNotes from "../../assets/post-detail/icon-notes.svg";
import postDetailIconPagerNext from "../../assets/post-detail/icon-pager-next.svg";
import postDetailIconPagerPrev from "../../assets/post-detail/icon-pager-prev.svg";
import postDetailIconRemove from "../../assets/post-detail/icon-remove.svg";
import postDetailIconReviewFlag from "../../assets/post-detail/icon-review-flag.svg";
import postDetailIconSeverity from "../../assets/post-detail/icon-severity.svg";
import postDetailIconVerified from "../../assets/post-detail/icon-verified.svg";
import postDetailIconZoom from "../../assets/post-detail/icon-zoom.svg";
import usersIconArrowUpRight from "../../assets/users/icon-arrow-up-right.svg";
import usersIconCheckCircle from "../../assets/users/icon-check-circle.svg";
import usersIconChevronDown from "../../assets/users/icon-chevron-down.svg";
import usersIconDownload from "../../assets/users/icon-download.svg";
import usersIconSearch from "../../assets/users/icon-search.svg";
import usersIconShieldAlert from "../../assets/users/icon-shield-alert.svg";
import usersIconTrendUp from "../../assets/users/icon-trend-up.svg";
import usersIconVerified from "../../assets/users/icon-verified.svg";
import type { AvatarImage, PresetAvatarName } from "../utils/avatars";

export const AppAssets = {
  shared: {
    logomark: faunawatchLogomark,
    logoVertical: faunawatchLogoVertical,
    // TODO(loader): Placeholder — replace with the final loading-screen
    // logo and keep index.html's splash <img> in sync.
    loaderLogo: faunawatchLogomark,
    iconBell: sharedIconBell,
    iconChevronLeft: sharedIconChevronLeft,
    iconChevronRight: sharedIconChevronRight,
    iconLogout: sharedIconLogout,
    iconUsers: sharedIconUsers,
    iconApprove: sharedIconApprove,
    iconDecline: sharedIconDecline,
    iconPostApprovals: sharedIconPostApprovals,
    iconAnalytics: sharedIconAnalytics,
  },
  // The mobile app's preset profile avatars (`preset:<name>`), copied from
  // the faunawatch repo's assets/images/. Keep the names in sync with it.
  avatars: {
    panda: avatarPanda,
    bunny: avatarBunny,
    tweety: avatarTweety,
    garfield: avatarGarfield,
    ice: avatarIce,
    snoop: avatarSnoop,
    jerry: avatarJerry,
    perry: avatarPerry,
    grizz: avatarGrizz,
  } satisfies Record<PresetAvatarName, string>,
  analytics: {
    iconCategory: analyticsIconCategory,
    iconClipboardCheck: analyticsIconClipboardCheck,
    iconExport: analyticsIconExport,
    iconWarning: analyticsIconWarning,
  },
  login: {
    iconArrowRight: loginIconArrowRight,
    iconEye: loginIconEye,
    iconGoogle: loginIconGoogle,
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
    iconDownload: usersIconDownload,
    iconSearch: usersIconSearch,
    iconShieldAlert: usersIconShieldAlert,
    iconTrendUp: usersIconTrendUp,
    iconVerified: usersIconVerified,
  },
  postApprovals: {
    iconAiInvasive: postApprovalsIconAiInvasive,
    iconAiSparkle: postApprovalsIconAiSparkle,
    iconBulkApprove: postApprovalsIconBulkApprove,
    iconBulkDecline: postApprovalsIconBulkDecline,
    iconChevronDown: postApprovalsIconChevronDown,
    iconClearFilters: postApprovalsIconClearFilters,
    iconInvasive: postApprovalsIconInvasive,
    iconLocationPin: postApprovalsIconLocationPin,
    iconPhotoCount: postApprovalsIconPhotoCount,
    iconSearch: postApprovalsIconSearch,
  },
  postDetail: {
    iconAiSeverity: postDetailIconAiSeverity,
    iconAiSparkles: postDetailIconAiSparkles,
    iconApprovalRate: postDetailIconApprovalRate,
    iconArrowRight: postDetailIconArrowRight,
    iconBackArrow: postDetailIconBackArrow,
    iconBuffer: postDetailIconBuffer,
    iconCalendar: postDetailIconCalendar,
    iconCamera: postDetailIconCamera,
    iconCategory: postDetailIconCategory,
    iconCheckCircle: postDetailIconCheckCircle,
    iconChevronDown: postDetailIconChevronDown,
    iconCoordinates: postDetailIconCoordinates,
    iconCopy: postDetailIconCopy,
    iconDelete: postDetailIconDelete,
    iconExifVerified: postDetailIconExifVerified,
    iconExternalLink: postDetailIconExternalLink,
    iconFlag: postDetailIconFlag,
    iconFlashOff: postDetailIconFlashOff,
    iconGalleryNext: postDetailIconGalleryNext,
    iconGalleryPrev: postDetailIconGalleryPrev,
    iconInfo: postDetailIconInfo,
    iconLeaf: postDetailIconLeaf,
    iconLocation: postDetailIconLocation,
    iconMapPin: postDetailIconMapPin,
    iconNight: postDetailIconNight,
    iconNotes: postDetailIconNotes,
    iconPagerNext: postDetailIconPagerNext,
    iconPagerPrev: postDetailIconPagerPrev,
    iconRemove: postDetailIconRemove,
    iconReviewFlag: postDetailIconReviewFlag,
    iconSeverity: postDetailIconSeverity,
    iconVerified: postDetailIconVerified,
    iconZoom: postDetailIconZoom,
  },
} as const;

export type AppAssetGroup = keyof typeof AppAssets;

/** Image URL for an avatar: a bundled preset, or a signed photo URL. */
export function getAvatarSrc(avatar: AvatarImage): string {
  return avatar.kind === "preset" ? AppAssets.avatars[avatar.name] : avatar.url;
}
