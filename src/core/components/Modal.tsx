import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  /** Escape asks to close; the owner decides whether it may. */
  onClose: () => void;
  titleId: string;
  descriptionId?: string;
  /** "full" fills the window (minus a margin), e.g. for a map. */
  size?: "default" | "full";
  children: ReactNode;
}

const sizeClass = {
  default: "w-[calc(100%-2rem)] max-w-md",
  // open:flex, not flex: a plain display class would override the closed
  // <dialog>'s display:none and show it on the page.
  full: "h-[calc(100%-2rem)] max-h-none w-[calc(100%-2rem)] max-w-none flex-col open:flex",
};

/**
 * A centred modal dialog on a dimmed backdrop. Uses the native <dialog>
 * in modal mode, so focus stays inside it, the page behind is inert, and
 * Escape asks to close. Clicking the backdrop does nothing, so a decision
 * dialog can't be dismissed by accident.
 */
export function Modal({
  isOpen,
  onClose,
  titleId,
  descriptionId,
  size = "default",
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        // Keep the dialog open until the owner closes it.
        event.preventDefault();
        onClose();
      }}
      className={`m-auto ${sizeClass[size]} rounded-xl bg-white p-0 text-ink shadow-2xl backdrop:bg-navy/50 open:animate-fade-in motion-reduce:open:animate-none`}
    >
      {isOpen && children}
    </dialog>
  );
}
