// Vitest global test setup.
// Adds custom DOM matchers from @testing-library/jest-dom
// (e.g. toBeInTheDocument, toHaveTextContent).
import "@testing-library/jest-dom/vitest";

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
