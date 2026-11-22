/**
 * A button to use as a Mapbox marker's element, so the marker can be
 * reached and pressed from the keyboard and screen readers announce it as
 * a button with its own name.
 *
 * Mapbox gives a marker element with no role `role="img"`, and one with no
 * label "Map marker". `role="img"` makes screen readers read the marker as a
 * picture and hide that it can be pressed, so both are set here, before the
 * element is handed to `new mapboxgl.Marker({ element })`. Used by every
 * clickable marker in the admin.
 */
export function createMapMarkerButton(
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.setAttribute("role", "button");
  element.setAttribute("aria-label", label);
  element.addEventListener("click", onClick);
  return element;
}
