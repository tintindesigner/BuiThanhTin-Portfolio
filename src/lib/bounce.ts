import gsap from 'gsap'

/**
 * Squash/settle bounce, driven entirely by GSAP so it never fights a CSS
 * `:hover` transition on the same property. Shared across SEE MORE, NEXT
 * PROJECT, the back-to-top button, and About's skill badges (job cards
 * moved to a pure-CSS `@keyframes` version of this same shape — see
 * Work.module.css — after this JS enter/leave pairing desynced under
 * scroll; kept here for elements that don't have that failure mode).
 *
 * When `backingEl` is given, it rides the same timeline, counter-rotating
 * from its CSS resting `-6deg` toward `-4deg` and scaling from `0.5`
 * (hidden behind the main element's own footprint) up to `1`, so it pops
 * into view alongside the bounce instead of sitting invisible or moving
 * in lockstep. Nothing currently passes this — kept for a future
 * hidden-sticker-reveal element (the pattern job cards used before their
 * CSS rewrite).
 *
 * When `syncEl` is given, it's a decorative sibling that's ALREADY
 * visible at rest (e.g. an ink splat sitting next to the button) and
 * should read as physically part of the same cluster — it mirrors `el`'s
 * own y-offsets and rotation target directly (not a fixed reveal target
 * like `backingEl`), so it moves in lockstep rather than sitting inert.
 */
export function playSquashBounce(el: HTMLElement | null, backingEl: HTMLElement | null = null, syncEl: SVGElement | HTMLElement | null = null) {
  if (!el) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  gsap.killTweensOf(el)
  if (backingEl) gsap.killTweensOf(backingEl)
  if (syncEl) gsap.killTweensOf(syncEl)
  const tl = gsap.timeline()
  tl.to(el, { scaleX: 0.92, scaleY: 1.1, y: -4, duration: 0.14, ease: 'power2.out' }, 0)
    .to(el, { scaleX: 1.05, scaleY: 0.96, y: -11, rotate: -3, duration: 0.16, ease: 'power1.inOut' })
    .to(el, { scaleX: 1, scaleY: 1, y: -7, rotate: -3, duration: 0.4, ease: 'back.out(2.2)' })
  if (backingEl) {
    tl.to(backingEl, { rotate: -4, scale: 1, duration: 0.16, ease: 'power1.inOut' }, 0.14).to(
      backingEl,
      { rotate: -4, scale: 1, duration: 0.4, ease: 'back.out(2.2)' },
      0.3,
    )
  }
  if (syncEl) {
    // Explicit positions on every stage, not just the first — an
    // unlabeled `.to()` on a GSAP TIMELINE inserts at the end of the
    // WHOLE timeline so far (already extended to 0.7s by `el`'s own 3
    // stages), not "after this target's own previous stage" the way
    // chaining off a plain Tween would. Without these, stage 2/3 got
    // pushed to start at ~0.7s instead of 0.14s/0.3s — confirmed live
    // (sampled every 50-100ms through the full 0.7s and found `syncEl`
    // stuck at stage 1's target the whole time, only barely beginning
    // to move again right at the very end).
    tl.to(syncEl, { y: -4, duration: 0.14, ease: 'power2.out' }, 0)
      .to(syncEl, { y: -11, rotate: -3, duration: 0.16, ease: 'power1.inOut' }, 0.14)
      .to(syncEl, { y: -7, rotate: -3, duration: 0.4, ease: 'back.out(2.2)' }, 0.3)
  }
}

export function resetSquashBounce(el: HTMLElement | null, backingEl: HTMLElement | null = null, syncEl: SVGElement | HTMLElement | null = null) {
  if (!el) return
  gsap.killTweensOf(el)
  gsap.to(el, { scaleX: 1, scaleY: 1, y: 0, rotate: 0, duration: 0.3, ease: 'power2.out' })
  if (backingEl) {
    gsap.killTweensOf(backingEl)
    gsap.to(backingEl, { rotate: -6, scale: 0.5, duration: 0.3, ease: 'power2.out' })
  }
  if (syncEl) {
    gsap.killTweensOf(syncEl)
    gsap.to(syncEl, { y: 0, rotate: 0, duration: 0.3, ease: 'power2.out' })
  }
}
