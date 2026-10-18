import { describe, expect, it } from "vitest";
import { toSafeLinkUrl } from "./urls";

const base = "https://admin.example.org";

describe("toSafeLinkUrl", () => {
  it("keeps http(s) and same-site paths", () => {
    expect(toSafeLinkUrl("https://cdn.example.org/a.jpg", base)).toBe(
      "https://cdn.example.org/a.jpg",
    );
    expect(toSafeLinkUrl("/src/assets/a.jpg", base)).toBe("/src/assets/a.jpg");
  });

  it("rejects script and data URLs", () => {
    expect(toSafeLinkUrl("javascript:alert(1)", base)).toBeUndefined();
    expect(toSafeLinkUrl(" JavaScript:alert(1)", base)).toBeUndefined();
    expect(toSafeLinkUrl("data:text/html,<p>", base)).toBeUndefined();
  });
});
