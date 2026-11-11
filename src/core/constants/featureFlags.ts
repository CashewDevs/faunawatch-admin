/**
 * Feature switches. A feature is turned on for everyone by changing its
 * constant here (a one-line change); until then it stays off in production.
 */

/**
 * Request changes (a pending post can be sent back to the reporter).
 * OFF: the button stays disabled, and the "Changes requested" list tab, its
 * count and the Analytics bucket are hidden. The status itself, its pill,
 * the request history and the Withdraw button always work, so a request that
 * already exists can still be handled.
 */
// Widened so the code below still type-checks while this is false.
const requestChangesEnabled = false as boolean;

/**
 * Whether Request changes is on. In development only, setting
 * `VITE_ENABLE_REQUEST_CHANGES=true` in a local env file turns it on without
 * editing the constant; production builds ignore the variable.
 */
export function isRequestChangesEnabled(): boolean {
  return (
    requestChangesEnabled ||
    (import.meta.env.DEV &&
      import.meta.env.VITE_ENABLE_REQUEST_CHANGES === "true")
  );
}
