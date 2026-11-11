import { useEffect, useRef, useState } from "react";

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
  const nextId = useRef(0);

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
    /** Returns the message's id, for `update`. */
    show: (tone: Notice["tone"], message: string) => {
      nextId.current += 1;
      const id = nextId.current;
      setNotice({ id, tone, message });
      return id;
    },
    /**
     * Changes the text of message `id`, only while it is still the one
     * shown: a newer message, or a dismissed one, is left alone.
     */
    update: (id: number, message: string) => {
      setNotice((current) =>
        current?.id === id ? { ...current, message } : current,
      );
    },
    dismiss: () => {
      setNotice(null);
    },
  };
}

/** One message area, shared when a screen has several kinds of action. */
export type NoticeController = ReturnType<typeof useNotice>;
