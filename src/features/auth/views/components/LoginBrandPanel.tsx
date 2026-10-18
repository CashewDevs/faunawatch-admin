import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";

/**
 * Decorative blue brand panel shown beside the login card on large screens.
 */
export function LoginBrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-brand-blue lg:flex lg:w-[49%] lg:shrink-0">
      <div className="pointer-events-none absolute top-0 left-0 h-[175px] w-[430px] rounded-br-[224px] bg-paw-pattern opacity-44" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-[164px] w-[420px] rounded-tl-[224px] bg-paw-pattern opacity-44" />
      <div className="pointer-events-none absolute -top-[172px] -left-[49px] size-[479px] rounded-full bg-teal/20 blur-orb" />

      <div className="relative flex w-full animate-fade-in flex-col items-center justify-center px-10 pb-28 motion-reduce:animate-none">
        <img
          src={AppAssets.shared.logoVertical}
          alt={AppStrings.login.brandLogoAlt}
          className="h-auto w-[444px] max-w-full"
        />
        <p className="mt-2 text-center text-2xl leading-tight font-extrabold">
          <span className="text-tagline-light">
            {AppStrings.login.taglineLead}
          </span>
          <span className="text-tagline-yellow">
            {AppStrings.login.taglineAccent}
          </span>
        </p>
      </div>
    </aside>
  );
}
