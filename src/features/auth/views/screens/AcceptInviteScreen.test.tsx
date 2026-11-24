import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import { createRouterQueryWrapper } from "../../../../test/routerWrapper";
import { PasswordResetFailure } from "../../models/passwordReset";
import { fetchAdminProfile, signOut } from "../../services/authService";
import {
  readRecoveryArrival,
  updatePassword,
  verifyRecoveryToken,
} from "../../services/passwordResetService";
import { AcceptInviteScreen } from "./AcceptInviteScreen";

vi.mock("../../services/authService", () => ({
  signOut: vi.fn(),
  fetchAdminProfile: vi.fn(),
}));

vi.mock("../../services/passwordResetService", () => ({
  readRecoveryArrival: vi.fn(),
  clearRecoveryUrl: vi.fn(),
  endRecovery: vi.fn(),
  exchangeRecoveryCode: vi.fn(),
  resumeRecoverySession: vi.fn(),
  verifyRecoveryToken: vi.fn(),
  updatePassword: vi.fn(),
}));

const strings = AppStrings.acceptInvite;

function renderScreen() {
  return render(
    <Routes>
      <Route path={AppRoutes.acceptInvite} element={<AcceptInviteScreen />} />
      <Route path={AppRoutes.login} element={<p>Login page</p>} />
    </Routes>,
    { wrapper: createRouterQueryWrapper(AppRoutes.acceptInvite) },
  );
}

async function submitForm(password = "NewPassword2") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(strings.passwordLabel), password);
  await user.type(screen.getByLabelText(strings.confirmationLabel), password);
  await user.click(screen.getByRole("button", { name: strings.submit }));
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readRecoveryArrival).mockReturnValue({
    kind: "token",
    tokenHash: "token-1",
  });
  vi.mocked(verifyRecoveryToken).mockResolvedValue({
    id: "user-1",
    email: "admin@example.org",
  });
  vi.mocked(updatePassword).mockResolvedValue();
  vi.mocked(signOut).mockResolvedValue();
  vi.mocked(fetchAdminProfile).mockResolvedValue({
    id: "user-1",
    displayName: "Maria",
  });
});

describe("AcceptInviteScreen", () => {
  it("welcomes the new admin with the password form", () => {
    renderScreen();
    expect(
      screen.getByRole("heading", { name: strings.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(strings.subheading)).toBeInTheDocument();
  });

  it("uses the invitation only on Save, sets the password, then log in", async () => {
    renderScreen();
    expect(verifyRecoveryToken).not.toHaveBeenCalled();

    await submitForm();

    await waitFor(() => {
      expect(screen.getByText("Login page")).toBeInTheDocument();
    });
    expect(verifyRecoveryToken).toHaveBeenCalledWith("token-1", "invite");
    expect(updatePassword).toHaveBeenCalledWith("NewPassword2");
    expect(signOut).toHaveBeenCalled();
  });

  it("a used or expired invitation says to ask for a new one, with no reset link", async () => {
    vi.mocked(verifyRecoveryToken).mockRejectedValue(
      new PasswordResetFailure("linkInvalid"),
    );
    renderScreen();
    await submitForm();

    expect(
      await screen.findByRole("heading", { name: strings.blockedHeading }),
    ).toBeInTheDocument();
    expect(screen.getByText(strings.blocked.linkInvalid)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: AppStrings.resetPassword.requestNewLink,
      }),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: strings.backToLogin }),
    ).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it("an account without admin access is signed out", async () => {
    vi.mocked(fetchAdminProfile).mockResolvedValue(null);
    renderScreen();
    await submitForm();

    expect(
      await screen.findByText(strings.blocked.notAdmin),
    ).toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it("opened without a link", () => {
    vi.mocked(readRecoveryArrival).mockReturnValue({ kind: "none" });
    renderScreen();
    expect(screen.getByText(strings.blocked.linkInvalid)).toBeInTheDocument();
  });
});
