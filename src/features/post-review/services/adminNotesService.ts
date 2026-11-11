import { supabase } from "../../../core/services/supabaseClient";
import { getProfileDisplayName } from "../../../core/utils/names";
import {
  adminNoteMaxLength,
  normalizeAdminNote,
  sortAdminNotes,
  type AdminNote,
} from "../models/adminNote";

/**
 * Admin Notes Service: reads and adds a post's internal notes
 * (`admin_notes`, admins only through RLS). Notes are never updated or
 * deleted from the site.
 */

interface AdminNoteRow {
  id: string;
  body: string;
  created_at: string;
  author_id: string | null;
  author: {
    full_name: string | null;
    username: string | null;
    display_name: string | null;
  } | null;
}

const noteColumns = [
  "id, body, created_at, author_id",
  "author:profiles!author_id(full_name, username, display_name)",
].join(", ");

/** A post's notes, newest first, with each author's name. */
export async function fetchAdminNotes(postId: string): Promise<AdminNote[]> {
  const { data, error } = await supabase
    .from("admin_notes")
    .select(noteColumns)
    .eq("report_id", postId)
    .order("created_at", { ascending: false })
    .overrideTypes<AdminNoteRow[], { merge: false }>();
  if (error) throw new Error("Couldn't load admin notes.", { cause: error });

  return sortAdminNotes(
    data.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      authorId: row.author_id,
      authorName: row.author
        ? getProfileDisplayName(
            {
              fullName: row.author.full_name,
              username: row.author.username,
              displayName: row.author.display_name,
            },
            null,
          )
        : null,
    })),
  );
}

/** Adds a note to a post as the signed-in admin. */
export async function addAdminNote(
  postId: string,
  body: string,
): Promise<void> {
  const note = normalizeAdminNote(body);
  if (!note || note.length > adminNoteMaxLength) {
    throw new Error("The note is empty or too long.");
  }

  // The insert policy requires author_id to be the caller.
  const { data: sessionData } = await supabase.auth.getSession();
  const authorId = sessionData.session?.user.id;
  if (!authorId) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("admin_notes")
    .insert({ report_id: postId, author_id: authorId, body: note });
  if (error) throw new Error("Couldn't save the note.", { cause: error });
}
