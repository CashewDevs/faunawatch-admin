/**
 * Password reset domain model: the rules for a new password, and the
 * failures the reset screen can explain.
 */

export const PasswordPolicy = {
  /** Above Supabase's minimum, for this form only. Supabase still checks. */
  minLength: 8,
  /** Supabase refuses longer passwords (a limit of its bcrypt hashing). */
  maxBytes: 72,
} as const;

export interface NewPasswordInput {
  password: string;
  confirmation: string;
}

export type NewPasswordError = "required" | "tooShort" | "tooLong";
export type ConfirmationError = "required" | "mismatch";

export interface NewPasswordErrors {
  password?: NewPasswordError;
  confirmation?: ConfirmationError;
}

function validatePassword(password: string): NewPasswordError | undefined {
  if (password === "") return "required";
  if (password.length < PasswordPolicy.minLength) return "tooShort";
  if (new TextEncoder().encode(password).length > PasswordPolicy.maxBytes) {
    return "tooLong";
  }
  return undefined;
}

/** Validates the form. Returns an empty object when the input is valid. */
export function validateNewPassword({
  password,
  confirmation,
}: NewPasswordInput): NewPasswordErrors {
  const errors: NewPasswordErrors = {};
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;

  if (confirmation === "") errors.confirmation = "required";
  else if (confirmation !== password) errors.confirmation = "mismatch";

  return errors;
}

export function hasNewPasswordErrors(errors: NewPasswordErrors): boolean {
  return errors.password !== undefined || errors.confirmation !== undefined;
}

export type PasswordResetErrorKind =
  | "linkInvalid"
  | "weakPassword"
  | "samePassword"
  | "rateLimited"
  | "network"
  | "unknown";

/** A reset failure, already translated from Supabase errors. */
export class PasswordResetFailure extends Error {
  readonly kind: PasswordResetErrorKind;

  constructor(kind: PasswordResetErrorKind) {
    super(`Password reset failure: ${kind}`);
    this.name = "PasswordResetFailure";
    this.kind = kind;
  }
}

export function getPasswordResetErrorKind(
  error: unknown,
): PasswordResetErrorKind {
  return error instanceof PasswordResetFailure ? error.kind : "unknown";
}

/** Why the reset screen can't offer the form. */
export type ResetBlockReason = "linkInvalid" | "notAdmin" | "checkFailed";

/** Router state the login screen reads to confirm a finished reset. */
export interface PasswordUpdatedState {
  passwordUpdated: true;
}

export const passwordUpdatedState: PasswordUpdatedState = {
  passwordUpdated: true,
};

export function readPasswordUpdated(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    "passwordUpdated" in state &&
    state.passwordUpdated === true
  );
}
