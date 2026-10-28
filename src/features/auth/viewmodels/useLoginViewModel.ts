import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppStrings } from "../../../core/constants/appStrings";
import { getAuthErrorKind, type AuthErrorKind } from "../models/authSession";
import {
  hasValidationErrors,
  validateLoginCredentials,
  type EmailError,
  type LoginValidationErrors,
  type PasswordError,
} from "../models/loginCredentials";
import { signIn, signInWithGoogle, signOut } from "../services/authService";
import { adminProfileQuery } from "./adminProfileQuery";
import { useAuthSession } from "./authSessionContext";
import { useLoginCooldown } from "./useLoginCooldown";

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
  oauthFailed: AppStrings.login.errors.oauthFailed,
  unknown: AppStrings.login.errors.unknown,
};

/**
 * Presentation state and actions for the admin login screen.
 *
 * Email sign-in: signs in, then asks the backend whether the account is an
 * admin. A non-admin account is signed out again. On success the route
 * guard moves the admin into the dashboard. Repeated wrong passwords lock
 * the form for a while (usability only; Supabase enforces the real limit).
 *
 * Google sign-in: redirects the page to Google. The session provider checks
 * the returning account; its rejection is shown here.
 */
export function useLoginViewModel() {
  const queryClient = useQueryClient();
  const { rejection, clearRejection } = useAuthSession();
  const cooldown = useLoginCooldown();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<LoginValidationErrors>({});
  const [signInError, setSignInError] = useState<AuthErrorKind | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isBusy = isSubmitting || isRedirecting;

  // Back from Google can restore this page from the browser's cache with
  // the redirect still marked as in progress.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setIsRedirecting(false);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const clearSignInError = () => {
    setSignInError(null);
    clearRejection();
  };

  const changeEmail = (value: string) => {
    setEmail(value);
    setErrors((previous) => ({ ...previous, email: undefined }));
    clearSignInError();
  };

  const changePassword = (value: string) => {
    setPassword(value);
    setErrors((previous) => ({ ...previous, password: undefined }));
    clearSignInError();
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((previous) => !previous);
  };

  const submit = async () => {
    if (isBusy || cooldown.isCoolingDown) return;
    const validationErrors = validateLoginCredentials({ email, password });
    setErrors(validationErrors);
    clearSignInError();
    if (hasValidationErrors(validationErrors)) return;

    setIsSubmitting(true);
    let isSignedIn = false;
    try {
      const user = await signIn({ email, password }, rememberMe);
      isSignedIn = true;
      cooldown.recordSignInResult(null);
      const admin = await queryClient.query(adminProfileQuery(user));
      if (!admin) {
        await signOut();
        setSignInError("notAdmin");
      }
    } catch (error) {
      const kind = getAuthErrorKind(error);
      // Never keep a session whose admin access could not be confirmed.
      if (isSignedIn) await signOut();
      else cooldown.recordSignInResult(kind);
      // The cooldown message explains a rate limit while it lasts.
      setSignInError(kind === "rateLimited" ? null : kind);
    } finally {
      setIsSubmitting(false);
    }
  };

  const continueWithGoogle = async () => {
    if (isBusy) return;
    clearSignInError();
    setIsRedirecting(true);
    try {
      // Stays "redirecting" on success: the page is leaving for Google.
      await signInWithGoogle(rememberMe);
    } catch (error) {
      setSignInError(getAuthErrorKind(error));
      setIsRedirecting(false);
    }
  };

  const forgotPassword = () => {
    // TODO(auth): The forgot-password flow is not designed or specified yet.
  };

  const shownError = signInError ?? rejection;
  const { submitCooldownPrefix, secondsSuffix } = AppStrings.login;

  return {
    email,
    password,
    rememberMe,
    isPasswordVisible,
    isSubmitting,
    isRedirecting,
    isBusy,
    isSubmitDisabled: isBusy || cooldown.isCoolingDown,
    /** Log In button text while locked, e.g. "Try again in 25s". */
    cooldownLabel: cooldown.isCoolingDown
      ? `${submitCooldownPrefix} ${String(cooldown.remainingSeconds)}${secondsSuffix}`
      : undefined,
    emailError: errors.email && emailErrorMessages[errors.email],
    passwordError: errors.password && passwordErrorMessages[errors.password],
    signInError: cooldown.isCoolingDown
      ? AppStrings.login.errors.cooldown
      : shownError
        ? signInErrorMessages[shownError]
        : undefined,
    changeEmail,
    changePassword,
    setRememberMe,
    togglePasswordVisibility,
    submit,
    continueWithGoogle,
    forgotPassword,
  };
}

export type LoginViewModel = ReturnType<typeof useLoginViewModel>;
