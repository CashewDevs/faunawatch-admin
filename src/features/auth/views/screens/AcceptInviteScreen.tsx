import { LoadingScreen } from "../../../../core/components/LoadingScreen";
import { AppStrings } from "../../../../core/constants/appStrings";
import { useResetPasswordViewModel } from "../../viewmodels/useResetPasswordViewModel";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { ResetPasswordCard } from "../components/ResetPasswordCard";

/**
 * Where an admin invitation's link lands (`#token_hash=…`): the new admin
 * chooses a password. Works like Reset password: the link is only used when
 * Save is pressed, a non-admin is signed out, and afterwards they log in.
 */
export function AcceptInviteScreen() {
  const viewModel = useResetPasswordViewModel("invite");

  if (viewModel.isOpening) {
    return <LoadingScreen label={AppStrings.common.loading} />;
  }

  return (
    <AuthScreenLayout>
      <ResetPasswordCard
        viewModel={viewModel}
        strings={AppStrings.acceptInvite}
      />
    </AuthScreenLayout>
  );
}
