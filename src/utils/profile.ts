import type { Handedness } from '../api/api.users';

/** NTRP ratings the pickers offer, in half steps: 1.0 to 7.0. */
export const USTA_RATINGS: ReadonlyArray<number> = Array.from(
  { length: 13 },
  (_, index) => 1 + index * 0.5,
);

/** The handedness values the API accepts. */
export const HANDEDNESS_VALUES: ReadonlyArray<Handedness> = ['Right', 'Left', 'Ambidextrous'];

/** `''` is a picker's "Not set" option for handedness. */
export type HandednessValue = Handedness | '';

/** The ratings to offer, keeping a stored value that sits off the half-step grid. */
export function ustaRatingOptions(current?: number | null): number[] {
  if (current == null || USTA_RATINGS.includes(current)) return [...USTA_RATINGS];
  return [...USTA_RATINGS, current].sort((a, b) => a - b);
}

/** 4.5 → "4.5"; unset → "-". */
export function formatUstaRating(rating?: number | null): string {
  if (rating == null) return '-';
  return rating.toFixed(1);
}
