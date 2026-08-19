import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { TouchEvent, MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import styles from './Lightbox.module.css'

export interface LightboxImage {
  src: string
  alt: string
}

interface LightboxProps {
  images: LightboxImage[]
  startIndex: number
  onClose: () => void
}

const SWIPE_THRESHOLD = 50

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M15 5 L8 12 L15 19' : 'M9 5 L16 12 L9 19'}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Full-screen image viewer, scoped to ONE section's image group (not
 * every image on the page). Rendered via a portal straight onto
 * `document.body` — a modal overlay shouldn't inherit any ancestor's
 * stacking/overflow quirks, portal is the standard fix regardless of
 * what the specific quirk would have been.
 *
 * Prev/next arrows are simply absent at the group's edges rather than
 * disabled — except going past the LAST image (right arrow, or a
 * left-swipe on mobile) closes the lightbox instead of doing nothing
 * (explicit ask, now consistent on both input methods) — the mirror
 * case, going before the FIRST image (left arrow / right-swipe), stays a
 * no-op either way. Vertical swipe also closes on mobile; so does
 * clicking the dark backdrop.
 *
 * Switching images slides the outgoing/incoming photo past each other
 * horizontally (direction-aware — next enters from the right, prev from
 * the left), matching the iOS Photos swipe-between-photos feel per an
 * explicit ask, rather than the crossfade+scale this had before.
 */
export default function Lightbox({ images, startIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(startIndex)
  // The image being replaced, kept mounted just long enough to slide itself
  // off-screen on top of the incoming one — without this, switching images
  // is a hard cut (old pixels gone, new one already sliding in) rather than
  // two photos actually passing each other.
  const [prevImage, setPrevImage] = useState<LightboxImage | null>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const prevSlotRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  // Tracks whichever image the main slot is CURRENTLY showing, so the
  // index-change effect below can grab it as the outgoing image before
  // overwriting it — separate from `index` itself since this must still
  // hold the OLD value while that effect runs.
  const displayedRef = useRef(images[startIndex])
  const mountedRef = useRef(false)
  // +1 = came from goNext (incoming slides in from the right), -1 = goPrev
  // (from the left). Read by the index-change effect right after it fires.
  const directionRef = useRef<1 | -1>(1)

  const isFirst = index === 0
  const isLast = index === images.length - 1

  const goPrev = () => {
    if (isFirst) return
    directionRef.current = -1
    setIndex((i) => i - 1)
  }
  // Closing here (not just clamping) is what makes → on the last image
  // exit instead of no-op — the one asymmetric case in the spec.
  const goNext = () => {
    if (isLast) {
      handleClose()
      return
    }
    directionRef.current = 1
    setIndex((i) => i + 1)
  }

  const handleClose = () => {
    if (!overlayRef.current) {
      onClose()
      return
    }
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: onClose })
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirst, isLast])

  useEffect(() => {
    if (!overlayRef.current) return
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' })
  }, [])

  // Decodes every image in this group as soon as the lightbox opens, off
  // the visible `<img>` entirely — real image assets here run 300KB-1MB+
  // (deliberately NOT downscaled, this project prioritizes display
  // quality), and decode cost scales with pixel count: measured ~110ms
  // for one of these vs ~10ms for an already-small image. Without this,
  // that decode happens ON the incoming <img> right as the slide-in tween
  // starts, competing with it for the main thread and reading as a stutter
  // exactly when the new photo should already be sliding in smoothly.
  // Firing decode() for the whole (small, single-section) group up front
  // means it's almost always finished by the time the user actually clicks
  // Next/Prev, not during the animation. Empty deps — this group is fixed
  // for the lightbox's lifetime, only needs to run once per open.
  useEffect(() => {
    images.forEach(({ src }) => {
      const img = new Image()
      img.src = src
      img.decode().catch(() => {})
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // `useLayoutEffect`, not `useEffect` — the incoming <img>'s `src` swaps
  // onto this SAME DOM node as part of the `index` state update, so if
  // the "from" (off-screen, transparent, small) values weren't pinned
  // until AFTER the browser's next paint, there'd be one frame showing
  // the new photo already sitting at its FINAL resting transform (still
  // whatever the slot was left at from the previous transition) before
  // snapping back to the animation's start — a visible flash right as
  // each switch begins. A layout effect runs synchronously before paint,
  // so GSAP's `fromTo` sets that starting transform before anything hits
  // the screen.
  useLayoutEffect(() => {
    // First run is the lightbox's own opening entrance (`displayedRef`
    // already matches `index`, so there's no "previous" image to slide
    // from) — keeps the original scale+fade pop-in. Every run after that
    // is a real prev/next switch, which slides instead.
    if (!mountedRef.current) {
      mountedRef.current = true
      if (slotRef.current) {
        gsap.fromTo(slotRef.current, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' })
      }
      return
    }
    const outgoing = displayedRef.current
    displayedRef.current = images[index]
    setPrevImage(outgoing)
    if (slotRef.current) {
      // Slide + scale-in + fade-in together (not slide alone) — reads
      // noticeably smoother than a flat translate, and pairs with the
      // outgoing slot's mirrored scale-out/fade-out below.
      gsap.fromTo(
        slotRef.current,
        { xPercent: directionRef.current * 100, opacity: 0, scale: 0.7 },
        { xPercent: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // Runs once the outgoing image's own slot is actually mounted (a state
  // update, so it lands a render after the effect above sets it) — slides
  // it off in the opposite direction from the incoming photo, then drops
  // it so it stops blocking clicks/swipes on the image beneath.
  //
  // `fromTo` here, not a plain `to` — a bare `.to()` doesn't pin the
  // element's starting values synchronously, it just registers the tween
  // and applies the first frame on GSAP's next tick. Since this effect
  // fires a render after the incoming slot's OWN fromTo (which pins
  // synchronously), that gap meant the outgoing image sat fully opaque
  // and untransformed — visibly overlapping the already-moving incoming
  // image — for one paint before its own animation kicked in: the
  // "nháy nhẹ" flash, and what made the two feel sequential instead of
  // simultaneous. Explicitly pinning the from-state here closes that gap.
  useLayoutEffect(() => {
    if (!prevImage || !prevSlotRef.current) return
    const target = prevSlotRef.current
    gsap.fromTo(
      target,
      { xPercent: 0, opacity: 1, scale: 1 },
      {
        xPercent: -directionRef.current * 100,
        opacity: 0,
        scale: 0.7,
        duration: 0.45,
        ease: 'power3.in',
        onComplete: () => setPrevImage((current) => (current === prevImage ? null : current)),
      },
    )
  }, [prevImage])

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    touchStart.current = null
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        // Mirrors desktop's arrow-key asymmetry: swiping past the LAST
        // image closes the lightbox (goNext already does this itself),
        // while swiping past the FIRST image stays a no-op (goPrev's own
        // isFirst guard) — explicit ask to match the two behaviors.
        if (dx > 0) goPrev()
        else goNext()
      }
    } else if (Math.abs(dy) > SWIPE_THRESHOLD) {
      handleClose()
    }
  }

  // Clicking the dark backdrop closes; clicking the image itself (or an
  // arrow/close button) must NOT bubble up and trigger this too.
  const onBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) handleClose()
  }

  const current = images[index]

  return createPortal(
    <div
      className={styles.overlay}
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={current.alt}
      onClick={onBackdropClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button type="button" className={styles.close} onClick={handleClose} aria-label="Close">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </button>
      {!isFirst && (
        <button type="button" className={`${styles.arrow} ${styles.arrowLeft}`} onClick={goPrev} aria-label="Previous image">
          <ChevronIcon direction="left" />
        </button>
      )}
      {!isLast && (
        <button type="button" className={`${styles.arrow} ${styles.arrowRight}`} onClick={goNext} aria-label="Next image">
          <ChevronIcon direction="right" />
        </button>
      )}
      {/* `.imageWrap` and `.imageSlot` stay pointer-events:none — only the
          <img> itself (sized to its own content via object-fit:contain,
          not stretched to fill the slot) takes clicks. Letterboxed empty
          space around a photo therefore falls through to the backdrop, so
          clicking "outside" the photo still closes the lightbox. */}
      <div className={styles.imageWrap}>
        {prevImage && (
          <div key={prevImage.src} ref={prevSlotRef} className={styles.imageSlot}>
            <img className={styles.image} src={prevImage.src} alt="" aria-hidden="true" />
          </div>
        )}
        <div ref={slotRef} className={styles.imageSlot}>
          <img className={styles.image} src={current.src} alt={current.alt} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
