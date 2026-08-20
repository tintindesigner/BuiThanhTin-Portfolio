// Matches the same "mobile" condition as every `@media (max-width: 767px)`
// block across the CSS modules, PLUS a landscape-phone case those blocks
// used to miss entirely: rotating a phone to landscape often pushes its
// width past 767px (common phones land ~800-930px landscape), so the site
// would silently switch to full desktop-scale layout while only having
// ~375-430px of actual height to fit it in -- everything sized as a % of
// width (Hero's box/badges/text, case-study's content card) overflowed
// wildly as a result. `(max-height: 500px) and (orientation: landscape)`
// catches that case too (500px comfortably covers real phones, well under
// any real desktop/laptop window height) without touching the width-only
// condition's own behavior at all.
export const MOBILE_MEDIA_QUERY = '(max-width: 767px), (max-height: 500px) and (orientation: landscape)'
