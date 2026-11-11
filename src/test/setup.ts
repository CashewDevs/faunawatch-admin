// Vitest global test setup.
// Adds custom DOM matchers from @testing-library/jest-dom
// (e.g. toBeInTheDocument, toHaveTextContent).
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Tests must never reach a real backend: .env points at the hosted project.
// A service a test forgot to mock fails loudly instead of calling it.
vi.stubGlobal("fetch", (input: RequestInfo | URL) =>
  Promise.reject(
    new Error(
      `Network access is disabled in tests (${String(input instanceof Request ? input.url : input)}). Mock the service instead.`,
    ),
  ),
);

// jsdom has <dialog> but not its modal methods; mimic their open state.
if (!("showModal" in HTMLDialogElement.prototype)) {
  Object.assign(HTMLDialogElement.prototype, {
    showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
    close(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
}
