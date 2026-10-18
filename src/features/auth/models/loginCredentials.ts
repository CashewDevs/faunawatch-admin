/**
 * Login form domain model and validation.
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

export type EmailError = "required" | "invalid";
export type PasswordError = "required";

export interface LoginValidationErrors {
  email?: EmailError;
  password?: PasswordError;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates login input. Returns an empty object when the input is valid. */
export function validateLoginCredentials({
  email,
  password,
}: LoginCredentials): LoginValidationErrors {
  const errors: LoginValidationErrors = {};
  const trimmedEmail = email.trim();

  if (trimmedEmail === "") {
    errors.email = "required";
  } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = "invalid";
  }

  if (password === "") {
    errors.password = "required";
  }

  return errors;
}

export function hasValidationErrors(errors: LoginValidationErrors): boolean {
  return errors.email !== undefined || errors.password !== undefined;
}
