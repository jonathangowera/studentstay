/**
 * Months in one term. Hostel prices are stored per term; the engine compares monthly figures, so a term price is
 * divided by this number. The project owner set it to 5 (a semester is about 5 months).
 * TODO(OD): the length may differ by institution and should be confirmed with each one.
 */
export const TERM_MONTHS = 5;

/** How many ranked rooms a run keeps (rank 1 to 5, one recommended bed each). */
export const MAX_RANKED = 5;

/** How many excluded rooms a run keeps, with their reasons. record_recommendation accepts at most 400 rows in all. */
export const MAX_EXCLUDED = 300;
