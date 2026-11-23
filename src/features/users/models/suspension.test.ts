import { describe, expect, it } from "vitest";
import { testUsers } from "../../../test/fixtures/users";
import {
  canChangeSuspension,
  fromSuspensionCategory,
  fromSuspensionLevel,
  getPresetLevel,
  getSuspensionAction,
  getSuspensionDays,
  getSuspensionErrorKind,
  isSuspensionComplete,
  SuspensionError,
  suspensionMessageMaxLength,
  suspensionReasons,
  toSuspensionCategory,
  toSuspensionErrorKind,
} from "./suspension";

const [user] = testUsers;
if (!user) throw new Error("fixture missing");

describe("getSuspensionDays", () => {
  it("maps each length to days, with null until reactivated", () => {
    expect(getSuspensionDays("oneDay")).toBe(1);
    expect(getSuspensionDays("sevenDays")).toBe(7);
    expect(getSuspensionDays("thirtyDays")).toBe(30);
    expect(getSuspensionDays("untilReactivated")).toBeNull();
  });
});

describe("categories", () => {
  it("uses the database's suspension_category values", () => {
    expect(suspensionReasons.map(toSuspensionCategory)).toEqual([
      "spam",
      "misleading_reports",
      "inappropriate_content",
      "harassment",
      "hate_or_threats",
      "scam_or_impersonation",
      "other",
    ]);
  });

  it("reads every stored category back, and null for older suspensions", () => {
    for (const reason of suspensionReasons) {
      expect(fromSuspensionCategory(toSuspensionCategory(reason))).toBe(reason);
    }
    expect(fromSuspensionCategory(null)).toBeNull();
    expect(fromSuspensionCategory("unknown")).toBeNull();
  });

  it("reads levels, and null when unknown", () => {
    expect(fromSuspensionLevel("restricted")).toBe("restricted");
    expect(fromSuspensionLevel("locked")).toBe("locked");
    expect(fromSuspensionLevel(null)).toBeNull();
    expect(fromSuspensionLevel("banned")).toBeNull();
  });
});

describe("getPresetLevel", () => {
  it("restricts for content problems and locks for abuse", () => {
    expect(getPresetLevel("spam")).toBe("restricted");
    expect(getPresetLevel("misleadingReports")).toBe("restricted");
    expect(getPresetLevel("inappropriateContent")).toBe("restricted");
    expect(getPresetLevel("harassment")).toBe("locked");
    expect(getPresetLevel("hateOrThreats")).toBe("locked");
    expect(getPresetLevel("scamOrImpersonation")).toBe("locked");
  });

  it("leaves Other for the admin to choose", () => {
    expect(getPresetLevel("other")).toBeNull();
  });
});

describe("isSuspensionComplete", () => {
  const complete = {
    duration: "sevenDays",
    reason: "spam",
    level: "restricted",
    message: "Posted ads in comments.",
  } as const;

  it("accepts a reason, level, length and message", () => {
    expect(isSuspensionComplete(complete)).toBe(true);
  });

  it("needs every choice", () => {
    expect(isSuspensionComplete({ ...complete, duration: null })).toBe(false);
    expect(isSuspensionComplete({ ...complete, reason: null })).toBe(false);
    expect(isSuspensionComplete({ ...complete, level: null })).toBe(false);
  });

  it("always needs a message, within the limit", () => {
    expect(isSuspensionComplete({ ...complete, message: "   " })).toBe(false);
    expect(
      isSuspensionComplete({
        ...complete,
        message: "a".repeat(suspensionMessageMaxLength + 1),
      }),
    ).toBe(false);
    expect(
      isSuspensionComplete({
        ...complete,
        message: "a".repeat(suspensionMessageMaxLength),
      }),
    ).toBe(true);
  });
});

describe("getSuspensionAction / canChangeSuspension", () => {
  it("suspends active users and reactivates suspended ones", () => {
    expect(getSuspensionAction({ ...user, status: "active" })).toBe("suspend");
    expect(getSuspensionAction({ ...user, status: "suspended" })).toBe(
      "reactivate",
    );
  });

  it("locks active admins but lets a suspended admin be reactivated", () => {
    expect(canChangeSuspension({ ...user, isAdmin: false })).toBe(true);
    expect(
      canChangeSuspension({ ...user, isAdmin: true, status: "active" }),
    ).toBe(false);
    expect(
      canChangeSuspension({ ...user, isAdmin: true, status: "suspended" }),
    ).toBe(true);
  });
});

describe("toSuspensionErrorKind", () => {
  it("maps the server's codes, reading FW409 by action", () => {
    expect(toSuspensionErrorKind("FW403", "suspend")).toBe("isAdmin");
    expect(toSuspensionErrorKind("FW409", "suspend")).toBe("alreadySuspended");
    expect(toSuspensionErrorKind("FW409", "reactivate")).toBe("notSuspended");
    expect(toSuspensionErrorKind("FW404", "reactivate")).toBe("notFound");
    expect(toSuspensionErrorKind("42501", "suspend")).toBe("forbidden");
    expect(toSuspensionErrorKind("22023", "suspend")).toBe("failed");
    expect(toSuspensionErrorKind(undefined, "suspend")).toBe("failed");
  });

  it("reads the kind from any error", () => {
    expect(getSuspensionErrorKind(new SuspensionError("notFound"))).toBe(
      "notFound",
    );
    expect(getSuspensionErrorKind(new Error("network"))).toBe("failed");
  });
});
