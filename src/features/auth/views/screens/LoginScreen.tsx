import { useLoginViewModel } from "../../viewmodels/useLoginViewModel";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { LoginCard } from "../components/LoginCard";

/**
 * Admin login screen: brand panel on the left, login card on the right.
 */
export function LoginScreen() {
  const viewModel = useLoginViewModel();

  return (
    <AuthScreenLayout>
      <LoginCard viewModel={viewModel} />
    </AuthScreenLayout>
  );
}
