import { describe, expect, it } from "vitest";
import { testUsers } from "../../../test/fixtures/users";
import {
  canChangeSuspension,
  composeSuspensionReason,
  getSuspensionAction,
  getSuspensionDays,
  getSuspensionErrorKind,
  isSuspensionReasonComplete,
  SuspensionError,
  suspensionDetailsMaxLength,
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

describe("composeSuspensionReason", () => {
  it("puts the label before trimmed details", () => {
    expect(composeSuspensionReason("spam", "Spam", "  posted ads ")).toBe(
      "Spam: posted ads",
    );
  });

  it("uses the label alone without details", () => {
    expect(composeSuspensionReason("spam", "Spam", "   ")).toBe("Spam");
  });

  it("stores only the details for Other", () => {
    expect(composeSuspensionReason("other", "Other", " Impersonation ")).toBe(
      "Impersonation",
    );
  });
});

describe("isSuspensionReasonComplete", () => {
  it("needs a reason", () => {
    expect(isSuspensionReasonComplete(null, "details")).toBe(false);
    expect(isSuspensionReasonComplete("spam", "")).toBe(true);
  });

  it("needs details for Other", () => {
    expect(isSuspensionReasonComplete("other", "  ")).toBe(false);
    expect(isSuspensionReasonComplete("other", "Impersonation")).toBe(true);
  });

  it("refuses details over the limit", () => {
    expect(
      isSuspensionReasonComplete(
        "spam",
        "a".repeat(suspensionDetailsMaxLength + 1),
      ),
    ).toBe(false);
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
