/** Per-user browsing data (localStorage). Logged-in users get their own key; guests use guest. */

export const PERSONALIZATION_EVENT = "gv-personalization-updated";

const MAX_VIEWS = 20;
const MAX_SEARCHES = 12;

export type RecentlyViewedEntry = {
  id: string;
  slug: string;
  name: string;
  category: string;
  viewedAt: number;
};

export type SearchHistoryEntry = {
  query: string;
  category?: string;
  searchedAt: number;
};

type PersonalizationStore = {
  views: RecentlyViewedEntry[];
  searches: SearchHistoryEntry[];
};

function storageKey(userId: string | null): string {
  return userId ? `gv_personalization_${userId}` : "gv_personalization_guest";
}

function readStore(userId: string | null): PersonalizationStore {
  if (typeof window === "undefined") return { views: [], searches: [] };
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { views: [], searches: [] };
    const parsed = JSON.parse(raw) as Partial<PersonalizationStore>;
    return {
      views: Array.isArray(parsed.views) ? parsed.views : [],
      searches: Array.isArray(parsed.searches) ? parsed.searches : [],
    };
  } catch {
    return { views: [], searches: [] };
  }
}

function writeStore(userId: string | null, store: PersonalizationStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(PERSONALIZATION_EVENT));
}

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PERSONALIZATION_EVENT));
  }
}

export function recordProductView(
  userId: string | null,
  product: Pick<RecentlyViewedEntry, "id" | "slug" | "name" | "category">,
) {
  const store = readStore(userId);
  const views = store.views.filter((v) => v.id !== product.id);
  views.unshift({ ...product, viewedAt: Date.now() });
  writeStore(userId, { ...store, views: views.slice(0, MAX_VIEWS) });
}

export function recordSearch(userId: string | null, query: string, category?: string) {
  const q = query.trim();
  if (!q) return;
  const store = readStore(userId);
  const searches = store.searches.filter(
    (s) => s.query.toLowerCase() !== q.toLowerCase() || s.category !== category,
  );
  searches.unshift({ query: q, category, searchedAt: Date.now() });
  writeStore(userId, { ...store, searches: searches.slice(0, MAX_SEARCHES) });
}

export function getRecentlyViewed(userId: string | null): RecentlyViewedEntry[] {
  return readStore(userId).views;
}

export function getRecentSearches(userId: string | null): SearchHistoryEntry[] {
  return readStore(userId).searches;
}

export function clearRecentSearches(userId: string | null) {
  const store = readStore(userId);
  writeStore(userId, { ...store, searches: [] });
}

export function mergeGuestPersonalizationIntoUser(userId: string) {
  if (typeof window === "undefined") return;
  const guest = readStore(null);
  const userStore = readStore(userId);
  const viewIds = new Set(userStore.views.map((v) => v.id));
  const mergedViews = [
    ...userStore.views,
    ...guest.views.filter((v) => !viewIds.has(v.id)),
  ].sort((a, b) => b.viewedAt - a.viewedAt).slice(0, MAX_VIEWS);

  const searchKeys = new Set(userStore.searches.map((s) => `${s.query}|${s.category ?? ""}`));
  const mergedSearches = [
    ...userStore.searches,
    ...guest.searches.filter((s) => !searchKeys.has(`${s.query}|${s.category ?? ""}`)),
  ].sort((a, b) => b.searchedAt - a.searchedAt).slice(0, MAX_SEARCHES);

  writeStore(userId, { views: mergedViews, searches: mergedSearches });
  localStorage.removeItem(storageKey(null));
  notify();
}

/** Categories & keywords inferred from user activity */
export function getPersonalizationSignals(userId: string | null) {
  const store = readStore(userId);
  const categories = Array.from(new Set(store.views.map((v) => v.category).filter(Boolean)));
  const queries = store.searches.map((s) => s.query.trim()).filter(Boolean);
  const viewedIds = store.views.map((v) => v.id);
  return { categories, queries, viewedIds, searches: store.searches };
}
