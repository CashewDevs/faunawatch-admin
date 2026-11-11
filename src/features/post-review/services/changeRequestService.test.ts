import { beforeEach, describe, expect, it, vi } from "vitest";
import { getChangeRequestErrorKind } from "../models/changeRequest";
import {
  fetchChangeRequests,
  requestChanges,
  withdrawChangeRequest,
} from "./changeRequestService";

const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));

vi.mock("../../../core/services/supabaseClient", () => ({
  supabase: { from, rpc },
}));

function mockSelect(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    overrideTypes: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  from.mockReturnValue(query);
  return query;
}

const admin = { full_name: "Alex Admin", username: "alex", display_name: null };

describe("fetchChangeRequests", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("reads the post's rounds with the admins' names, newest first", async () => {
    const query = mockSelect({
      data: [
        {
          id: "r1",
          round: 1,
          message: "Blurry photo",
          fields: ["photos"],
          requested_at: "2026-11-01T08:00:00Z",
          requested_by: "a1",
          resolution: "resubmitted",
          resolved_at: "2026-11-02T08:00:00Z",
          resolved_by: "reporter-1",
          requester: admin,
          // The reporter resubmitted: their name must never be shown.
          resolver: {
            full_name: "Rita Reporter",
            username: null,
            display_name: null,
          },
        },
        {
          id: "r2",
          round: 2,
          message: "Wrong place",
          fields: ["category", "location", "weather"],
          requested_at: "2026-11-03T08:00:00Z",
          requested_by: null,
          resolution: "withdrawn",
          resolved_at: "2026-11-04T08:00:00Z",
          resolved_by: "a2",
          requester: null,
          resolver: { full_name: null, username: "bea", display_name: null },
        },
        {
          id: "r3",
          round: 3,
          message: "Again",
          fields: [],
          requested_at: "2026-11-05T08:00:00Z",
          requested_by: "a1",
          resolution: null,
          resolved_at: null,
          resolved_by: null,
          requester: admin,
          resolver: null,
        },
      ],
      error: null,
    });

    const requests = await fetchChangeRequests("post-1");

    expect(from).toHaveBeenCalledWith("report_change_requests");
    expect(query.eq).toHaveBeenCalledWith("report_id", "post-1");
    expect(requests.map((request) => request.round)).toEqual([3, 2, 1]);
    expect(requests[2]).toMatchObject({
      fields: ["photos"],
      requestedByName: "Alex Admin",
      isRequestedByFormerAdmin: false,
      resolution: "resubmitted",
      withdrawnByName: null,
      isWithdrawnByFormerAdmin: false,
    });
    expect(requests[1]).toMatchObject({
      // Unknown field values are dropped; the rest keep display order.
      fields: ["location", "category"],
      requestedByName: null,
      isRequestedByFormerAdmin: true,
      resolution: "withdrawn",
      withdrawnByName: "bea",
      isWithdrawnByFormerAdmin: false,
    });
    expect(requests[0]).toMatchObject({ resolution: null, resolvedAt: null });
  });

  it("names the foreign keys and never selects the internal snapshot", async () => {
    const query = mockSelect({ data: [], error: null });
    await fetchChangeRequests("post-1");
    const columns = String(query.select.mock.calls[0]?.[0]);
    expect(columns).toContain("profiles!requested_by");
    expect(columns).toContain("profiles!resolved_by");
    expect(columns).not.toContain("photo_snapshot");
  });

  it("marks a withdrawal by a deleted admin as a former admin's", async () => {
    mockSelect({
      data: [
        {
          id: "r1",
          round: 1,
          message: "x",
          fields: [],
          requested_at: "2026-11-01T08:00:00Z",
          requested_by: "a1",
          resolution: "withdrawn",
          resolved_at: "2026-11-02T08:00:00Z",
          resolved_by: null,
          requester: admin,
          resolver: null,
        },
      ],
      error: null,
    });
    const [request] = await fetchChangeRequests("post-1");
    expect(request).toMatchObject({
      withdrawnByName: null,
      isWithdrawnByFormerAdmin: true,
    });
  });

  it("throws when the query fails", async () => {
    mockSelect({ data: null, error: { message: "boom" } });
    await expect(fetchChangeRequests("post-1")).rejects.toThrow(
      "Couldn't load change requests.",
    );
  });
});

describe("requestChanges", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: null });
  });

  it("sends the trimmed message and the ticked fields in display order", async () => {
    await requestChanges("post-1", "  Add a clearer photo.\nThanks \n", [
      "category",
      "photos",
    ]);
    expect(rpc).toHaveBeenCalledWith("admin_request_changes", {
      p_report_id: "post-1",
      p_message: "Add a clearer photo.\nThanks",
      p_fields: ["photos", "category"],
    });
  });

  it("sends no ticks as an empty list", async () => {
    await requestChanges("post-1", "Fix it", []);
    expect(rpc).toHaveBeenCalledWith("admin_request_changes", {
      p_report_id: "post-1",
      p_message: "Fix it",
      p_fields: [],
    });
  });

  it("refuses a blank or too long message without calling the server", async () => {
    await expect(requestChanges("post-1", " \n ", [])).rejects.toThrow();
    await expect(
      requestChanges("post-1", "a".repeat(501), []),
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["FW409", "report_not_pending", "notPending"],
    ["FW404", "report_not_found", "notFound"],
    ["42501", "Only admins can request changes", "forbidden"],
    ["22023", "A message is required", "invalidInput"],
    [undefined, "network", "failed"],
  ])("turns error %s (%s) into %s", async (code, message, kind) => {
    rpc.mockResolvedValue({ data: null, error: { code, message } });
    const error: unknown = await requestChanges("post-1", "Fix it", []).catch(
      (caught: unknown) => caught,
    );
    expect(getChangeRequestErrorKind(error)).toBe(kind);
  });
});

describe("withdrawChangeRequest", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: null });
  });

  it("withdraws by post id with no reason", async () => {
    await withdrawChangeRequest("post-1");
    expect(rpc).toHaveBeenCalledWith("admin_withdraw_change_request", {
      p_report_id: "post-1",
    });
  });

  it.each([
    ["FW409", "report_not_awaiting_changes", "notAwaitingChanges"],
    ["FW404", "report_not_found", "notFound"],
    ["42501", "Only admins can withdraw change requests", "forbidden"],
    [undefined, "network", "failed"],
  ])("turns error %s (%s) into %s", async (code, message, kind) => {
    rpc.mockResolvedValue({ data: null, error: { code, message } });
    const error: unknown = await withdrawChangeRequest("post-1").catch(
      (caught: unknown) => caught,
    );
    expect(getChangeRequestErrorKind(error)).toBe(kind);
  });
});
