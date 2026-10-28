import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSignedUrls,
  resolveAvatars,
  signedUrlTtlSeconds,
} from "./storageService";

const createSignedUrlsMock = vi.hoisted(() => vi.fn());
const fromBucket = vi.hoisted(() => vi.fn());

vi.mock("./supabaseClient", () => ({
  supabase: { storage: { from: fromBucket } },
}));

beforeEach(() => {
  vi.clearAllMocks();
  fromBucket.mockReturnValue({ createSignedUrls: createSignedUrlsMock });
});

describe("createSignedUrls", () => {
  it("signs each path once", async () => {
    createSignedUrlsMock.mockResolvedValue({
      data: [
        { path: "a.jpg", signedUrl: "https://signed/a", error: null },
        { path: "b.jpg", signedUrl: "", error: "Object not found" },
      ],
      error: null,
    });

    const urls = await createSignedUrls("report-images", [
      "a.jpg",
      "b.jpg",
      "a.jpg",
    ]);

    expect(fromBucket).toHaveBeenCalledWith("report-images");
    expect(createSignedUrlsMock).toHaveBeenCalledWith(
      ["a.jpg", "b.jpg"],
      signedUrlTtlSeconds,
    );
    expect([...urls]).toEqual([["a.jpg", "https://signed/a"]]);
  });

  it("skips the request when there is nothing to sign", async () => {
    expect((await createSignedUrls("avatars", [])).size).toBe(0);
    expect(createSignedUrlsMock).not.toHaveBeenCalled();
  });

  it("returns no URLs when signing fails", async () => {
    createSignedUrlsMock.mockResolvedValue({
      data: null,
      error: { message: "denied" },
    });
    expect((await createSignedUrls("avatars", ["a.jpg"])).size).toBe(0);
  });
});

describe("resolveAvatars", () => {
  it("keeps presets and signs uploaded photos", async () => {
    createSignedUrlsMock.mockResolvedValue({
      data: [{ path: "u/me.jpg", signedUrl: "https://signed/me", error: null }],
      error: null,
    });

    const avatars = await resolveAvatars([
      { kind: "preset", name: "panda" },
      { kind: "upload", path: "u/me.jpg" },
      { kind: "upload", path: "u/missing.jpg" },
      null,
    ]);

    expect(fromBucket).toHaveBeenCalledWith("avatars");
    expect(avatars).toEqual([
      { kind: "preset", name: "panda" },
      { kind: "photo", url: "https://signed/me" },
      null,
      null,
    ]);
  });
});
