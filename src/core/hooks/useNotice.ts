import { useEffect, useState } from "react";

/** How long a success message stays up. Errors stay until dismissed. */
export const successNoticeMs = 5000;

export interface Notice {
  /** Changes on every message, so a repeated message restarts its timer. */
  id: number;
  tone: "success" | "error";
  message: string;
}

/**
 * The result message after an admin action, e.g. "Post approved.".
 * Success messages close on their own; errors stay until dismissed.
 */
export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (notice?.tone !== "success") return;
    const timer = setTimeout(() => {
      setNotice(null);
    }, successNoticeMs);
    return () => {
      clearTimeout(timer);
    };
  }, [notice]);

  return {
    notice,
    show: (tone: Notice["tone"], message: string) => {
      setNotice({ id: Date.now(), tone, message });
    },
    dismiss: () => {
      setNotice(null);
    },
  };
}
