import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { AppRoutes } from "../../../core/constants/appRoutes";
import { AppStrings } from "../../../core/constants/appStrings";
import {
  getPasswordResetErrorKind,
  hasNewPasswordErrors,
  passwordUpdatedState,
  validateNewPassword,
  type ConfirmationError,
  type NewPasswordError,
  type PasswordResetErrorKind,
  type ResetBlockReason,
} from "../models/passwordReset";
import { signOut } from "../services/authService";
import {
  clearRecoveryToken,
  readRecoveryToken,
  updatePassword,
  verifyRecoveryToken,
} from "../services/passwordResetService";
import { adminProfileQuery } from "./adminProfileQuery";

type PasswordFieldError = NewPasswordError | "weakPassword" | "samePassword";

type FormError = "rateLimited" | "network" | "unknown";

const { errors: errorStrings, blocked: blockedStrings } =
  AppStrings.resetPassword;

const passwordErrorMessages: Record<PasswordFieldError, string> = {
  required: errorStrings.passwordRequired,
  tooShort: errorStrings.passwordTooShort,
  tooLong: errorStrings.passwordTooLong,
  weakPassword: errorStrings.passwordWeak,
  samePassword: errorStrings.passwordSame,
};

const confirmationErrorMessages: Record<ConfirmationError, string> = {
  required: errorStrings.confirmationRequired,
  mismatch: errorStrings.confirmationMismatch,
};

const formErrorMessages: Record<FormError, string> = {
  rateLimited: AppStrings.login.errors.rateLimited,
  network: AppStrings.login.errors.network,
  unknown: AppStrings.login.errors.unknown,
};

/**
 * Presentation state and actions for the reset-password screen.
 *
 * The email link is only used when the admin presses Save, so email scanners
 * can't use it up and an abandoned form leaves nobody signed in. Using it
 * signs the account in, so a non-admin is signed out again before anything
 * changes. Once it is used, a refused password can be retried without a new
 * link. After saving, the admin logs in again with the new password.
 */
export function useResetPasswordViewModel() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [token] = useState(readRecoveryToken);
  const [isLinkUsed, setIsLinkUsed] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [passwordError, setPasswordError] = useState<PasswordFieldError>();
  const [confirmationError, setConfirmationError] =
    useState<ConfirmationError>();
  const [formError, setFormError] = useState<FormError | null>(null);
  const [blockReason, setBlockReason] = useState<ResetBlockReason | null>(
    token === null ? "linkInvalid" : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const changePassword = (value: string) => {
    setPassword(value);
    setPasswordError(undefined);
    setFormError(null);
  };

  const changeConfirmation = (value: string) => {
    setConfirmation(value);
    setConfirmationError(undefined);
    setFormError(null);
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((previous) => !previous);
  };

  /** Uses the link. False means the screen is now blocked. */
  const startRecovery = async (tokenHash: string): Promise<boolean> => {
    const user = await verifyRecoveryToken(tokenHash);
    setIsLinkUsed(true);
    clearRecoveryToken();
    try {
      const admin = await queryClient.query(adminProfileQuery(user));
      if (admin) return true;
      await signOut();
      setBlockReason("notAdmin");
    } catch {
      // Never keep a session whose admin access could not be confirmed.
      await signOut();
      setBlockReason("checkFailed");
    }
    return false;
  };

  const showFailure = (kind: PasswordResetErrorKind) => {
    if (kind === "linkInvalid") setBlockReason("linkInvalid");
    else if (kind === "weakPassword" || kind === "samePassword") {
      setPasswordError(kind);
    } else setFormError(kind);
  };

  const submit = async () => {
    if (isSubmitting || token === null) return;
    const validationErrors = validateNewPassword({ password, confirmation });
    setPasswordError(validationErrors.password);
    setConfirmationError(validationErrors.confirmation);
    setFormError(null);
    if (hasNewPasswordErrors(validationErrors)) return;

    setIsSubmitting(true);
    try {
      if (!isLinkUsed && !(await startRecovery(token))) return;
      await updatePassword(password);
      await signOut();
      void navigate(AppRoutes.login, {
        replace: true,
        state: passwordUpdatedState,
      });
    } catch (error) {
      showFailure(getPasswordResetErrorKind(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    password,
    confirmation,
    isPasswordVisible,
    isSubmitting,
    passwordError: passwordError && passwordErrorMessages[passwordError],
    confirmationError:
      confirmationError && confirmationErrorMessages[confirmationError],
    formError: formError ? formErrorMessages[formError] : undefined,
    /** Set when the form can't be offered; explains why. */
    blockedMessage: blockReason ? blockedStrings[blockReason] : undefined,
    changePassword,
    changeConfirmation,
    togglePasswordVisibility,
    submit,
  };
}

export type ResetPasswordViewModel = ReturnType<
  typeof useResetPasswordViewModel
>;
