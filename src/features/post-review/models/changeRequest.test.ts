import { describe, expect, it } from "vitest";
import {
  canRequestChanges,
  canWithdrawChangeRequest,
  ChangeRequestError,
  changeFields,
  changeRequestMessageMaxLength,
  getChangeRequestErrorKind,
  isChangeRequestMessageValid,
  normalizeChangeRequestMessage,
  sortChangeFields,
  sortChangeRequests,
  toChangeField,
  toChangeFieldValue,
  toChangeRequestErrorKind,
  toChangeRequestResolution,
  type ChangeRequest,
} from "./changeRequest";

function makeRequest(overrides: Partial<ChangeRequest>): ChangeRequest {
  return {
    id: "r",
    round: 1,
    message: "Please add a clearer photo.",
    fields: [],
    requestedAt: "2026-11-01T08:00:00Z",
    requestedByName: "Alex Admin",
    isRequestedByFormerAdmin: false,
    resolution: null,
    resolvedAt: null,
    withdrawnByName: null,
    isWithdrawnByFormerAdmin: false,
    ...overrides,
  };
}

describe("change fields", () => {
  it("round-trips every field through its enum value", () => {
    changeFields.forEach((field) => {
      expect(toChangeField(toChangeFieldValue(field))).toBe(field);
    });
  });

  it("maps the enum values the database uses", () => {
    expect(toChangeFieldValue("photos")).toBe("photos");
    expect(toChangeFieldValue("speciesDescription")).toBe(
      "species_description",
    );
    expect(toChangeFieldValue("location")).toBe("location");
    expect(toChangeFieldValue("category")).toBe("category");
    expect(toChangeField("weather")).toBeNull();
  });

  it("puts fields in display order, each once", () => {
    expect(
      sortChangeFields(["category", "photos", "category", "location"]),
    ).toEqual(["photos", "location", "category"]);
  });
});

describe("change request message", () => {
  it("trims the message, keeping line breaks inside", () => {
    expect(
      normalizeChangeRequestMessage("  \n Fix this.\nAnd this. \t\n"),
    ).toBe("Fix this.\nAnd this.");
  });

  it("needs something to send and at most 500 characters once trimmed", () => {
    expect(isChangeRequestMessageValid("")).toBe(false);
    expect(isChangeRequestMessageValid(" \n\t ")).toBe(false);
    expect(isChangeRequestMessageValid("Blurry photo")).toBe(true);
    expect(
      isChangeRequestMessageValid("a".repeat(changeRequestMessageMaxLength)),
    ).toBe(true);
    expect(
      isChangeRequestMessageValid(
        `  ${"a".repeat(changeRequestMessageMaxLength)}  `,
      ),
    ).toBe(true);
    expect(
      isChangeRequestMessageValid(
        "a".repeat(changeRequestMessageMaxLength + 1),
      ),
    ).toBe(false);
  });
});

describe("change request helpers", () => {
  it("reads only the two resolutions the database has", () => {
    expect(toChangeRequestResolution("resubmitted")).toBe("resubmitted");
    expect(toChangeRequestResolution("withdrawn")).toBe("withdrawn");
    expect(toChangeRequestResolution(null)).toBeNull();
    expect(toChangeRequestResolution("expired")).toBeNull();
  });

  it("sorts rounds newest first", () => {
    expect(
      sortChangeRequests([
        makeRequest({ id: "a", round: 1 }),
        makeRequest({ id: "c", round: 3 }),
        makeRequest({ id: "b", round: 2 }),
      ]).map((request) => request.id),
    ).toEqual(["c", "b", "a"]);
  });

  it("sends back only pending posts and withdraws only waiting ones", () => {
    expect(canRequestChanges("pending")).toBe(true);
    expect(canRequestChanges("changes_requested")).toBe(false);
    expect(canRequestChanges("approved")).toBe(false);
    expect(canRequestChanges("declined")).toBe(false);
    expect(canRequestChanges("unknown")).toBe(false);
    expect(canWithdrawChangeRequest("changes_requested")).toBe(true);
    expect(canWithdrawChangeRequest("pending")).toBe(false);
    expect(canWithdrawChangeRequest("unknown")).toBe(false);
  });
});

describe("change request errors", () => {
  it("separates the two FW409 rules by their message", () => {
    expect(
      toChangeRequestErrorKind("request", "FW409", "report_not_pending"),
    ).toBe("notPending");
    expect(
      toChangeRequestErrorKind(
        "withdraw",
        "FW409",
        "report_not_awaiting_changes",
      ),
    ).toBe("notAwaitingChanges");
  });

  it("falls back on the action when an FW409 has no known message", () => {
    expect(toChangeRequestErrorKind("request", "FW409")).toBe("notPending");
    expect(toChangeRequestErrorKind("withdraw", "FW409", "other")).toBe(
      "notAwaitingChanges",
    );
  });

  it.each([
    ["FW404", "notFound"],
    ["42501", "forbidden"],
    ["22023", "invalidInput"],
    [undefined, "failed"],
  ])("turns error code %s into %s", (code, kind) => {
    expect(toChangeRequestErrorKind("request", code, "x")).toBe(kind);
  });

  it("only treats 22023 as a bad message when requesting", () => {
    expect(toChangeRequestErrorKind("withdraw", "22023", "x")).toBe("failed");
  });

  it("reads the kind of any thrown error", () => {
    expect(getChangeRequestErrorKind(new ChangeRequestError("notFound"))).toBe(
      "notFound",
    );
    expect(getChangeRequestErrorKind(new Error("network"))).toBe("failed");
  });
});
