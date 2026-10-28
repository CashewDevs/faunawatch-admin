import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppStrings } from "../../../core/constants/appStrings";
import { getAuthErrorKind, type AuthErrorKind } from "../models/authSession";
import {
  hasValidationErrors,
  validateLoginCredentials,
  type EmailError,
  type LoginValidationErrors,
  type PasswordError,
} from "../models/loginCredentials";
import { signIn, signOut } from "../services/authService";
import { adminProfileQuery } from "./adminProfileQuery";

const emailErrorMessages: Record<EmailError, string> = {
  required: AppStrings.login.errors.emailRequired,
  invalid: AppStrings.login.errors.emailInvalid,
};

const passwordErrorMessages: Record<PasswordError, string> = {
  required: AppStrings.login.errors.passwordRequired,
};

const signInErrorMessages: Record<AuthErrorKind, string> = {
  invalidCredentials: AppStrings.login.errors.invalidCredentials,
  emailNotConfirmed: AppStrings.login.errors.emailNotConfirmed,
  rateLimited: AppStrings.login.errors.rateLimited,
  network: AppStrings.login.errors.network,
  notAdmin: AppStrings.login.errors.notAdmin,
  unknown: AppStrings.login.errors.unknown,
};

/**
 * Presentation state and actions for the admin login screen.
 *
 * Signs in, then asks the backend whether the account is an admin. A
 * non-admin account is signed out again. On success the route guard
 * moves the admin into the dashboard.
 */
export function useLoginViewModel() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<LoginValidationErrors>({});
  const [signInError, setSignInError] = useState<AuthErrorKind | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const changeEmail = (value: string) => {
    setEmail(value);
    setErrors((previous) => ({ ...previous, email: undefined }));
    setSignInError(null);
  };

  const changePassword = (value: string) => {
    setPassword(value);
    setErrors((previous) => ({ ...previous, password: undefined }));
    setSignInError(null);
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((previous) => !previous);
  };

  const submit = async () => {
    if (isSubmitting) return;
    const validationErrors = validateLoginCredentials({ email, password });
    setErrors(validationErrors);
    setSignInError(null);
    if (hasValidationErrors(validationErrors)) return;

    setIsSubmitting(true);
    let isSignedIn = false;
    try {
      const user = await signIn({ email, password }, rememberMe);
      isSignedIn = true;
      const admin = await queryClient.query(adminProfileQuery(user));
      if (!admin) {
        await signOut();
        setSignInError("notAdmin");
      }
    } catch (error) {
      // Never keep a session whose admin access could not be confirmed.
      if (isSignedIn) await signOut();
      setSignInError(getAuthErrorKind(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const forgotPassword = () => {
    // TODO(auth): The forgot-password flow is not designed or specified yet.
  };

  return {
    email,
    password,
    rememberMe,
    isPasswordVisible,
    isSubmitting,
    emailError: errors.email && emailErrorMessages[errors.email],
    passwordError: errors.password && passwordErrorMessages[errors.password],
    signInError: signInError ? signInErrorMessages[signInError] : undefined,
    changeEmail,
    changePassword,
    setRememberMe,
    togglePasswordVisibility,
    submit,
    forgotPassword,
  };
}

export type LoginViewModel = ReturnType<typeof useLoginViewModel>;
