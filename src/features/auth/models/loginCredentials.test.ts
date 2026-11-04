import { describe, expect, it } from "vitest";
import {
  hasValidationErrors,
  validateEmail,
  validateLoginCredentials,
} from "./loginCredentials";

describe("validateLoginCredentials", () => {
  it("returns no errors for valid input", () => {
    const errors = validateLoginCredentials({
      email: "admin@faunawatch.com",
      password: "secret",
    });
    expect(errors).toEqual({});
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it("requires email and password", () => {
    const errors = validateLoginCredentials({ email: "  ", password: "" });
    expect(errors).toEqual({ email: "required", password: "required" });
    expect(hasValidationErrors(errors)).toBe(true);
  });

  it("rejects a malformed email", () => {
    const errors = validateLoginCredentials({
      email: "not-an-email",
      password: "secret",
    });
    expect(errors).toEqual({ email: "invalid" });
  });

  it("ignores surrounding whitespace in the email", () => {
    const errors = validateLoginCredentials({
      email: "  admin@faunawatch.com ",
      password: "secret",
    });
    expect(errors).toEqual({});
  });
});

describe("validateEmail", () => {
  it.each([
    ["admin@faunawatch.com", undefined],
    ["  admin@faunawatch.com ", undefined],
    ["", "required"],
    ["   ", "required"],
    ["not-an-email", "invalid"],
    ["admin@faunawatch", "invalid"],
  ])("%j gives %s", (email, error) => {
    expect(validateEmail(email)).toBe(error);
  });
});
