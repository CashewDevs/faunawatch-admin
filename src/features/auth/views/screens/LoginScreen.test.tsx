import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppStrings } from "../../../../core/constants/appStrings";
import { createQueryWrapper } from "../../../../test/queryWrapper";
import {
  AuthFailure,
  type SessionSource,
  type SessionUser,
} from "../../models/authSession";
import {
  fetchAdminProfile,
  getOAuthRedirectFailure,
  onSessionChange,
  signIn,
  signInWithGoogle,
  signOut,
} from "../../services/authService";
import { AuthSessionProvider } from "../../viewmodels/AuthSessionProvider";
import { LoginScreen } from "./LoginScreen";

vi.mock("../../services/authService", () => ({
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  fetchAdminProfile: vi.fn(),
  onSessionChange: vi.fn(),
  getOAuthRedirectFailure: vi.fn(),
}));

const strings = AppStrings.login;
const googleButtonName = strings.googleButtonLabel;

let emitSession: (
  user: SessionUser | null,
  source: SessionSource,
) => void = () => undefined;

function renderLogin() {
  const QueryWrapper = createQueryWrapper();
  return render(<LoginScreen />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryWrapper>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </QueryWrapper>
    ),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(onSessionChange).mockImplementation((callback) => {
    emitSession = callback;
    return () => undefined;
  });
  vi.mocked(getOAuthRedirectFailure).mockResolvedValue(null);
  vi.mocked(signOut).mockResolvedValue();
  window.localStorage.clear();
});

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

  it('offers Google sign-in under an "or continue with" divider', () => {
    renderLogin();

    expect(screen.getByText(strings.googleDivider)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: googleButtonName }),
    ).toBeEnabled();
  });

  it("starts Google sign-in with the remember-me choice and disables both buttons", async () => {
    vi.mocked(signInWithGoogle).mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByLabelText(strings.rememberMe));
    await user.click(screen.getByRole("button", { name: googleButtonName }));

    expect(signInWithGoogle).toHaveBeenCalledWith(true);
    expect(
      screen.getByRole("button", { name: strings.googleRedirecting }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: strings.submit })).toBeDisabled();
  });

  it("disables Google sign-in while logging in with email", async () => {
    vi.mocked(signIn).mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(strings.emailLabel), "a@b.co");
    await user.type(screen.getByLabelText(strings.passwordLabel), "secret");
    await user.click(screen.getByRole("button", { name: strings.submit }));

    expect(
      screen.getByRole("button", { name: googleButtonName }),
    ).toBeDisabled();
  });

  it("explains a non-admin Google account after it returns", async () => {
    vi.mocked(fetchAdminProfile).mockResolvedValue(null);
    renderLogin();

    act(() => {
      emitSession({ id: "user-2", email: "someone@example.org" }, "restored");
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      strings.errors.notAdmin,
    );
    expect(signOut).toHaveBeenCalled();
  });

  it("explains a Google sign-in that didn't complete", async () => {
    vi.mocked(getOAuthRedirectFailure).mockResolvedValue(
      new AuthFailure("oauthFailed"),
    );
    renderLogin();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      strings.errors.oauthFailed,
    );
  });

  it("keeps Log In locked with a countdown after a refresh", () => {
    const now = Date.now();
    window.localStorage.setItem(
      "faunawatch-admin.login-cooldown",
      JSON.stringify({
        failures: 5,
        lastFailureAt: now,
        lockedUntil: now + 30_000,
      }),
    );
    renderLogin();

    expect(screen.getByRole("alert")).toHaveTextContent(
      strings.errors.cooldown,
    );
    expect(
      screen.getByRole("button", { name: /^Try again in \d+s$/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: googleButtonName }),
    ).toBeEnabled();
  });
});
