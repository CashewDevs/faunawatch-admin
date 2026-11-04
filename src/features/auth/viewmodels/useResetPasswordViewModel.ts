import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AppRoutes } from "../../../core/constants/appRoutes";
import { AppStrings } from "../../../core/constants/appStrings";
import type { SessionUser } from "../models/authSession";
import {
  getPasswordResetErrorKind,
  hasNewPasswordErrors,
  passwordUpdatedState,
  validateNewPassword,
  type ConfirmationError,
  type NewPasswordError,
  type PasswordResetErrorKind,
  type RecoveryArrival,
  type ResetBlockReason,
} from "../models/passwordReset";
import { signOut } from "../services/authService";
import {
  clearRecoveryUrl,
  endRecovery,
  exchangeRecoveryCode,
  readRecoveryArrival,
  resumeRecoverySession,
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

async function endRecoverySession(): Promise<void> {
  endRecovery();
  await signOut();
}

/**
 * Checks the signed-in account may reset here, signing out one that may not.
 * Returns why it may not, or null if it may.
 */
async function refuseNonAdmin(
  queryClient: QueryClient,
  user: SessionUser,
): Promise<ResetBlockReason | null> {
  let reason: ResetBlockReason = "notAdmin";
  try {
    if (await queryClient.query(adminProfileQuery(user))) return null;
  } catch {
    // Never keep a session whose admin access could not be confirmed.
    reason = "checkFailed";
  }
  await endRecoverySession();
  return reason;
}

/** Opens a default link or an interrupted reset. Returns why it can't go on. */
async function openLink(
  queryClient: QueryClient,
  arrival: RecoveryArrival,
): Promise<ResetBlockReason | null> {
  let user: SessionUser | null;
  try {
    user =
      arrival.kind === "code"
        ? await exchangeRecoveryCode(arrival.code)
        : await resumeRecoverySession();
  } catch (error) {
    const kind = getPasswordResetErrorKind(error);
    return kind === "linkInvalid" || kind === "otherBrowser"
      ? kind
      : "checkFailed";
  }
  return user ? refuseNonAdmin(queryClient, user) : "linkInvalid";
}

/**
 * Presentation state and actions for the reset-password screen.
 *
 * A custom template link is only used when the admin presses Save, so email
 * scanners can't use it up and an abandoned form leaves nobody signed in. A
 * default link has already been used by the time it gets here, so its session
 * opens as the page loads, in this tab only. Either way a non-admin is signed
 * out before anything changes, a refused password can be retried without a new
 * link, and after saving the admin logs in again with the new password.
 */
export function useResetPasswordViewModel() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [arrival] = useState(readRecoveryArrival);
  const opensOnLoad = arrival.kind === "code" || arrival.kind === "resume";
  const [isOpening, setIsOpening] = useState(opensOnLoad);
  const [hasSession, setHasSession] = useState(opensOnLoad);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [passwordError, setPasswordError] = useState<PasswordFieldError>();
  const [confirmationError, setConfirmationError] =
    useState<ConfirmationError>();
  const [formError, setFormError] = useState<FormError | null>(null);
  const [blockReason, setBlockReason] = useState<ResetBlockReason | null>(
    arrival.kind === "none" || arrival.kind === "failed" ? "linkInvalid" : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (arrival.kind === "failed") clearRecoveryUrl();
    if (arrival.kind !== "code" && arrival.kind !== "resume") return;
    let isActive = true;
    void openLink(queryClient, arrival).then((reason) => {
      if (!isActive) return;
      setBlockReason(reason);
      setIsOpening(false);
    });
    return () => {
      isActive = false;
    };
  }, [arrival, queryClient]);

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

  /** Uses a custom template link. False means the screen is now blocked. */
  const openWithToken = async (tokenHash: string): Promise<boolean> => {
    const user = await verifyRecoveryToken(tokenHash);
    setHasSession(true);
    clearRecoveryUrl();
    const reason = await refuseNonAdmin(queryClient, user);
    setBlockReason(reason);
    return reason === null;
  };

  const showFailure = (kind: PasswordResetErrorKind) => {
    if (kind === "linkInvalid" || kind === "otherBrowser") {
      setBlockReason(kind);
    } else if (kind === "weakPassword" || kind === "samePassword") {
      setPasswordError(kind);
    } else setFormError(kind);
  };

  const submit = async () => {
    if (isSubmitting || isOpening) return;
    const validationErrors = validateNewPassword({ password, confirmation });
    setPasswordError(validationErrors.password);
    setConfirmationError(validationErrors.confirmation);
    setFormError(null);
    if (hasNewPasswordErrors(validationErrors)) return;

    setIsSubmitting(true);
    try {
      if (!hasSession) {
        if (arrival.kind !== "token") return;
        if (!(await openWithToken(arrival.tokenHash))) return;
      }
      await updatePassword(password);
      await endRecoverySession();
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
    /** A default link or interrupted reset is still being opened. */
    isOpening,
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
    /** A new link can't help a non-admin. */
    canRequestNewLink: blockReason !== null && blockReason !== "notAdmin",
    changePassword,
    changeConfirmation,
    togglePasswordVisibility,
    submit,
  };
}

export type ResetPasswordViewModel = ReturnType<
  typeof useResetPasswordViewModel
>;
