import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppStrings } from "../../../../core/constants/appStrings";
import { LoginScreen } from "./LoginScreen";

const strings = AppStrings.login;

describe("LoginScreen", () => {
  it("renders labelled email and password inputs", () => {
    render(<LoginScreen />);
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
    render(<LoginScreen />);

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
    render(<LoginScreen />);

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
});
