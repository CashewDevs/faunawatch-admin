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
  readRecoveryToken,
  updatePassword,
  verifyRecoveryToken,
} from "../../services/passwordResetService";
import { ResetPasswordScreen } from "./ResetPasswordScreen";

vi.mock("../../services/authService", () => ({
  signOut: vi.fn(),
  fetchAdminProfile: vi.fn(),
}));

vi.mock("../../services/passwordResetService", () => ({
  readRecoveryToken: vi.fn(),
  clearRecoveryToken: vi.fn(),
  verifyRecoveryToken: vi.fn(),
  updatePassword: vi.fn(),
}));

const strings = AppStrings.resetPassword;

function renderScreen() {
  return render(
    <Routes>
      <Route path={AppRoutes.resetPassword} element={<ResetPasswordScreen />} />
      <Route path={AppRoutes.login} element={<p>Login page</p>} />
    </Routes>,
    { wrapper: createRouterQueryWrapper(AppRoutes.resetPassword) },
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
  vi.mocked(readRecoveryToken).mockReturnValue("token-1");
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

describe("ResetPasswordScreen", () => {
  it("shows the form, warning that the app's password changes too", () => {
    renderScreen();

    expect(
      screen.getByRole("heading", { name: strings.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(strings.subheading)).toBeInTheDocument();
  });

  it("helps password managers suggest a new password", () => {
    renderScreen();

    expect(screen.getByLabelText(strings.passwordLabel)).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByLabelText(strings.confirmationLabel)).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });

  it("shows and hides both passwords together", async () => {
    const user = userEvent.setup();
    renderScreen();
    const password = screen.getByLabelText(strings.passwordLabel);
    const confirmation = screen.getByLabelText(strings.confirmationLabel);
    expect(password).toHaveAttribute("type", "password");

    const [toggle] = screen.getAllByRole("button", {
      name: AppStrings.login.showPassword,
    });
    if (!toggle) throw new Error("Toggle not found");
    await user.click(toggle);

    expect(password).toHaveAttribute("type", "text");
    expect(confirmation).toHaveAttribute("type", "text");
  });

  it("goes to the login page after saving", async () => {
    renderScreen();

    await submitForm();

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(updatePassword).toHaveBeenCalledWith("NewPassword2");
  });

  it("links back to login when there is no token", () => {
    vi.mocked(readRecoveryToken).mockReturnValue(null);
    renderScreen();

    expect(
      screen.getByRole("heading", { name: strings.blockedHeading }),
    ).toBeInTheDocument();
    expect(screen.getByText(strings.blocked.linkInvalid)).toBeInTheDocument();
    expect(screen.queryByLabelText(strings.passwordLabel)).toBeNull();
    expect(
      screen.getByRole("link", { name: strings.backToLogin }),
    ).toHaveAttribute("href", AppRoutes.login);
  });

  it("replaces the form when the link turns out to be used", async () => {
    vi.mocked(verifyRecoveryToken).mockRejectedValue(
      new PasswordResetFailure("linkInvalid"),
    );
    renderScreen();

    await submitForm();

    expect(
      await screen.findByText(strings.blocked.linkInvalid),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(strings.passwordLabel)).toBeNull();
  });

  it("tells a non-admin the password hasn't changed", async () => {
    vi.mocked(fetchAdminProfile).mockResolvedValue(null);
    renderScreen();

    await submitForm();

    expect(
      await screen.findByText(strings.blocked.notAdmin),
    ).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it("marks the field when the password is refused", async () => {
    vi.mocked(updatePassword).mockRejectedValue(
      new PasswordResetFailure("samePassword"),
    );
    renderScreen();

    await submitForm();

    expect(
      await screen.findByText(strings.errors.passwordSame),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(strings.passwordLabel)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("announces a connection problem", async () => {
    vi.mocked(updatePassword).mockRejectedValue(
      new PasswordResetFailure("network"),
    );
    renderScreen();

    await submitForm();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        AppStrings.login.errors.network,
      );
    });
  });
});
