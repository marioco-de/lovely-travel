export const FEATURED_SLUG = "portugal-urlaub";
export const FEATURED_EDIT_HASH = "portugal-urlaub-edit";
export const FEATURED_TITLE = "Portugal-Urlaub";
export const FEATURED_PASSWORD = "tropical";
export const FEATURED_SESSION_KEY = "lovely-edit-portugal-urlaub";

export const PRIVATE_SLUG = "portugal-mit-michael";
export const PRIVATE_EDIT_HASH = "portugal-mit-michael-edit";
export const PRIVATE_TITLE = "Portugal mit Michael";
export const PRIVATE_SESSION_KEY = "lovely-edit-portugal-mit-michael";

export function matchesFeaturedPassword(password: string) {
  return password.trim().toLowerCase() === FEATURED_PASSWORD;
}

export function readFeaturedUnlock() {
  try {
    return sessionStorage.getItem(FEATURED_SESSION_KEY) === "1" || sessionStorage.getItem(PRIVATE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeFeaturedUnlock() {
  try {
    sessionStorage.setItem(FEATURED_SESSION_KEY, "1");
    sessionStorage.setItem(PRIVATE_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function albumPublicHref(publicHash?: string) {
  if (!publicHash) return "/";
  if (publicHash === PRIVATE_SLUG) return `/${PRIVATE_SLUG}/`;
  if (publicHash === FEATURED_SLUG) return `/${FEATURED_SLUG}/`;
  return `/t/${publicHash}/`;
}

export function albumEditHref(publicHash?: string, editHash?: string) {
  if (publicHash === PRIVATE_SLUG || editHash === PRIVATE_EDIT_HASH) return `/${PRIVATE_SLUG}/edit/`;
  if (publicHash === FEATURED_SLUG || editHash === FEATURED_EDIT_HASH) return `/${FEATURED_SLUG}/edit/`;
  if (publicHash) return `/t/${publicHash}/edit/`;
  if (editHash) return `/e/${editHash}/`;
  return "";
}

export function albumSettingsHref(publicHash?: string, editHash?: string) {
  if (publicHash === PRIVATE_SLUG || editHash === PRIVATE_EDIT_HASH) return `/${PRIVATE_SLUG}/settings/`;
  if (publicHash === FEATURED_SLUG || editHash === FEATURED_EDIT_HASH) return `/${FEATURED_SLUG}/settings/`;
  if (publicHash) return `/t/${publicHash}/settings/`;
  if (editHash) return `/s/${editHash}/`;
  return "";
}
