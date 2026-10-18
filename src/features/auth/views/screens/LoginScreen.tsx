import { useLoginViewModel } from "../../viewmodels/useLoginViewModel";
import { LoginBrandPanel } from "../components/LoginBrandPanel";
import { LoginCard } from "../components/LoginCard";

/**
 * Admin login screen: brand panel on the left, login card on the right.
 */
export function LoginScreen() {
  const viewModel = useLoginViewModel();

  return (
    <div className="flex min-h-screen bg-background">
      <LoginBrandPanel />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <LoginCard viewModel={viewModel} />
      </main>
    </div>
  );
}
