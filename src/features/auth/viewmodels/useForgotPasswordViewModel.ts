import { useState } from "react";
import { useCountdown } from "../../../core/hooks/useCountdown";
import { AppStrings } from "../../../core/constants/appStrings";
import { validateEmail, type EmailError } from "../models/loginCredentials";
import {
  getPasswordResetErrorKind,
  resetEmailCooldownSeconds,
} from "../models/passwordReset";
import { requestPasswordReset } from "../services/passwordResetService";

type FormError = "rateLimited" | "network" | "unknown";

const { errors: loginErrors, secondsSuffix } = AppStrings.login;
const strings = AppStrings.forgotPassword;

const emailErrorMessages: Record<EmailError, string> = {
  required: loginErrors.emailRequired,
  invalid: loginErrors.emailInvalid,
};

const formErrorMessages: Record<FormError, string> = {
  rateLimited: loginErrors.rateLimited,
  network: loginErrors.network,
  unknown: loginErrors.unknown,
};

/**
 * Presentation state and actions for the forgot-password screen.
 *
 * The confirmation reads the same whether or not the email has an account.
 * The wait between requests is usability only; Supabase enforces the limit.
 */
export function useForgotPasswordViewModel() {
  const countdown = useCountdown();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<EmailError>();
  const [formError, setFormError] = useState<FormError | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const isWaiting = countdown.remainingSeconds > 0;
  const waitLabel = `${String(countdown.remainingSeconds)}${secondsSuffix}`;

  const changeEmail = (value: string) => {
    setEmail(value);
    setEmailError(undefined);
    setFormError(null);
  };

  const send = async (address: string) => {
    if (isSending || isWaiting) return;
    setFormError(null);
    setIsSending(true);
    try {
      await requestPasswordReset(address);
      setSentTo(address);
      countdown.start(resetEmailCooldownSeconds);
    } catch (error) {
      const kind = getPasswordResetErrorKind(error);
      if (kind === "rateLimited") countdown.start(resetEmailCooldownSeconds);
      setFormError(
        kind === "rateLimited" || kind === "network" ? kind : "unknown",
      );
    } finally {
      setIsSending(false);
    }
  };

  const submit = async () => {
    if (isSending || isWaiting) return;
    const validationError = validateEmail(email);
    setEmailError(validationError);
    setFormError(null);
    if (validationError) return;
    await send(email.trim());
  };

  const sendAgain = async () => {
    if (sentTo !== null) await send(sentTo);
  };

  let submitLabel: string = strings.submit;
  if (isSending) submitLabel = strings.submitting;
  else if (isWaiting) {
    submitLabel = `${AppStrings.login.submitCooldownPrefix} ${waitLabel}`;
  }

  let sendAgainLabel: string = strings.sendAgain;
  if (isSending) sendAgainLabel = strings.submitting;
  else if (isWaiting)
    sendAgainLabel = `${strings.sendAgain} ${strings.sendAgainIn} ${waitLabel}`;

  return {
    email,
    isSending,
    isDisabled: isSending || isWaiting,
    /** True once a request went through; the confirmation replaces the form. */
    isSent: sentTo !== null,
    sentMessage:
      sentTo === null
        ? undefined
        : `${strings.sentLead} ${sentTo}${strings.sentTail}`,
    emailError: emailError && emailErrorMessages[emailError],
    formError: formError ? formErrorMessages[formError] : undefined,
    submitLabel,
    sendAgainLabel,
    changeEmail,
    submit,
    sendAgain,
  };
}

export type ForgotPasswordViewModel = ReturnType<
  typeof useForgotPasswordViewModel
>;
