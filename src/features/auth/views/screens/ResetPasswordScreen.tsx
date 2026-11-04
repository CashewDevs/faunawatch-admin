import { useResetPasswordViewModel } from "../../viewmodels/useResetPasswordViewModel";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { ResetPasswordCard } from "../components/ResetPasswordCard";

/**
 * Where the password reset email's link lands: sets a new password.
 */
export function ResetPasswordScreen() {
  const viewModel = useResetPasswordViewModel();

  return (
    <AuthScreenLayout>
      <ResetPasswordCard viewModel={viewModel} />
    </AuthScreenLayout>
  );
}
