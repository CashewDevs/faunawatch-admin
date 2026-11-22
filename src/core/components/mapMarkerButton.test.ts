import { describe, expect, it, vi } from "vitest";
import { createMapMarkerButton } from "./mapMarkerButton";

describe("createMapMarkerButton", () => {
  it("is a named button that screen readers read as a button", () => {
    const element = createMapMarkerButton("Philippine Tarsier", vi.fn());

    expect(element.tagName).toBe("BUTTON");
    expect(element.type).toBe("button");
    // Mapbox only adds role="img" and "Map marker" when these are missing.
    expect(element).toHaveAttribute("role", "button");
    expect(element).toHaveAttribute("aria-label", "Philippine Tarsier");
  });

  it("stays a named button once Mapbox makes it a marker", async () => {
    const { default: mapboxgl } = await import("mapbox-gl");
    const element = createMapMarkerButton("Philippine Tarsier", vi.fn());

    new mapboxgl.Marker({ element });

    expect(element).toHaveAttribute("role", "button");
    expect(element).toHaveAttribute("aria-label", "Philippine Tarsier");
  });

  it("calls onClick when pressed", () => {
    const onClick = vi.fn();
    const element = createMapMarkerButton("Pin", onClick);

    element.click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
