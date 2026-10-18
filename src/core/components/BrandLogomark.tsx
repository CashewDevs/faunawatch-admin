import { AppAssets } from "../constants/appAssets";

/**
 * The 36px FaunaWatch logomark tile (blue gradient square with the logo),
 * used in the login card header and the admin sidebar.
 */
export function BrandLogomark() {
  return (
    <div className="relative size-9 shrink-0 overflow-hidden rounded-md bg-brand-blue bg-linear-to-b from-white/20 from-40% to-black/20 shadow-logomark">
      <img
        src={AppAssets.shared.logomark}
        alt=""
        className="absolute top-[1.8px] -left-[1.2px] h-[39.3px] w-[32.4px] max-w-none"
      />
    </div>
  );
}
