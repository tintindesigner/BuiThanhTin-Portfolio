import { useRef } from 'react'
import { Link } from 'react-router-dom'
import NextProjectArt from '../../assets/svg/next-project-hover.svg?react'
import Ink3 from '../../assets/svg/ink-3.svg?react'
import { useCursorTilt } from '../../hooks/useCursorTilt'
import { playSquashBounce, resetSquashBounce } from '../../lib/bounce'
import styles from './CaseStudyPage.module.css'

interface NextProjectButtonProps {
  to: string
}

// Reuses SEE MORE's own chip construction (Work.tsx) — same SVG
// technique (`next-project-hover.svg` started as a byte-for-byte copy of
// `see-more-hover.svg`, text re-centered/retexted), same cursor-tilt
// "liquid pull" on the art, same GSAP squash bounce on the outer link,
// same brightness-on-hover. Recolored to match Hero's own palette
// instead of SEE MORE's violet-chip look: stripes → `--stripe-yellow`,
// back chip → `--dark-violet` (front chip was already `--ink-yellow`).
// The copy's own baked-in ink splat (from the original Figma export) was
// deleted from the SVG entirely — it was purple and sat in the same
// corner as this component's own `ink-3.svg` overlay below, so keeping
// both just doubled up two different-colored splats on top of each
// other. `ink-3.svg` is already yellow natively (no recolor needed) —
// positioned bleeding off the button's own top-left corner, matching
// where Figma placed its own ink splat on this chip.
export default function NextProjectButton({ to }: NextProjectButtonProps) {
  const tilt = useCursorTilt()
  const ref = useRef<HTMLAnchorElement | null>(null)
  const inkRef = useRef<HTMLDivElement | null>(null)

  return (
    <div className={styles.nextProjectWrap}>
      <div className={styles.nextProjectInkAnchor}>
        <div ref={inkRef} className={styles.nextProjectInk}>
          <Ink3 aria-hidden="true" />
        </div>
      </div>
      <Link
        ref={ref}
        to={to}
        className={styles.nextProject}
        onMouseMove={tilt.onMouseMove}
        onMouseEnter={() => playSquashBounce(ref.current, null, inkRef.current)}
        onMouseLeave={(e) => {
          tilt.onMouseLeave(e)
          resetSquashBounce(ref.current, null, inkRef.current)
        }}
      >
        <NextProjectArt className={styles.nextProjectArt} />
      </Link>
    </div>
  )
}
