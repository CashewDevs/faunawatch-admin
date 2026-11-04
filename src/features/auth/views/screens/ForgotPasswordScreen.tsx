import { useForgotPasswordViewModel } from "../../viewmodels/useForgotPasswordViewModel";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { ForgotPasswordCard } from "../components/ForgotPasswordCard";

/**
 * Asks for an email address and sends a password reset link to it.
 */
export function ForgotPasswordScreen() {
  const viewModel = useForgotPasswordViewModel();

  return (
    <AuthScreenLayout>
      <ForgotPasswordCard viewModel={viewModel} />
    </AuthScreenLayout>
  );
}
