import { AppAssets } from "../../../../core/constants/appAssets";
import { AppRoutes } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { ForgotPasswordViewModel } from "../../viewmodels/useForgotPasswordViewModel";
import { AuthCard } from "./AuthCard";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { AuthTextLink } from "./AuthTextLink";
import { LoginInputField } from "./LoginInputField";

interface ForgotPasswordCardProps {
  viewModel: ForgotPasswordViewModel;
}

function FormError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs font-medium text-error">
      {message}
    </p>
  );
}

/**
 * The email form, then the confirmation that replaces it. No Figma design
 * exists for this screen; it reuses the login card's layout and fields.
 */
export function ForgotPasswordCard({ viewModel }: ForgotPasswordCardProps) {
  const strings = AppStrings.forgotPassword;

  if (viewModel.isSent) {
    return (
      <AuthCard
        heading={strings.sentHeading}
        subheading={viewModel.sentMessage ?? ""}
      >
        <div className="flex flex-col gap-5">
          <FormError message={viewModel.formError} />
          <button
            type="button"
            onClick={() => {
              void viewModel.sendAgain();
            }}
            disabled={viewModel.isDisabled}
            aria-busy={viewModel.isSending}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-white text-sm font-semibold text-navy transition duration-200 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            {viewModel.sendAgainLabel}
          </button>
          <AuthTextLink to={AppRoutes.login}>
            {AppStrings.resetPassword.backToLogin}
          </AuthTextLink>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard heading={strings.heading} subheading={strings.subheading}>
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void viewModel.submit();
        }}
      >
        <LoginInputField
          id="forgot-email"
          label={AppStrings.login.emailLabel}
          type="email"
          value={viewModel.email}
          onChange={viewModel.changeEmail}
          iconSrc={AppAssets.login.iconMail}
          autoComplete="email"
          placeholder={AppStrings.login.emailPlaceholder}
          error={viewModel.emailError}
        />

        <FormError message={viewModel.formError} />

        <AuthSubmitButton
          label={viewModel.submitLabel}
          disabled={viewModel.isDisabled}
          isBusy={viewModel.isSending}
        />

        <AuthTextLink to={AppRoutes.login}>
          {AppStrings.resetPassword.backToLogin}
        </AuthTextLink>
      </form>
    </AuthCard>
  );
}
