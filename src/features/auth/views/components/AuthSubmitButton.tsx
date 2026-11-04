import { AppAssets } from "../../../../core/constants/appAssets";

interface AuthSubmitButtonProps {
  label: string;
  disabled: boolean;
  isBusy: boolean;
}

/** The main button of a signed-out screen's form. */
export function AuthSubmitButton({
  label,
  disabled,
  isBusy,
}: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-busy={isBusy}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-button transition duration-200 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.99] disabled:cursor-wait disabled:opacity-80 motion-reduce:transition-none"
    >
      {label}
      <img
        src={AppAssets.login.iconArrowRight}
        alt=""
        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </button>
  );
}
