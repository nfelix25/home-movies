// Client side of the film-details popup: response types, fetch helpers and small formatters.

export type Cast = { name: string; character: string | null };

/** GET /api/details/facts (TMDB) */
export type Facts = {
  tmdbId: number;
  imdbId: string | null;
  title: string;
  year: number | null;
  tagline: string | null;
  overview: string | null;
  runtimeMinutes: number | null;
  certification: string | null;
  genres: string[];
  directors: string[];
  cast: Cast[];
  releaseDate: string | null;
  languages: string[];
  countries: string[];
  tmdbScore: number | null;
  tmdbVoteCount: number;
};

export type Recommendation = { title: string; year: number; reason: string };

/** GET /api/details/insights (OpenAI with web search) */
export type Insights = {
  premise: string;
  reviews: {
    critics: string;
    audience: string;
    praised: string[];
    criticized: string[];
    /** `kind` is absent on results cached before it was recorded. */
    scores: { source: string; kind?: 'critics' | 'audience'; value: string }[];
  };
  moreLikeThis: Recommendation[];
  ifYouLiked: Recommendation[];
  sources: { title?: string; url: string }[];
  /** How many web searches ran. Absent on results cached before this was recorded. */
  searches?: number;
  generatedAt: string;
  model: string;
};

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string; code: string | null };

export type FilmIdentity = { imdbId: string | null; title: string; year: number };

/** A non-2xx answer from the details API. `code` is the server's machine-readable reason, if any. */
export class DetailsError extends Error {
  code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = 'DetailsError';
    this.code = code;
  }
}

/** The movie grid's titles end in "(1999)"; TMDB should be searched without it. */
export function cleanTitle(title: string): string {
  return title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
}

function queryFor(identity: FilmIdentity, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({
    title: cleanTitle(identity.title),
    year: String(identity.year),
    ...extra,
  });
  if (identity.imdbId) params.set('imdbId', identity.imdbId);
  return params.toString();
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new DetailsError(body?.error ?? `Request failed (${res.status}).`, body?.code ?? null);
  }
  return body as T;
}

export function fetchFacts(identity: FilmIdentity, signal: AbortSignal): Promise<Facts> {
  return getJson<Facts>(`/api/details/facts?${queryFor(identity)}`, signal);
}

/** `refresh` asks the server to regenerate instead of serving its cached copy. */
export function fetchInsights(identity: FilmIdentity, signal: AbortSignal, refresh = false): Promise<Insights> {
  const extra: Record<string, string> = refresh ? { refresh: '1' } : {};
  return getJson<Insights>(`/api/details/insights?${queryFor(identity, extra)}`, signal);
}

export function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/** 136 -> "2h 16m", 45 -> "45m" */
export function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** A calendar date like "1999-03-31" shown as "Mar 31, 1999", without timezone drift. */
export function formatReleaseDate(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** A moment in time shown as a local date. */
export function formatGenerated(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return isNaN(date.getTime())
    ? 'earlier'
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** A readable name for a source with no title: host plus path, so several pages of one site differ. */
export function labelOf(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const label = hostname.replace(/^www\./, '') + pathname.replace(/\/+$/, '');
    return label.length > 60 ? `${label.slice(0, 57)}…` : label;
  } catch {
    return url;
  }
}
