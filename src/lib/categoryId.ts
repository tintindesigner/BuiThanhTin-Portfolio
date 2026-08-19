// Shared between Work.tsx (assigns these as section ids) and About.tsx's
// skill badges (scroll to them on click) — e.g. "ADVERTISING" ->
// "work-advertising".
export function categoryId(label: string) {
  return `work-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
}
