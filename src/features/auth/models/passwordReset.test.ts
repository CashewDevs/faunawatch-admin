import { describe, expect, it } from "vitest";
import {
  getPasswordResetErrorKind,
  hasNewPasswordErrors,
  PasswordPolicy,
  PasswordResetFailure,
  passwordUpdatedState,
  readPasswordUpdated,
  validateNewPassword,
} from "./passwordReset";

const valid = "a".repeat(PasswordPolicy.minLength);

describe("validateNewPassword", () => {
  it("accepts a matching password of the minimum length", () => {
    const errors = validateNewPassword({
      password: valid,
      confirmation: valid,
    });

    expect(errors).toEqual({});
    expect(hasNewPasswordErrors(errors)).toBe(false);
  });

  it("requires both fields", () => {
    const errors = validateNewPassword({ password: "", confirmation: "" });

    expect(errors).toEqual({ password: "required", confirmation: "required" });
    expect(hasNewPasswordErrors(errors)).toBe(true);
  });

  it("refuses a password one character too short", () => {
    const short = "a".repeat(PasswordPolicy.minLength - 1);

    expect(
      validateNewPassword({ password: short, confirmation: short }).password,
    ).toBe("tooShort");
  });

  it("accepts the longest password Supabase allows", () => {
    const longest = "a".repeat(PasswordPolicy.maxBytes);

    expect(
      validateNewPassword({ password: longest, confirmation: longest }),
    ).toEqual({});
  });

  it("refuses a password one byte too long", () => {
    const long = "a".repeat(PasswordPolicy.maxBytes + 1);

    expect(
      validateNewPassword({ password: long, confirmation: long }).password,
    ).toBe("tooLong");
  });

  it("counts bytes, not characters, for the longest password", () => {
    // 37 characters, but each takes two bytes.
    const accented = "é".repeat(37);

    expect(
      validateNewPassword({ password: accented, confirmation: accented })
        .password,
    ).toBe("tooLong");
  });

  it("refuses a confirmation that doesn't match", () => {
    expect(
      validateNewPassword({ password: valid, confirmation: `${valid}b` }),
    ).toEqual({ confirmation: "mismatch" });
  });

  it("doesn't trim spaces, which can be part of a password", () => {
    expect(
      validateNewPassword({ password: `${valid} `, confirmation: valid })
        .confirmation,
    ).toBe("mismatch");
  });
});

describe("getPasswordResetErrorKind", () => {
  it("reads the kind from a reset failure", () => {
    expect(
      getPasswordResetErrorKind(new PasswordResetFailure("linkInvalid")),
    ).toBe("linkInvalid");
  });

  it("treats anything else as unknown", () => {
    expect(getPasswordResetErrorKind(new Error("boom"))).toBe("unknown");
  });
});

describe("readPasswordUpdated", () => {
  it("recognises the state the reset screen leaves", () => {
    expect(readPasswordUpdated(passwordUpdatedState)).toBe(true);
  });

  it.each([null, undefined, "yes", {}, { passwordUpdated: "true" }])(
    "ignores %j",
    (state) => {
      expect(readPasswordUpdated(state)).toBe(false);
    },
  );
});
