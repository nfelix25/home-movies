// Test-only OpenAI Responses API payloads, shaped like real responses: the message we want
// arrives after reasoning and web_search_call items, with url_citation annotations.

import { MATRIX_OVERVIEW } from './tmdbFixtures.js';

export const OPENAI_URL = 'https://api.openai.com/v1/responses';

/** What getMovieFacts returns for The Matrix (hand-written, not produced by the code under test). */
export const MATRIX_FACTS = {
  tmdbId: 603,
  imdbId: 'tt0133093',
  collectionId: 2344,
  title: 'The Matrix',
  year: 1999,
  tagline: 'Welcome to the Real World.',
  overview: MATRIX_OVERVIEW,
  runtimeMinutes: 136,
  certification: 'R',
  genres: ['Action', 'Science Fiction'],
  directors: ['Lilly Wachowski', 'Lana Wachowski'],
  cast: [
    { name: 'Keanu Reeves', character: 'Thomas A. Anderson / Neo' },
    { name: 'Laurence Fishburne', character: 'Morpheus' },
    { name: 'Carrie-Anne Moss', character: 'Trinity' },
    { name: 'Hugo Weaving', character: 'Agent Smith' },
  ],
  releaseDate: '1999-03-30',
  languages: ['English'],
  countries: ['US'],
  tmdbScore: 8.2,
  tmdbVoteCount: 25811,
};

/**
 * The JSON the model writes. Includes the things verification must catch: a film that does
 * not exist, the film itself, a duplicate, and a title with non-canonical casing.
 */
export const MODEL_PAYLOAD = {
  premise:
    'A restless programmer who moonlights as a hacker is drawn toward a question that has haunted him for years. ' +
    'When a stranger offers him the answer, he has to decide how far he is willing to follow it.',
  reviews: {
    critics:
      'Critics praised the groundbreaking visual effects and ambitious ideas, though a few found the dialogue heavy-handed.',
    audience: 'Audiences embraced it as a landmark of modern science fiction and rate it higher than most critics do.',
    praised: ['Groundbreaking action and effects', 'Ambitious, idea-driven story', 'Iconic production design'],
    criticized: ['Some stiff dialogue', 'Heavy exposition in places'],
    scores: [
      { source: 'Rotten Tomatoes', kind: 'critics', value: '83%' },
      { source: 'Metacritic', kind: 'critics', value: '73/100' },
    ],
  },
  moreLikeThis: [
    { title: 'Dark City', year: 1998, reason: 'Another story about a man who finds his reality is manufactured.' },
    { title: 'ghost in the shell', year: 1995, reason: 'A cyberpunk touchstone that shaped the film’s look.' },
    { title: 'Equilibrium', year: 2002, reason: 'Dystopian setting with stylized gun-fu action.' },
    { title: 'Nonexistent Film Noir', year: 1999, reason: 'Invented by the model.' },
    { title: 'The Matrix', year: 1999, reason: 'The film itself.' },
  ],
  ifYouLiked: [
    { title: 'Blade Runner', year: 1982, reason: 'A dystopian tech-noir that asks what is real.' },
    { title: 'Akira', year: 1988, reason: 'An anime landmark whose kinetic action inspired the film.' },
    { title: 'Akira', year: 1988, reason: 'A duplicate entry.' },
  ],
};

/** Three citations, the first and third pointing at the same page with tracking parameters. */
export const CITATIONS = [
  {
    type: 'url_citation',
    start_index: 10,
    end_index: 90,
    url: 'https://www.rogerebert.com/reviews/the-matrix-1999?utm_source=openai',
    title: 'The Matrix movie review & film summary (1999) | Roger Ebert',
  },
  {
    type: 'url_citation',
    start_index: 120,
    end_index: 200,
    url: 'https://www.rottentomatoes.com/m/matrix?utm_source=openai',
    title: 'The Matrix | Rotten Tomatoes',
  },
  {
    type: 'url_citation',
    start_index: 210,
    end_index: 300,
    url: 'https://www.rogerebert.com/reviews/the-matrix-1999?utm_source=openai',
    title: 'The Matrix movie review & film summary (1999) | Roger Ebert',
  },
];

/**
 * A full Responses API object. `content` replaces the message content (for refusals or
 * non-JSON text); `status`/`incompleteReason` model a response that did not finish.
 * `searchCalls` is how many web searches ran, and `consulted` the URLs the first one reports
 * in action.sources (present when the request asks for web_search_call.action.sources).
 */
export function openAiResponse({
  payload = MODEL_PAYLOAD,
  annotations = CITATIONS,
  status = 'completed',
  incompleteReason = null,
  content = null,
  searchCalls = 1,
  consulted = [],
} = {}) {
  const searches = Array.from({ length: searchCalls }, (_, i) => ({
    id: `ws_0a1b2c3${i}`,
    type: 'web_search_call',
    status: 'completed',
    action: {
      type: 'search',
      query: 'The Matrix 1999 reviews critics audience',
      sources: i === 0 ? consulted.map((url) => ({ type: 'url', url })) : [],
    },
  }));
  return {
    id: 'resp_0a1b2c3d4e5f60718293',
    object: 'response',
    created_at: 1758380000,
    status,
    background: false,
    error: null,
    incomplete_details: incompleteReason ? { reason: incompleteReason } : null,
    instructions: '(system prompt)',
    max_output_tokens: null,
    max_tool_calls: null,
    model: 'gpt-5.4-mini-2026-03-17',
    output: [
      { id: 'rs_0a1b2c3d', type: 'reasoning', summary: [] },
      ...searches,
      {
        id: 'msg_0a1b2c3d',
        type: 'message',
        status: 'completed',
        role: 'assistant',
        content: content ?? [
          { type: 'output_text', text: JSON.stringify(payload), annotations, logprobs: [] },
        ],
      },
    ],
    parallel_tool_calls: true,
    previous_response_id: null,
    reasoning: { effort: 'low', summary: null },
    store: true,
    temperature: 1,
    tool_choice: 'required',
    tools: [{ type: 'web_search', search_context_size: 'medium', user_location: null }],
    top_p: 1,
    truncation: 'disabled',
    usage: {
      input_tokens: 3210,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens: 940,
      output_tokens_details: { reasoning_tokens: 210 },
      total_tokens: 4150,
    },
    user: null,
    metadata: {},
  };
}
