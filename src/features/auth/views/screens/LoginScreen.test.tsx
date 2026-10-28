import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppStrings } from "../../../../core/constants/appStrings";
import { createQueryWrapper } from "../../../../test/queryWrapper";
import { AuthFailure } from "../../models/authSession";
import { signIn } from "../../services/authService";
import { LoginScreen } from "./LoginScreen";

vi.mock("../../services/authService", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  fetchAdminProfile: vi.fn(),
}));

const strings = AppStrings.login;

function renderLogin() {
  return render(<LoginScreen />, { wrapper: createQueryWrapper() });
}

describe("LoginScreen", () => {
  it("renders labelled email and password inputs", () => {
    renderLogin();
    expect(
      screen.getByRole("heading", { name: strings.heading }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(strings.emailLabel)).toHaveAttribute(
      "type",
      "email",
    );
    expect(screen.getByLabelText(strings.passwordLabel)).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("shows and hides the password", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(
      screen.getByRole("button", { name: strings.showPassword }),
    );
    expect(screen.getByLabelText(strings.passwordLabel)).toHaveAttribute(
      "type",
      "text",
    );

    await user.click(
      screen.getByRole("button", { name: strings.hidePassword }),
    );
    expect(screen.getByLabelText(strings.passwordLabel)).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("shows validation errors linked to the inputs on empty submit", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole("button", { name: strings.submit }));

    const emailInput = screen.getByLabelText(strings.emailLabel);
    expect(emailInput).toHaveAttribute("aria-invalid", "true");
    expect(emailInput).toHaveAccessibleDescription(
      strings.errors.emailRequired,
    );
    expect(
      screen.getByText(strings.errors.passwordRequired),
    ).toBeInTheDocument();
  });

  it("shows a sign-in failure above the Log In button", async () => {
    vi.mocked(signIn).mockRejectedValue(new AuthFailure("invalidCredentials"));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(strings.emailLabel), "a@b.co");
    await user.type(screen.getByLabelText(strings.passwordLabel), "secret");
    await user.click(screen.getByRole("button", { name: strings.submit }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      strings.errors.invalidCredentials,
    );
  });

  it("disables the button while logging in", async () => {
    vi.mocked(signIn).mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(strings.emailLabel), "a@b.co");
    await user.type(screen.getByLabelText(strings.passwordLabel), "secret");
    await user.click(screen.getByRole("button", { name: strings.submit }));

    expect(
      screen.getByRole("button", { name: strings.submitting }),
    ).toBeDisabled();
  });
});
