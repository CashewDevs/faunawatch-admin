import { Link } from "react-router";
import { AppAssets } from "../../../../core/constants/appAssets";
import { AppRoutes } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { LoginViewModel } from "../../viewmodels/useLoginViewModel";
import { AuthCard } from "./AuthCard";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { LoginInputField } from "./LoginInputField";
import { PasswordVisibilityToggle } from "./PasswordVisibilityToggle";

interface LoginCardProps {
  viewModel: LoginViewModel;
}

/**
 * White login card: brand header, heading, credentials form, Google
 * sign-in and footer note.
 */
export function LoginCard({ viewModel }: LoginCardProps) {
  const strings = AppStrings.login;

  return (
    <AuthCard heading={strings.heading} subheading={strings.subheading}>
      {/* No Figma design for this confirmation. */}
      {viewModel.notice && (
        <p
          role="status"
          className="rounded-xl bg-teal-soft px-3.5 py-2.5 text-xs font-medium text-navy"
        >
          {viewModel.notice}
        </p>
      )}

      <form
        noValidate
        className="flex flex-col gap-5 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          void viewModel.submit();
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
            <PasswordVisibilityToggle
              isVisible={viewModel.isPasswordVisible}
              onToggle={viewModel.togglePasswordVisibility}
            />
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
          <Link
            to={AppRoutes.forgotPassword}
            className="rounded-sm text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {strings.forgotPassword}
          </Link>
        </div>

        {/* No Figma design for sign-in errors; styled like the field errors. */}
        {viewModel.signInError && (
          <p role="alert" className="text-xs font-medium text-error">
            {viewModel.signInError}
          </p>
        )}

        <AuthSubmitButton
          label={
            viewModel.isSubmitting
              ? strings.submitting
              : (viewModel.cooldownLabel ?? strings.submit)
          }
          disabled={viewModel.isSubmitDisabled}
          isBusy={viewModel.isSubmitting}
        />
      </form>

      {/* Divider and Google button follow the mobile Login frame; the admin
          frame has no Google sign-in, so the card's own tokens are used. */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 text-xs font-medium text-muted">
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
          {strings.googleDivider}
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={() => {
            void viewModel.continueWithGoogle();
          }}
          disabled={viewModel.isBusy}
          aria-busy={viewModel.isRedirecting}
          aria-label={
            viewModel.isRedirecting ? undefined : strings.googleButtonLabel
          }
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white text-sm font-semibold text-navy transition duration-200 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.99] disabled:cursor-wait disabled:opacity-80 motion-reduce:transition-none"
        >
          <img
            src={AppAssets.login.iconGoogle}
            alt=""
            className="size-4.5 shrink-0"
          />
          {viewModel.isRedirecting
            ? strings.googleRedirecting
            : strings.googleButton}
        </button>
      </div>
    </AuthCard>
  );
}
