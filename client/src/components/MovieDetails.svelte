<script lang="ts">
  import { onMount } from 'svelte';
  import {
    DetailsError,
    cleanTitle,
    fetchFacts,
    fetchInsights,
    formatGenerated,
    formatReleaseDate,
    formatRuntime,
    hostOf,
    isAbort,
    labelOf,
    type Facts,
    type Insights,
    type Loadable,
    type Recommendation,
  } from '../lib/details';

  let {
    movie,
    onclose,
    onsearch,
  }: {
    movie: { title: string; year: number; imdbId: string | null; poster: string | null; rating: number };
    onclose: () => void;
    onsearch: (title: string) => void;
  } = $props();

  let dialog = $state<HTMLDialogElement>();
  let pressedBackdrop = false;

  let facts = $state<Loadable<Facts>>({ status: 'loading' });
  let insights = $state<Loadable<Insights>>({ status: 'loading' });
  let regenerating = $state(false);
  let regenerateError = $state<string | null>(null);

  const controller = new AbortController();

  const identity = () => ({ imdbId: movie.imdbId, title: movie.title, year: movie.year });

  function failure(err: unknown) {
    return {
      status: 'error' as const,
      message: err instanceof DetailsError ? err.message : 'Could not reach the server.',
      code: err instanceof DetailsError ? err.code : null,
    };
  }

  async function loadFacts() {
    facts = { status: 'loading' };
    try {
      facts = { status: 'ok', data: await fetchFacts(identity(), controller.signal) };
    } catch (err) {
      if (!isAbort(err)) facts = failure(err);
    }
  }

  /** `refresh` regenerates; the previous result stays on screen until the new one arrives. */
  async function loadInsights(refresh = false) {
    const keepPrevious = refresh && insights.status === 'ok';
    if (keepPrevious) {
      regenerating = true;
      regenerateError = null;
    } else {
      insights = { status: 'loading' };
    }
    try {
      insights = { status: 'ok', data: await fetchInsights(identity(), controller.signal, refresh) };
    } catch (err) {
      if (isAbort(err)) return;
      if (keepPrevious) regenerateError = failure(err).message;
      else insights = failure(err);
    } finally {
      regenerating = false;
    }
  }

  onMount(() => {
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    loadFacts();
    loadInsights();
    return () => {
      controller.abort();
      document.body.style.overflow = previousOverflow;
    };
  });

  function handleClick(event: MouseEvent) {
    // Only a press and release that both land on the backdrop close it, so dragging a text
    // selection out of the sheet does not.
    if (pressedBackdrop && event.target === dialog) dialog?.close();
  }

  const factsData = $derived(facts.status === 'ok' ? facts.data : null);
  const insightsData = $derived(insights.status === 'ok' ? insights.data : null);
  const loadingInsights = $derived(insights.status === 'loading');
  const noKey = $derived(insights.status === 'error' && insights.code === 'NO_KEY');
  // When TMDB is the problem, insights fail for the same reason, so only one notice is shown.
  const insightsFailed = $derived(insights.status === 'error' && !noKey && facts.status !== 'error');

  const title = $derived(factsData?.title ?? cleanTitle(movie.title));
  const year = $derived(factsData?.year ?? movie.year);

  const factRows = $derived.by(() => {
    const f = factsData;
    if (!f) return [];
    const rows: [string, string][] = [];
    const runtime = formatRuntime(f.runtimeMinutes);
    if (runtime) rows.push(['Runtime', runtime]);
    if (f.certification) rows.push(['Rated', f.certification]);
    const released = formatReleaseDate(f.releaseDate);
    if (released) rows.push(['Released', released]);
    if (f.languages.length > 0) rows.push(['Language', f.languages.join(', ')]);
    if (f.genres.length > 0) rows.push(['Genres', f.genres.join(', ')]);
    if (f.directors.length > 0) rows.push([f.directors.length > 1 ? 'Directors' : 'Director', f.directors.join(', ')]);
    if (f.cast.length > 0) rows.push(['Starring', f.cast.map((c) => c.name).join(', ')]);
    return rows;
  });

  // Scores the model found on the web, minus any we already show from our own data
  // (it sometimes returns IMDb even when told not to).
  const webScores = $derived.by(() => {
    const own = new Set<string>();
    if (factsData?.tmdbScore != null) own.add('tmdb');
    if (movie.rating > 0) own.add('imdb');
    const site = (source: string) => source.toLowerCase().replace(/[^a-z]/g, '').replace(/com$/, '');
    return (insightsData?.reviews.scores ?? []).filter((score) => !own.has(site(score.source)));
  });

  const scores = $derived.by(() => {
    const list: { value: string; source: string }[] = [];
    if (factsData?.tmdbScore != null) list.push({ value: factsData.tmdbScore.toFixed(1), source: 'TMDB' });
    if (movie.rating > 0) list.push({ value: movie.rating.toFixed(1), source: 'IMDb' });
    // "Rotten Tomatoes critics" and "Rotten Tomatoes audience" are different numbers.
    for (const score of webScores) {
      list.push({ value: score.value, source: score.kind ? `${score.source} ${score.kind}` : score.source });
    }
    return list;
  });

  const showReviews = $derived(scores.length > 0 || loadingInsights || insightsData !== null);
  const hasRecommendations = $derived(
    insightsData !== null && (insightsData.moreLikeThis.length > 0 || insightsData.ifYouLiked.length > 0)
  );
