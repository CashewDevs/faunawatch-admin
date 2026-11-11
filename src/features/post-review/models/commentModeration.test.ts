import { describe, expect, it } from "vitest";
import {
  commentRemovalReasonMaxLength,
  CommentModerationError,
  getCommentActions,
  getCommentModerationErrorKind,
  isRemovalReasonValid,
  toCommentModerationErrorKind,
} from "./commentModeration";
import type { PostComment } from "./post";

const comment: PostComment = {
  id: "c1",
  authorName: "A",
  username: null,
  postedAt: "2026-11-01T00:00:00Z",
  body: "Hi",
  isFlagged: false,
  moderationNote: null,
  removal: null,
};

describe("getCommentActions", () => {
  it("offers remove, plus review flag when flagged", () => {
    expect(getCommentActions(comment)).toEqual(["remove"]);
    expect(getCommentActions({ ...comment, isFlagged: true })).toEqual([
      "remove",
      "clearFlag",
    ]);
  });

  it("only offers restore for a removed comment", () => {
    expect(
      getCommentActions({
        ...comment,
        removal: {
          removedAt: "2026-11-02T00:00:00Z",
          reason: "Spam",
          removedByName: null,
          isRemovedByFormerAdmin: false,
        },
      }),
    ).toEqual(["restore"]);
  });
});

describe("isRemovalReasonValid", () => {
  it("needs some text within the limit", () => {
    expect(isRemovalReasonValid("   ")).toBe(false);
    expect(isRemovalReasonValid(" Spam ")).toBe(true);
    expect(
      isRemovalReasonValid("a".repeat(commentRemovalReasonMaxLength + 1)),
    ).toBe(false);
  });
});

describe("toCommentModerationErrorKind", () => {
  it("maps the server's codes", () => {
    expect(toCommentModerationErrorKind("FW409")).toBe("alreadyChanged");
    expect(toCommentModerationErrorKind("FW404")).toBe("notFound");
    expect(toCommentModerationErrorKind("42501")).toBe("forbidden");
    expect(toCommentModerationErrorKind("22023")).toBe("failed");
    expect(toCommentModerationErrorKind(undefined)).toBe("failed");
  });

  it("reads the kind from any error", () => {
    expect(
      getCommentModerationErrorKind(new CommentModerationError("notFound")),
    ).toBe("notFound");
    expect(getCommentModerationErrorKind(new Error("x"))).toBe("failed");
  });
});
