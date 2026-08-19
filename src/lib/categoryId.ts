// Shared between Work.tsx (assigns these as section ids) and About.tsx's
// skill badges (scroll to them on click) — e.g. "ADVERTISING" ->
// "work-advertising".
export function categoryId(label: string) {
  return `work-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
}

// Single source of truth for category label strings, so Work.tsx's own
// category data and About.tsx's badge-click targets can never drift apart
// (they used to be two independently hardcoded copies of the same strings).
export const CATEGORY_LABELS = {
  advertising: 'ADVERTISING',
  eventPosm: 'EVENT & POSM',
  socialPost: 'SOCIAL POST',
  motionGraphic: 'MOTION GRAPHIC & CLIP',
  productShooting: 'PRODUCT SHOOTING',
} as const
