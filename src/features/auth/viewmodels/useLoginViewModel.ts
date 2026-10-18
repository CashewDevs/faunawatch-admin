import { useState } from "react";
import { AppStrings } from "../../../core/constants/appStrings";
import {
  hasValidationErrors,
  validateLoginCredentials,
  type EmailError,
  type LoginValidationErrors,
  type PasswordError,
} from "../models/loginCredentials";

const emailErrorMessages: Record<EmailError, string> = {
  required: AppStrings.login.errors.emailRequired,
  invalid: AppStrings.login.errors.emailInvalid,
};

const passwordErrorMessages: Record<PasswordError, string> = {
  required: AppStrings.login.errors.passwordRequired,
};

/**
 * Presentation state and actions for the admin login screen.
 */
export function useLoginViewModel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<LoginValidationErrors>({});

  const changeEmail = (value: string) => {
    setEmail(value);
    setErrors((previous) => ({ ...previous, email: undefined }));
  };

  const changePassword = (value: string) => {
    setPassword(value);
    setErrors((previous) => ({ ...previous, password: undefined }));
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((previous) => !previous);
  };

  const submit = () => {
    const validationErrors = validateLoginCredentials({ email, password });
    setErrors(validationErrors);
    if (hasValidationErrors(validationErrors)) return;

    // TODO(auth): Sign in through an auth Service (Supabase Auth) and verify
    // the admin role. Blocked: the admin role table/column is not defined
    // yet — the schema is owned by the mobile app/backend. Also decide what
    // "Remember me" should do, since Supabase persists sessions by default.
  };

  const forgotPassword = () => {
    // TODO(auth): The forgot-password flow is not designed or specified yet.
  };

  return {
    email,
    password,
    rememberMe,
    isPasswordVisible,
    emailError: errors.email && emailErrorMessages[errors.email],
    passwordError: errors.password && passwordErrorMessages[errors.password],
    changeEmail,
    changePassword,
    setRememberMe,
    togglePasswordVisibility,
    submit,
    forgotPassword,
  };
}

export type LoginViewModel = ReturnType<typeof useLoginViewModel>;
