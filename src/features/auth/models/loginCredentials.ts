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

/** Validates an email address. Returns undefined when it is valid. */
export function validateEmail(email: string): EmailError | undefined {
  const trimmedEmail = email.trim();
  if (trimmedEmail === "") return "required";
  return EMAIL_PATTERN.test(trimmedEmail) ? undefined : "invalid";
}

/** Validates login input. Returns an empty object when the input is valid. */
export function validateLoginCredentials({
  email,
  password,
}: LoginCredentials): LoginValidationErrors {
  const errors: LoginValidationErrors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  if (password === "") {
    errors.password = "required";
  }

  return errors;
}

export function hasValidationErrors(errors: LoginValidationErrors): boolean {
  return errors.email !== undefined || errors.password !== undefined;
}