</script>

{#snippet skeleton(widths: string[])}
  <div aria-hidden="true">
    {#each widths as width}
      <span class="skeleton" style:width></span>
    {/each}
  </div>
{/snippet}

{#snippet recommendations(items: Recommendation[])}
  <ul class="recs">
    {#each items as rec (rec.title + rec.year)}
      <li>
        <button class="rec" onclick={() => onsearch(rec.title)} title="Search the movie grid for {rec.title}">
          <span>
            <span class="rec-title">{rec.title}<span class="rec-year">{rec.year}</span></span>
            <span class="rec-reason">{rec.reason}</span>
          </span>
          <svg class="rec-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
      </li>
    {/each}
  </ul>
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialog}
  class="details"
  aria-labelledby="details-title"
  {onclose}
  onmousedown={(event) => (pressedBackdrop = event.target === dialog)}
  onclick={handleClick}
>
  <div class="close-row">
    <button class="close" onclick={() => dialog?.close()} aria-label="Close">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
      </svg>
    </button>
  </div>

  <header class="head">
    <div class="poster">
      {#if movie.poster}
        <img src={movie.poster} alt="" />
      {:else}
        <div class="poster-empty">No image</div>
      {/if}
    </div>

    <div class="title-block">
      <h2 id="details-title">{title}<span class="year">{year}</span></h2>
      {#if factsData?.tagline}
        <p class="tagline">{factsData.tagline}</p>
      {/if}
    </div>

    {#if factRows.length > 0}
      <dl class="facts">
        {#each factRows as [label, value]}
          <dt>{label}</dt>
          <dd>{value}</dd>
        {/each}
      </dl>
    {:else if facts.status === 'loading'}
      <div class="facts">{@render skeleton(['55%', '40%', '70%', '62%', '80%'])}</div>
    {/if}
  </header>

  <div class="body">
    {#if facts.status === 'error'}
      <p class="notice error" role="alert">{facts.message}</p>
    {/if}

    {#if noKey}
      <p class="notice" role="status">
        The premise, reviews and recommendations need an OpenAI key. Add <code>OPEN_AI_API_KEY</code> to
        <code>.env</code> and restart the server.
      </p>
    {:else if insightsFailed && insights.status === 'error'}
      <div class="notice error" role="alert">
        <p>Couldn't load the premise, reviews and recommendations. {insights.message}</p>
        <button class="btn" onclick={() => loadInsights()}>Try again</button>
      </div>
    {:else if loadingInsights}
      <p class="notice" role="status">
        Researching reviews and recommendations. The first time you open a film this can take up to a minute;
        after that it opens instantly.
      </p>
    {/if}

    {#if insightsData?.searches === 0}
      <p class="notice" role="status">
        No web search ran for this result, so its reviews and scores come from the model's memory. Regenerate to
        try again.
      </p>
    {/if}

    <section aria-labelledby="premise-heading">
      <h3 id="premise-heading">
        {insightsData || loadingInsights ? 'Premise' : 'Synopsis'}
        {#if insightsData}<span class="hint">spoiler-free</span>{/if}
      </h3>
      {#if insightsData}
        <p class="prose lead">{insightsData.premise}</p>
      {:else if loadingInsights}
        {@render skeleton(['100%', '94%', '58%'])}
      {:else if factsData?.overview}
        <p class="prose">{factsData.overview}</p>
        <p class="hint">Synopsis from TMDB. It may include spoilers.</p>
      {:else}
        <p class="hint">No synopsis available.</p>
      {/if}
    </section>

    {#if showReviews}
      <section aria-labelledby="reviews-heading">
        <h3 id="reviews-heading">Reviews</h3>
        {#if scores.length > 0}
          <ul class="scoreboard">
            {#each scores as score}
              <li>
                <span class="score-value">{score.value}</span>
                <span class="score-source">{score.source}</span>
              </li>
            {/each}
          </ul>
        {/if}

        {#if insightsData}
          {@const reviews = insightsData.reviews}
          {#if reviews.critics || reviews.audience}
            <div class="two-up">
              {#if reviews.critics}
                <div>
                  <h4>Critics</h4>
                  <p class="prose">{reviews.critics}</p>
                </div>
              {/if}
              {#if reviews.audience}
                <div>
                  <h4>Audiences</h4>
                  <p class="prose">{reviews.audience}</p>
                </div>
              {/if}
            </div>
          {/if}
          {#if reviews.praised.length > 0 || reviews.criticized.length > 0}
            <div class="two-up">
              {#if reviews.praised.length > 0}
                <div>
                  <h4>Praised</h4>
                  <ul class="points">
                    {#each reviews.praised as point}<li>{point}</li>{/each}
                  </ul>
                </div>
              {/if}
              {#if reviews.criticized.length > 0}
                <div>
                  <h4>Criticized</h4>
                  <ul class="points">
                    {#each reviews.criticized as point}<li>{point}</li>{/each}
                  </ul>
                </div>
              {/if}
            </div>
          {/if}
          {#if webScores.length > 0}
            <p class="hint">
              {insightsData.sources.length > 0
                ? 'Scores other than TMDB and IMDb come from a web search. Check the sources below.'
                : 'Scores other than TMDB and IMDb come from a web search, but no sources were returned. Treat them as unverified.'}
            </p>
          {/if}
        {:else if loadingInsights}
          {@render skeleton(['100%', '90%', '96%', '52%'])}
        {/if}
      </section>
    {/if}

    {#if insightsData && hasRecommendations}
      <div class="rec-columns">
        {#if insightsData.moreLikeThis.length > 0}
          <section aria-labelledby="more-heading">
            <h3 id="more-heading">More like this</h3>
            {@render recommendations(insightsData.moreLikeThis)}
          </section>
        {/if}
        {#if insightsData.ifYouLiked.length > 0}
          <section aria-labelledby="liked-heading">
            <h3 id="liked-heading">If you liked…</h3>
            <p class="hint under-heading">Fans of these tend to enjoy this film.</p>
            {@render recommendations(insightsData.ifYouLiked)}
          </section>
        {/if}
      </div>
    {:else if loadingInsights}
      <div class="rec-columns">
        <section aria-label="More like this">{@render skeleton(['70%', '85%', '60%', '78%', '66%'])}</section>
        <section aria-label="If you liked">{@render skeleton(['80%', '64%', '90%', '58%', '72%'])}</section>
      </div>
    {/if}

    {#if insightsData}
      <footer class="foot">
        {#if insightsData.sources.length > 0}
          <details class="sources">
            <summary>Sources ({insightsData.sources.length})</summary>
            <ul>
              {#each insightsData.sources as source (source.url)}
                <li>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title || labelOf(source.url)}</a>
                  {#if source.title}<span class="host">{hostOf(source.url)}</span>{/if}
                </li>
              {/each}
            </ul>
          </details>
        {/if}
        <div class="regen">
          <span class="hint">Generated {formatGenerated(insightsData.generatedAt)} with {insightsData.model}</span>
          <button class="btn" onclick={() => loadInsights(true)} disabled={regenerating}>
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>
        {#if regenerateError}
          <p class="notice error" role="alert">
            Couldn't regenerate. {regenerateError} The previous version is still shown.
          </p>
        {/if}
      </footer>
    {/if}
  </div>
</dialog>

<style>
  dialog.details {
    --ink: #eee;
    --body: #ccc;
    --muted: #888;
    --icon: #777;
    --line: #2a2a2a;
    --surface: #151515;
    --raised: #1d1d1d;
    --accent: #adf;
    --accent-line: #4a8abf;
    --danger: #e88;

    width: min(920px, calc(100% - 2rem));
    max-height: min(90dvh, 900px);
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  dialog.details::backdrop {
    background: rgba(0, 0, 0, 0.78);
  }

  dialog.details :focus-visible {
    outline: 2px solid var(--accent-line);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: no-preference) {
    dialog.details[open] {
      animation: rise 160ms ease-out;
    }
    dialog.details[open]::backdrop {
      animation: fade 160ms ease-out;
    }
    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.985);
      }
    }
    @keyframes fade {
      from {
        opacity: 0;
      }
    }
  }

  /* Zero-height sticky row: the close button stays in view while the sheet scrolls,
     without taking space from the header. */
  .close-row {
    position: sticky;
    top: 0;
    z-index: 2;
    height: 0;
    display: flex;
    justify-content: flex-end;
  }

  .close {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    margin: 0.75rem;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 50%;
    background: rgba(21, 21, 21, 0.92);
    color: var(--body);
  }

  .close:hover {
    background: var(--raised);
    border-color: #444;
  }

  /* ── Header ─────────────────────────────────────────────────────────────── */

  .head {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr);
    grid-template-areas:
      'poster title'
      'poster facts';
    grid-template-rows: auto 1fr;
    column-gap: 1.5rem;
    row-gap: 0.9rem;
    padding: 1.5rem;
  }

  .poster {
    grid-area: poster;
    aspect-ratio: 2 / 3;
    overflow: hidden;
    border-radius: 4px;
    background: #111;
  }

  .poster img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .poster-empty {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    color: #555;
    font-size: 0.8rem;
  }

  .title-block {
    grid-area: title;
    padding-right: 2.25rem;
  }

  h2 {
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  .year {
    margin-left: 0.6rem;
    font-size: 1.1rem;
    font-weight: 400;
    color: var(--muted);
  }

  .tagline {
    margin: 0.4rem 0 0;
    color: var(--muted);
    font-style: italic;
  }

  .facts {
    grid-area: facts;
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 0.45rem 1.1rem;
    align-content: start;
    margin: 0;
    font-size: 0.9rem;
  }

  .facts dt {
    color: var(--muted);
  }

  .facts dd {
    margin: 0;
    color: var(--body);
  }

  /* ── Body ───────────────────────────────────────────────────────────────── */

  .body {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    padding: 0 1.5rem 1.75rem;
  }

  .body > section,
  .rec-columns,
  .foot {
    padding-top: 1.25rem;
    border-top: 1px solid var(--line);
  }

  h3 {
    margin-bottom: 0.65rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: #ddd;
  }

  h4 {
    margin: 0 0 0.3rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--muted);
  }

  .hint {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--muted);
  }

  h3 .hint {
    margin-left: 0.5rem;
  }

  .prose + .hint {
    margin-top: 0.5rem;
  }

  .under-heading {
    margin: -0.35rem 0 0.5rem;
  }

  .prose {
    max-width: 66ch;
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.65;
    color: var(--body);
  }

  .prose.lead {
    font-size: 1.02rem;
    color: var(--ink);
  }

  .notice {
    margin: 0;
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--raised);
    color: var(--body);
    font-size: 0.9rem;
  }

  .notice.error {
    border-color: #5a2a2a;
    color: var(--danger);
  }

  .notice p {
    margin: 0 0 0.6rem;
  }

  .notice code {
    font-size: 0.85em;
    color: var(--ink);
  }

  /* ── Reviews ────────────────────────────────────────────────────────────── */

  .scoreboard {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 0;
    margin: 0 0 1.1rem;
    padding: 0;
    list-style: none;
  }

  .scoreboard li {
    display: flex;
    flex-direction: column;
    padding: 0 1.25rem;
    border-left: 1px solid var(--line);
  }

  .scoreboard li:first-child {
    padding-left: 0;
    border-left: 0;
  }

  .score-value {
    font-size: 1.35rem;
    font-weight: 600;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
  }

  .score-source {
    font-size: 0.8rem;
    color: var(--muted);
  }

  .two-up {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem 2rem;
    margin-bottom: 1rem;
  }

  .points {
    margin: 0;
    padding-left: 1.1rem;
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--body);
  }

  /* ── Recommendations ────────────────────────────────────────────────────── */

  .rec-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.75rem 2rem;
  }

  .recs {
    display: flex;
    flex-direction: column;
    margin: 0 -0.5rem;
    padding: 0;
    list-style: none;
  }

  .rec {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    padding: 0.6rem 0.5rem;
    border: 0;
    border-radius: 4px;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
  }

  .rec:hover {
    background: var(--raised);
  }

  .rec-title {
    display: block;
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--ink);
  }

  .rec-year {
    margin-left: 0.4rem;
    font-weight: 400;
    color: var(--muted);
  }

  .rec-reason {
    display: block;
    margin-top: 0.1rem;
    font-size: 0.85rem;
    line-height: 1.45;
    color: var(--muted);
  }

  .rec-icon {
    flex: none;
    margin-top: 0.15rem;
    color: var(--icon);
  }

  .rec:hover .rec-icon,
  .rec:focus-visible .rec-icon {
    color: var(--accent);
  }

  /* ── Footer ─────────────────────────────────────────────────────────────── */

  .foot {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .sources summary {
    width: fit-content;
    font-size: 0.85rem;
    color: var(--muted);
    cursor: pointer;
  }

  .sources ul {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin: 0.6rem 0 0;
    padding: 0;
    list-style: none;
    font-size: 0.85rem;
  }

  .sources a {
    color: var(--accent);
  }

  .host {
    margin-left: 0.5rem;
    color: var(--muted);
  }

  .regen {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .btn {
    padding: 0.45rem 0.9rem;
    border: 1px solid #444;
    border-radius: 4px;
    background: #1a1a1a;
    color: #ccc;
    font-size: 0.85rem;
    transition: background 0.15s, border-color 0.15s;
  }

  .btn:hover:not(:disabled) {
    background: #2a2a2a;
    border-color: #666;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: default;
  }

  /* ── Loading placeholders ───────────────────────────────────────────────── */

  .skeleton {
    display: block;
    height: 0.85rem;
    margin: 0.6rem 0;
    border-radius: 3px;
    background: #222;
  }

  @media (prefers-reduced-motion: no-preference) {
    .skeleton {
      animation: pulse 1.6s ease-in-out infinite;
    }
    @keyframes pulse {
      50% {
        opacity: 0.45;
      }
    }
  }

  /* ── Phones: a full-screen sheet ────────────────────────────────────────── */

  @media (max-width: 640px) {
    /* Pinned to all four viewport edges. Unlike 100dvh, this still fills the screen when
       the page behind is wider than the phone and the browser zooms out. */
    dialog.details {
      inset: 0;
      margin: 0;
      width: 100%;
      max-width: none;
      height: 100%;
      max-height: none;
      border: 0;
      border-radius: 0;
    }

    .head {
      grid-template-columns: 104px minmax(0, 1fr);
      grid-template-areas:
        'poster title'
        'facts facts';
      grid-template-rows: auto;
      column-gap: 1rem;
      padding: 1rem;
    }

    h2 {
      font-size: 1.25rem;
    }

    .body {
      padding: 0 1rem 1.5rem;
    }

    /* Scores wrap onto several rows here, so spacing replaces the dividers. */
    .scoreboard {
      gap: 1rem 1.75rem;
    }

    .scoreboard li {
      padding: 0;
      border-left: 0;
    }

    .rec-columns {
      grid-template-columns: 1fr;
    }
  }
</style>
