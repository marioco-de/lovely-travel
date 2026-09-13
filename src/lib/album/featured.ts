export const FEATURED_SLUG = "portugal-mit-michael";
export const FEATURED_EDIT_HASH = "portugal-mit-michael-edit";
export const FEATURED_TITLE = "Portugal mit Michael";
export const FEATURED_PASSWORD = "tropical";
export const FEATURED_SESSION_KEY = "lovely-edit-portugal-mit-michael";

export function matchesFeaturedPassword(password: string) {
  return password.trim().toLowerCase() === FEATURED_PASSWORD;
}

export function readFeaturedUnlock() {
  try {
    return sessionStorage.getItem(FEATURED_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeFeaturedUnlock() {
  try {
    sessionStorage.setItem(FEATURED_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}
