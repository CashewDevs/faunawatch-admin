import { Component, type ReactNode } from "react";
import { AppStrings } from "../constants/appStrings";

type ScreenErrorBoundaryProps = {
  children: ReactNode;
  /** Defaults to reloading the page; injectable for tests. */
  onReload?: () => void;
};

type ScreenErrorBoundaryState = {
  hasError: boolean;
};

function reloadPage() {
  window.location.reload();
}

/**
 * Catches a screen that fails to render (e.g. a lazily loaded chunk that
 * couldn't download after a network drop or a new deploy) and offers a
 * reload instead of leaving the app blank. React.lazy caches the failed
 * import, so only a full reload can recover.
 *
 * A class component because React has no hook for error boundaries.
 */
export class ScreenErrorBoundary extends Component<
  ScreenErrorBoundaryProps,
  ScreenErrorBoundaryState
> {
  override state: ScreenErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ScreenErrorBoundaryState {
    return { hasError: true };
  }

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const strings = AppStrings.common.screenError;
    return (
      <div className="px-8 pt-5 pb-8">
        <p className="rounded-xl bg-white py-16 text-center text-sm text-muted">
          <span role="alert">{strings.message}</span>{" "}
          <button
            type="button"
            onClick={this.props.onReload ?? reloadPage}
            className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {strings.reload}
          </button>
        </p>
      </div>
    );
  }
}
