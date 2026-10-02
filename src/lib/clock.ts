// The app clock. "Today" is pinned so the prototype tells the same story in
// every demo and the nightly-vs-live freshness gap is always visible. Anything
// that needs "now" reads it from here — swap this for `new Date()` once the
// data is real.
export const TODAY = new Date('2026-09-08T09:20:00+02:00');

// Plain calendar date, not a Date — every use is a "<= cutoff" string
// comparison against other YYYY-MM-DD values. A Date at local midnight would
// convert to the *previous* day once .toISOString() rolls it to UTC, quietly
// truncating nightly sources a day earlier than every "complete through"
// label claims.
export const YESTERDAY_ISO = '2026-09-07';
