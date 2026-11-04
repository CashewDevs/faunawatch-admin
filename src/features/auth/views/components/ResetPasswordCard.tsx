import { Link } from "react-router";
import { AppAssets } from "../../../../core/constants/appAssets";
import { AppRoutes } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { ResetPasswordViewModel } from "../../viewmodels/useResetPasswordViewModel";
import { AuthCard } from "./AuthCard";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { LoginInputField } from "./LoginInputField";
import { PasswordVisibilityToggle } from "./PasswordVisibilityToggle";

interface ResetPasswordCardProps {
  viewModel: ResetPasswordViewModel;
}

/**
 * The new-password form, or why it can't be offered. No Figma design exists
 * for this screen; it reuses the login card's layout and fields.
 */
export function ResetPasswordCard({ viewModel }: ResetPasswordCardProps) {
  const strings = AppStrings.resetPassword;

  if (viewModel.blockedMessage) {
    return (
      <AuthCard
        heading={strings.blockedHeading}
        subheading={viewModel.blockedMessage}
      >
        <Link
          to={AppRoutes.login}
          className="self-center rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {strings.backToLogin}
        </Link>
      </AuthCard>
    );
  }

  const passwordType = viewModel.isPasswordVisible ? "text" : "password";
  const visibilityToggle = (
    <PasswordVisibilityToggle
      isVisible={viewModel.isPasswordVisible}
      onToggle={viewModel.togglePasswordVisibility}
    />
  );

  return (
    <AuthCard heading={strings.heading} subheading={strings.subheading}>
      <form
        noValidate
        className="flex flex-col gap-5 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          void viewModel.submit();
        }}
      >
        <LoginInputField
          id="reset-password"
          label={strings.passwordLabel}
          type={passwordType}
          value={viewModel.password}
          onChange={viewModel.changePassword}
          iconSrc={AppAssets.login.iconLock}
          autoComplete="new-password"
          placeholder={strings.passwordPlaceholder}
          error={viewModel.passwordError}
          trailing={visibilityToggle}
        />

        <LoginInputField
          id="reset-confirmation"
          label={strings.confirmationLabel}
          type={passwordType}
          value={viewModel.confirmation}
          onChange={viewModel.changeConfirmation}
          iconSrc={AppAssets.login.iconLock}
          autoComplete="new-password"
          placeholder={strings.confirmationPlaceholder}
          error={viewModel.confirmationError}
          trailing={visibilityToggle}
        />

        {viewModel.formError && (
          <p role="alert" className="text-xs font-medium text-error">
            {viewModel.formError}
          </p>
        )}

        <AuthSubmitButton
          label={viewModel.isSubmitting ? strings.submitting : strings.submit}
          disabled={viewModel.isSubmitting}
          isBusy={viewModel.isSubmitting}
        />
      </form>
    </AuthCard>
  );
}
