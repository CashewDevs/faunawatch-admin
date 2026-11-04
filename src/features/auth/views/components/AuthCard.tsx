import type { ReactNode } from "react";
import { BrandLogomark } from "../../../../core/components/BrandLogomark";
import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";

interface AuthCardProps {
  heading: string;
  subheading: string;
  children: ReactNode;
}

/**
 * White card for signed-out screens: brand header, heading, the screen's
 * content and footer note.
 */
export function AuthCard({ heading, subheading, children }: AuthCardProps) {
  const strings = AppStrings.login;

  return (
    <section className="flex w-full max-w-[420px] animate-fade-in-up flex-col gap-6 rounded-2xl border border-divider bg-white p-10 shadow-card motion-reduce:animate-none">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandLogomark />
          <span className="text-xl leading-7 font-extrabold tracking-[-0.5px] text-navy">
            {strings.brandName}
          </span>
        </div>
        <span className="rounded-md bg-navy px-2.5 py-1 text-[11px] leading-[16.5px] font-bold tracking-[0.55px] text-white uppercase">
          {strings.adminBadge}
        </span>
      </header>

      <div className="flex flex-col gap-1 pt-1">
        <h1 className="text-2xl leading-8 font-bold tracking-[-0.6px] text-navy">
          {heading}
        </h1>
        <p className="text-sm wrap-anywhere text-muted">{subheading}</p>
      </div>

      {children}

      <footer className="flex items-center justify-center gap-1.5 border-t border-divider pt-5 text-center text-xs font-medium text-muted">
        <img
          src={AppAssets.login.iconShield}
          alt=""
          className="size-3.5 shrink-0"
        />
        {strings.footerNote}
      </footer>
    </section>
  );
}
