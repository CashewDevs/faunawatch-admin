import { describe, expect, it } from "vitest";
import {
  canTakeDown,
  declineReasons,
  getActionDecision,
  getModerationErrorKind,
  isDecidable,
  ModerationError,
  needsDeclineReason,
  toDeclineReason,
  toDeclineReasonValue,
  toModerationErrorKind,
} from "./moderation";

describe("decline reasons", () => {
  it("round-trips every reason through its enum value", () => {
    declineReasons.forEach((reason) => {
      expect(toDeclineReason(toDeclineReasonValue(reason))).toBe(reason);
    });
  });

  it("maps the enum values the database uses", () => {
    expect(toDeclineReasonValue("duplicateSighting")).toBe("duplicate");
    expect(toDeclineReasonValue("inaccurateLocation")).toBe("inaccurate_gps");
    expect(toDeclineReasonValue("inappropriateContent")).toBe(
      "inappropriate_content",
    );
    expect(toDeclineReasonValue("notWildlife")).toBe("not_wildlife");
  });

  it("reads unknown or missing values as null", () => {
    expect(toDeclineReason(null)).toBeNull();
    expect(toDeclineReason("")).toBeNull();
    expect(toDeclineReason("something_new")).toBeNull();
  });
});

describe("actions", () => {
  it("records approve as approved and the others as declined", () => {
    expect(getActionDecision("approve")).toBe("approved");
    expect(getActionDecision("decline")).toBe("declined");
    expect(getActionDecision("takeDown")).toBe("declined");
  });

  it("needs a reason for decline and take down only", () => {
    expect(needsDeclineReason("approve")).toBe(false);
    expect(needsDeclineReason("decline")).toBe(true);
    expect(needsDeclineReason("takeDown")).toBe(true);
  });

  it("decides pending posts and takes down approved ones", () => {
    expect(isDecidable("pending")).toBe(true);
    expect(isDecidable("approved")).toBe(false);
    expect(isDecidable("declined")).toBe(false);
    expect(canTakeDown("approved")).toBe(true);
    expect(canTakeDown("pending")).toBe(false);
    expect(canTakeDown("declined")).toBe(false);
  });
});

describe("moderation errors", () => {
  it("maps the RPC's error codes", () => {
    expect(toModerationErrorKind("FW409")).toBe("alreadyDecided");
    expect(toModerationErrorKind("FW404")).toBe("notFound");
    expect(toModerationErrorKind("42501")).toBe("forbidden");
    expect(toModerationErrorKind("P0001")).toBe("failed");
    expect(toModerationErrorKind(undefined)).toBe("failed");
  });

  it("reads the kind of any thrown error", () => {
    expect(getModerationErrorKind(new ModerationError("notFound"))).toBe(
      "notFound",
    );
    expect(getModerationErrorKind(new Error("network"))).toBe("failed");
    expect(getModerationErrorKind("oops")).toBe("failed");
  });
});
