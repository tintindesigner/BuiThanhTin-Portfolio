import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'
import RotateArrows from '../assets/svg/loading-rotate-arrows.svg?react'
import RotatePhoneGlyph from '../assets/svg/loading-rotate-phone-icon.svg?react'
import ProgressEdge from '../assets/svg/loading-progress-edge.svg?react'
import riderPhoto from '../assets/images/about-tintin-rider.webp'
import { useMediaQuery } from '../hooks/useMediaQuery'
import StripedBackground from './StripedBackground'
import styles from './LoadingScreen.module.css'

// Even once everything is actually ready, hold the screen open at least
// this long — mobile gets a much longer floor since there's a hint to
// read; desktop's is just enough to stop a fast/cached load from reading
// as a single-frame flash instead of a real screen.
const MOBILE_MIN_DURATION_MS = 3000
const DESKTOP_MIN_DURATION_MS = 1000
// Safety net if the model somehow never reports ready (e.g. a fetch
// failure) — the site should still become usable rather than stay stuck
// behind the overlay forever.
const MAX_WAIT_MS = 15000

interface LoadingScreenProps {
  /** True once Hero's box model has loaded and its entrance is about to play. */
  heroReady: boolean
  /** Called once, after the fade-out finishes, to unmount this. */
  onDone: () => void
}

export default function LoadingScreen({ heroReady, onDone }: LoadingScreenProps) {
  const { progress } = useProgress()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [fontsReady, setFontsReady] = useState(false)
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const arrowsRef = useRef<SVGSVGElement>(null)
  const phoneRef = useRef<SVGSVGElement>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true))
  }, [])

  // One-shot hint animation (not a loop): the arrows rotate first, THEN —
  // after a short beat, not simultaneously — the phone glyph turns to
  // match, as if the arrows are what's causing it. Both rotate the SAME
  // direction (left/counter-clockwise, matching the arrows' own left-
  // turning curl) and simply HOLD at that landscape end position — no
  // spring back to upright, per explicit ask. Two separate SVGs layered
  // in the same spot (not one combined icon) specifically so each can be
  // animated independently like this.
  useLayoutEffect(() => {
    if (!arrowsRef.current || !phoneRef.current) return
    const tl = gsap.timeline()
    tl.to(arrowsRef.current, { rotate: -25, duration: 0.4, ease: 'power2.out' })
      .to(phoneRef.current, { rotate: -90, duration: 1.1, ease: 'back.out(1.4)' }, '+=0.2')
    return () => {
      tl.kill()
    }
  }, [])

  useEffect(() => {
    const minDuration = isMobile ? MOBILE_MIN_DURATION_MS : DESKTOP_MIN_DURATION_MS
    const t = window.setTimeout(() => setMinTimeElapsed(true), minDuration)
    const maxT = window.setTimeout(() => setTimedOut(true), MAX_WAIT_MS)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(maxT)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ready = timedOut || (heroReady && fontsReady && minTimeElapsed)

  useEffect(() => {
    if (!ready || doneRef.current || !overlayRef.current) return
    doneRef.current = true
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.5, ease: 'power2.out', onComplete: onDone })
  }, [ready, onDone])

  const barProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className={styles.overlay} ref={overlayRef} role="status" aria-live="polite" aria-label="Loading">
      <StripedBackground
        bg="var(--ink-purple)"
        stripe="var(--dark-violet)"
        angle={20}
        stripeWidth={60}
        gap={60}
        speed={20}
        style={{ position: 'absolute', inset: 0 }}
      />
      <div className={styles.content}>
        <div className={styles.rotateHint}>
          <p className={styles.rotateLine}>Rotate your phone</p>
          <div className={styles.rotateIconStack} aria-hidden="true">
            <RotateArrows ref={arrowsRef} className={styles.rotateIcon} />
            <RotatePhoneGlyph ref={phoneRef} className={styles.rotateIcon} />
          </div>
          <p className={styles.rotateLine}>For better experience</p>
        </div>

        <div className={styles.progressTrack}>
          <div className={styles.progressMask}>
            <div className={styles.progressFill} style={{ width: `${barProgress}%` }} />
            <ProgressEdge className={styles.progressEdge} style={{ left: `${barProgress}%` }} aria-hidden="true" />
          </div>
          <img src={riderPhoto} className={styles.rider} style={{ left: `${barProgress}%` }} alt="" aria-hidden="true" />
        </div>

        <p className={styles.loadingText}>LOADING....</p>
      </div>
    </div>
  )
}
