import { AppAssets } from "../constants/appAssets";

interface LoadingScreenProps {
  /** Screen-reader text announced while loading. */
  label: string;
}

/**
 * Full-screen loader showing the spinning FaunaWatch logo.
 *
 * Keep this visually identical to the pre-React splash in index.html so
 * the hand-off between them is seamless.
 */
export function LoadingScreen({ label }: LoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 flex items-center justify-center bg-brand-blue"
    >
      <img
        src={AppAssets.shared.loaderLogo}
        alt=""
        className="size-16 animate-loader-spin object-contain motion-reduce:animate-none"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
