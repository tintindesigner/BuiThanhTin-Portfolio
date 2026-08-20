import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'
import ProgressEdge from '../assets/svg/loading-progress-edge.svg?react'
import riderPhoto from '../assets/images/about-tintin-rider.webp'
import StripedBackground from './StripedBackground'
import styles from './LoadingScreen.module.css'

// Even once everything is actually ready, hold the screen open at least
// this long — just enough to stop a fast/cached load from reading as a
// single-frame flash instead of a real screen. Same value on every
// viewport (mobile used to get a longer floor to give time to read the
// now-removed rotate-phone hint — no longer needed).
const MIN_DURATION_MS = 1000
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
  const [fontsReady, setFontsReady] = useState(false)
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true))
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => setMinTimeElapsed(true), MIN_DURATION_MS)
    const maxT = window.setTimeout(() => setTimedOut(true), MAX_WAIT_MS)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(maxT)
    }
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
