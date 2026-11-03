import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { lazy, Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppStrings } from "../constants/appStrings";
import { ScreenErrorBoundary } from "./ScreenErrorBoundary";

const strings = AppStrings.common.screenError;

const UnreachableScreen = lazy(() =>
  Promise.reject(new Error("Failed to fetch dynamically imported module")),
);

function FailedChunk() {
  return (
    <Suspense fallback={<p>Loading</p>}>
      <UnreachableScreen />
    </Suspense>
  );
}

describe("ScreenErrorBoundary", () => {
  beforeEach(() => {
    // React logs caught errors; keep the test output readable.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the screen when nothing fails", () => {
    render(
      <ScreenErrorBoundary>
        <p>Analytics</p>
      </ScreenErrorBoundary>,
    );
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the error and a reload button when a lazy screen fails to load", async () => {
    render(
      <ScreenErrorBoundary>
        <FailedChunk />
      </ScreenErrorBoundary>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(strings.message);
    expect(
      screen.getByRole("button", { name: strings.reload }),
    ).toBeInTheDocument();
  });

  it("reloads when the reload button is pressed", async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    render(
      <ScreenErrorBoundary onReload={onReload}>
        <FailedChunk />
      </ScreenErrorBoundary>,
    );
    await user.click(
      await screen.findByRole("button", { name: strings.reload }),
    );
    expect(onReload).toHaveBeenCalledOnce();
  });
});
