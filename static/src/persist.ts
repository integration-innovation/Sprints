/**
 * Asking the browser to keep what it has been given.
 *
 * A programme lives in localStorage, and browsers evict localStorage. Safari's
 * tracking prevention clears script-writable storage for a site after roughly a
 * week without a visit; Chrome and Firefox evict under storage pressure. None
 * of that announces itself. Somebody runs an hour, comes back a fortnight later
 * and the programme is simply not there — which is exactly the failure this
 * module exists to reduce, and to warn about when it cannot.
 *
 * `navigator.storage.persist()` is the standard way to opt out of that. Chrome
 * and Firefox grant it to sites the person has engaged with or installed;
 * Safari grants it to an installed home-screen app. It is a request, never a
 * guarantee, so the interface has to report what was actually granted rather
 * than claim safety it does not have — and a backup file remains the only thing
 * that survives a browser deciding otherwise.
 */

export type StorageHealth = {
  /** True only when the browser has actually granted persistence. */
  persisted: boolean;
  /** False when the API is missing entirely — an older browser, or a sandbox. */
  supported: boolean;
  usageBytes?: number;
  quotaBytes?: number;
};

export const UNKNOWN: StorageHealth = { persisted: false, supported: false };

/**
 * Asks once, then reports. Calling `persist()` when already persisted is a
 * no-op that resolves true, so this is safe to call on every load — and it is
 * called on every load deliberately: a browser that refused when the app was
 * new often grants it later, once the person has come back a few times.
 */
export async function requestPersistence(): Promise<StorageHealth> {
  const storage = typeof navigator !== "undefined" ? navigator.storage : undefined;
  if (!storage || typeof storage.persist !== "function") return UNKNOWN;

  let persisted = false;
  try {
    persisted = (await storage.persisted?.()) ?? false;
    if (!persisted) persisted = await storage.persist();
  } catch {
    return UNKNOWN;
  }

  let usageBytes: number | undefined;
  let quotaBytes: number | undefined;
  try {
    const estimate = await storage.estimate?.();
    usageBytes = estimate?.usage;
    quotaBytes = estimate?.quota;
  } catch {
    // An estimate is a nicety; whether it persisted is the part that matters.
  }

  return { persisted, supported: true, usageBytes, quotaBytes };
}

/** True when this looks like an installed app rather than a browser tab. */
export function installed(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return standalone || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

/** iOS is the case where installing is the only route to durable storage. */
export function isApple(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export type Durability = "persisted" | "installed" | "at-risk" | "unknown";

/**
 * What to tell somebody about their data surviving until the next sprint.
 *
 * Deliberately pessimistic where it cannot tell. "Unknown" and "at risk" get
 * the same advice — take a backup — because the cost of a wrong reassurance is
 * a lost programme and the cost of a wrong warning is one tap.
 */
export function durability(health: StorageHealth): Durability {
  if (health.persisted) return "persisted";
  if (installed()) return "installed";
  if (!health.supported) return "unknown";
  return "at-risk";
}
