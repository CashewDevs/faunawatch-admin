import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import { createRouterQueryWrapper } from "../../../../test/routerWrapper";
import { PasswordResetFailure } from "../../models/passwordReset";
import { requestPasswordReset } from "../../services/passwordResetService";
import { ForgotPasswordScreen } from "./ForgotPasswordScreen";

vi.mock("../../services/passwordResetService", () => ({
  requestPasswordReset: vi.fn(),
}));

const strings = AppStrings.forgotPassword;
const email = "admin@example.org";

function renderScreen() {
  return render(<ForgotPasswordScreen />, {
    wrapper: createRouterQueryWrapper(AppRoutes.forgotPassword),
  });
}

async function sendLink(address = email) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(AppStrings.login.emailLabel), address);
  await user.click(screen.getByRole("button", { name: strings.submit }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requestPasswordReset).mockResolvedValue();
});

describe("ForgotPasswordScreen", () => {
  it("asks for an email and links back to login", () => {
    renderScreen();

    expect(
      screen.getByRole("heading", { name: strings.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: AppStrings.resetPassword.backToLogin }),
    ).toHaveAttribute("href", AppRoutes.login);
  });

  it("replaces the form with a confirmation that names the address", async () => {
    renderScreen();

    await sendLink();

    expect(
      await screen.findByRole("heading", { name: strings.sentHeading }),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(email))).toBeInTheDocument();
    expect(screen.queryByLabelText(AppStrings.login.emailLabel)).toBeNull();
    expect(
      screen.getByRole("link", { name: AppStrings.resetPassword.backToLogin }),
    ).toBeInTheDocument();
  });

  it("makes the admin wait before sending again", async () => {
    renderScreen();

    await sendLink();

    const again = await screen.findByRole("button", {
      name: new RegExp(strings.sendAgain),
    });
    expect(again).toBeDisabled();
    expect(again).toHaveTextContent(/60s/);
  });

  it("shows a field error for a bad address", async () => {
    renderScreen();

    await sendLink("not-an-email");

    expect(
      await screen.findByText(AppStrings.login.errors.emailInvalid),
    ).toBeInTheDocument();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("announces a connection problem and keeps the form", async () => {
    vi.mocked(requestPasswordReset).mockRejectedValue(
      new PasswordResetFailure("network"),
    );
    renderScreen();

    await sendLink();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      AppStrings.login.errors.network,
    );
    expect(
      screen.getByLabelText(AppStrings.login.emailLabel),
    ).toBeInTheDocument();
  });
});
