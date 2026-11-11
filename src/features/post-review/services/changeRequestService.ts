import { supabase } from "../../../core/services/supabaseClient";
import { getProfileDisplayName } from "../../../core/utils/names";
import {
  ChangeRequestError,
  isChangeRequestMessageValid,
  normalizeChangeRequestMessage,
  sortChangeFields,
  sortChangeRequests,
  toChangeField,
  toChangeFieldValue,
  toChangeRequestErrorKind,
  toChangeRequestResolution,
  type ChangeField,
  type ChangeRequest,
  type ChangeRequestAction,
} from "../models/changeRequest";

/**
 * Change Request Service: sends a pending post back to the reporter
 * (`admin_request_changes`), takes that back (`admin_withdraw_change_request`)
 * and reads a post's requests (`report_change_requests`, admins only through
 * RLS). Both RPCs check the post's current status, so a stale page can't
 * overwrite another admin's change; they throw a ChangeRequestError whose
 * `kind` says why nothing changed. The table's `photo_snapshot` is internal
 * and never selected.
 */

interface NameRow {
  full_name: string | null;
  username: string | null;
  display_name: string | null;
}

interface ChangeRequestRow {
  id: string;
  round: number;
  message: string;
  fields: string[];
  requested_at: string;
  requested_by: string | null;
  resolution: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  requester: NameRow | null;
  resolver: NameRow | null;
}

const nameColumns = "full_name, username, display_name";

// Two foreign keys point at profiles, so each embed names its column.
const requestColumns = [
  "id, round, message, fields, requested_at, requested_by",
  "resolution, resolved_at, resolved_by",
  `requester:profiles!requested_by(${nameColumns})`,
  `resolver:profiles!resolved_by(${nameColumns})`,
].join(", ");

function displayName(row: NameRow | null): string | null {
  return row
    ? getProfileDisplayName(
        {
          fullName: row.full_name,
          username: row.username,
          displayName: row.display_name,
        },
        null,
      )
    : null;
}

/** A post's change requests, newest round first, with the admins' names. */
export async function fetchChangeRequests(
  postId: string,
): Promise<ChangeRequest[]> {
  const { data, error } = await supabase
    .from("report_change_requests")
    .select(requestColumns)
    .eq("report_id", postId)
    .order("round", { ascending: false })
    .overrideTypes<ChangeRequestRow[], { merge: false }>();
  if (error) {
    throw new Error("Couldn't load change requests.", { cause: error });
  }

  return sortChangeRequests(
    data.map((row) => {
      const resolution = toChangeRequestResolution(row.resolution);
      // Only a withdrawal was made by an admin; a resubmission was the reporter.
      const isWithdrawn = resolution === "withdrawn";
      return {
        id: row.id,
        round: row.round,
        message: row.message,
        fields: sortChangeFields(
          row.fields.flatMap((value) => toChangeField(value) ?? []),
        ),
        requestedAt: row.requested_at,
        requestedByName: displayName(row.requester),
        isRequestedByFormerAdmin: row.requested_by === null,
        resolution,
        resolvedAt: row.resolved_at,
        withdrawnByName: isWithdrawn ? displayName(row.resolver) : null,
        isWithdrawnByFormerAdmin: isWithdrawn && row.resolved_by === null,
      };
    }),
  );
}

function toError(
  action: ChangeRequestAction,
  error: { code?: string; message?: string },
) {
  return new ChangeRequestError(
    toChangeRequestErrorKind(action, error.code, error.message),
    { cause: error },
  );
}

/**
 * Sends one pending post back to the reporter. The message is trimmed and
 * must be 1-500 characters; ticked fields are sent in display order.
 */
export async function requestChanges(
  postId: string,
  message: string,
  fields: readonly ChangeField[],
): Promise<void> {
  if (!isChangeRequestMessageValid(message)) {
    throw new Error("A message of at most 500 characters is required.");
  }
  const { error } = await supabase.rpc("admin_request_changes", {
    p_report_id: postId,
    p_message: normalizeChangeRequestMessage(message),
    p_fields: sortChangeFields(fields).map(toChangeFieldValue),
  });
  if (error) throw toError("request", error);
}

/** Takes the request back: the post returns to pending. */
export async function withdrawChangeRequest(postId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_withdraw_change_request", {
    p_report_id: postId,
  });
  if (error) throw toError("withdraw", error);
}
