import { LoadingScreen } from "../../../../core/components/LoadingScreen";
import { AppStrings } from "../../../../core/constants/appStrings";
import { useResetPasswordViewModel } from "../../viewmodels/useResetPasswordViewModel";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { ResetPasswordCard } from "../components/ResetPasswordCard";

/**
 * Where the password reset email's link lands: sets a new password.
 */
export function ResetPasswordScreen() {
  const viewModel = useResetPasswordViewModel();

  if (viewModel.isOpening) {
    return <LoadingScreen label={AppStrings.common.loading} />;
  }

  return (
    <AuthScreenLayout>
      <ResetPasswordCard viewModel={viewModel} />
    </AuthScreenLayout>
  );
}
