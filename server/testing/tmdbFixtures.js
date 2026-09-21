// Test-only TMDB payloads, shaped like the real API responses (fields we don't read are kept
// so partial-structure bugs can't hide).

export const MATRIX_OVERVIEW =
  'Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of ' +
  'underground insurgents fighting the vast and powerful computers who now rule the earth.';

/** One entry from /find or /search/movie results. */
export function findResult({ id = 603, title = 'The Matrix', release_date = '1999-03-30' } = {}) {
  return {
    adult: false,
    backdrop_path: '/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg',
    id,
    title,
    original_language: 'en',
    original_title: title,
    overview: MATRIX_OVERVIEW,
    poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    media_type: 'movie',
    genre_ids: [28, 878],
    popularity: 75.2,
    release_date,
    video: false,
    vote_average: 8.2,
    vote_count: 25811,
  };
}

/** Response of GET /find/{imdb_id}?external_source=imdb_id */
export function tmdbFind(movie = null) {
  return {
    movie_results: movie ? [movie] : [],
    person_results: [],
    tv_results: [],
    tv_episode_results: [],
    tv_season_results: [],
  };
}

/** Response of GET /search/movie */
export function tmdbSearch(results) {
  return { page: 1, results, total_pages: 1, total_results: results.length };
}

const CAST = [
  ['Keanu Reeves', 'Thomas A. Anderson / Neo'],
  ['Laurence Fishburne', 'Morpheus'],
  ['Carrie-Anne Moss', 'Trinity'],
  ['Hugo Weaving', 'Agent Smith'],
  ['Joe Pantoliano', 'Cypher'],
  ['Marcus Chong', 'Tank'],
  ['Julian Arahanga', 'Apoc'],
  ['Matt Doran', 'Mouse'],
  ['Belinda McClory', 'Switch'],
  ['Anthony Ray Parker', 'Dozer'],
];

/**
 * Response of GET /movie/{id}?append_to_response=credits,release_dates.
 * The GB rating is listed before the US one, and the US premiere entry has an empty
 * certification, both of which happen in real data.
 */
export function matrixDetails(overrides = {}) {
  return {
    adult: false,
    backdrop_path: '/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg',
    belongs_to_collection: {
      id: 2344,
      name: 'The Matrix Collection',
      poster_path: '/lh4aGpd3U9rm9B8Oqr6CUgQLtZL.jpg',
      backdrop_path: '/bRm2DEgUiYciDw3myHuYFInD7la.jpg',
    },
    budget: 63000000,
    genres: [
      { id: 28, name: 'Action' },
      { id: 878, name: 'Science Fiction' },
    ],
    homepage: '',
    id: 603,
    imdb_id: 'tt0133093',
    origin_country: ['US'],
    original_language: 'en',
    original_title: 'The Matrix',
    overview: MATRIX_OVERVIEW,
    popularity: 75.2,
    poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    production_companies: [{ id: 79, logo_path: null, name: 'Village Roadshow Pictures', origin_country: 'US' }],
    production_countries: [{ iso_3166_1: 'US', name: 'United States of America' }],
    release_date: '1999-03-30',
    revenue: 463517383,
    runtime: 136,
    spoken_languages: [{ english_name: 'English', iso_639_1: 'en', name: 'English' }],
    status: 'Released',
    tagline: 'Welcome to the Real World.',
    title: 'The Matrix',
    video: false,
    vote_average: 8.2069,
    vote_count: 25811,
    credits: {
      cast: CAST.map(([name, character], order) => ({
        adult: false,
        gender: 2,
        id: 1000 + order,
        known_for_department: 'Acting',
        name,
        original_name: name,
        popularity: 20,
        profile_path: null,
        cast_id: order,
        character,
        credit_id: `cast-${order}`,
        order,
      })),
      crew: [
        { id: 9001, name: 'Lilly Wachowski', job: 'Director', department: 'Directing', credit_id: 'crew-1' },
        { id: 9002, name: 'Lana Wachowski', job: 'Director', department: 'Directing', credit_id: 'crew-2' },
        { id: 9003, name: 'Joel Silver', job: 'Producer', department: 'Production', credit_id: 'crew-3' },
      ],
    },
    release_dates: {
      results: [
        {
          iso_3166_1: 'GB',
          release_dates: [
            { certification: '15', descriptors: [], iso_639_1: '', note: '', release_date: '1999-06-11T00:00:00.000Z', type: 3 },
          ],
        },
        {
          iso_3166_1: 'US',
          release_dates: [
            { certification: '', descriptors: [], iso_639_1: '', note: 'Premiere', release_date: '1999-03-24T00:00:00.000Z', type: 1 },
            { certification: 'R', descriptors: [], iso_639_1: '', note: '', release_date: '1999-03-31T00:00:00.000Z', type: 3 },
          ],
        },
      ],
    },
    ...overrides,
  };
}
