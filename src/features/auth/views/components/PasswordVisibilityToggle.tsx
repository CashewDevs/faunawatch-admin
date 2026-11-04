import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";

interface PasswordVisibilityToggleProps {
  isVisible: boolean;
  onToggle: () => void;
}

/** Eye button inside a password field that shows or hides the password. */
export function PasswordVisibilityToggle({
  isVisible,
  onToggle,
}: PasswordVisibilityToggleProps) {
  const strings = AppStrings.login;

  return (
    // TODO(design): Figma has no "eye-off" icon for the visible state, so
    // the same icon is used for both; aria-pressed conveys the state to
    // assistive technology.
    <button
      type="button"
      onClick={onToggle}
      aria-label={isVisible ? strings.hidePassword : strings.showPassword}
      aria-pressed={isVisible}
      className="rounded-sm opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <img src={AppAssets.login.iconEye} alt="" className="block size-4" />
    </button>
  );
}
