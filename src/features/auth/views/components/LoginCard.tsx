import { BrandLogomark } from "../../../../core/components/BrandLogomark";
import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { LoginViewModel } from "../../viewmodels/useLoginViewModel";
import { LoginInputField } from "./LoginInputField";

interface LoginCardProps {
  viewModel: LoginViewModel;
}

/**
 * White login card: brand header, heading, credentials form and footer note.
 */
export function LoginCard({ viewModel }: LoginCardProps) {
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
          {strings.heading}
        </h1>
        <p className="text-sm text-muted">{strings.subheading}</p>
      </div>

      <form
        noValidate
        className="flex flex-col gap-5 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.submit();
        }}
      >
        <LoginInputField
          id="login-email"
          label={strings.emailLabel}
          type="email"
          value={viewModel.email}
          onChange={viewModel.changeEmail}
          iconSrc={AppAssets.login.iconMail}
          autoComplete="email"
          placeholder={strings.emailPlaceholder}
          error={viewModel.emailError}
        />

        <LoginInputField
          id="login-password"
          label={strings.passwordLabel}
          type={viewModel.isPasswordVisible ? "text" : "password"}
          value={viewModel.password}
          onChange={viewModel.changePassword}
          iconSrc={AppAssets.login.iconLock}
          autoComplete="current-password"
          placeholder={strings.passwordPlaceholder}
          error={viewModel.passwordError}
          trailing={
            // TODO(design): Figma has no "eye-off" icon for the visible
            // state, so the same icon is used for both; aria-pressed
            // conveys the state to assistive technology.
            <button
              type="button"
              onClick={viewModel.togglePasswordVisibility}
              aria-label={
                viewModel.isPasswordVisible
                  ? strings.hidePassword
                  : strings.showPassword
              }
              aria-pressed={viewModel.isPasswordVisible}
              className="rounded-sm opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <img
                src={AppAssets.login.iconEye}
                alt=""
                className="block size-4"
              />
            </button>
          }
        />

        <div className="flex items-center justify-between pt-0.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-strong">
            <input
              type="checkbox"
              checked={viewModel.rememberMe}
              onChange={(event) => {
                viewModel.setRememberMe(event.target.checked);
              }}
              className="size-4 cursor-pointer accent-checkbox"
            />
            {strings.rememberMe}
          </label>
          <button
            type="button"
            onClick={viewModel.forgotPassword}
            className="rounded-sm text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {strings.forgotPassword}
          </button>
        </div>

        <button
          type="submit"
          className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-button transition duration-200 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.99] motion-reduce:transition-none"
        >
          {strings.submit}
          <img
            src={AppAssets.login.iconArrowRight}
            alt=""
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </button>
      </form>

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
