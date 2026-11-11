/**
 * Admin notes: internal notes on a post, visible to admins only
 * (`admin_notes`). Notes are append-only: the site adds them and never
 * edits or deletes them, so they stay a record of moderation.
 */

export interface AdminNote {
  id: string;
  body: string;
  /** ISO 8601 date-time. */
  createdAt: string;
  /** Null when the writing admin's account has since been deleted. */
  authorId: string | null;
  /** Null when the author is deleted or has no name. */
  authorName: string | null;
}

/**
 * Longest note the site accepts. The database has no limit; this keeps a
 * note readable in the card.
 */
export const adminNoteMaxLength = 2000;

/** The note as it will be saved: trimmed. */
export function normalizeAdminNote(body: string): string {
  return body.trim();
}

/** Whether a draft has anything to save and fits the limit. */
export function canSaveAdminNote(body: string): boolean {
  const note = normalizeAdminNote(body);
  return note.length > 0 && note.length <= adminNoteMaxLength;
}

/** Newest first. */
export function sortAdminNotes(notes: readonly AdminNote[]): AdminNote[] {
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
