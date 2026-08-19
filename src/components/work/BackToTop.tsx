import { useRef } from 'react'
import HomeIcon from '../../assets/svg/home-page.svg?react'
import { playSquashBounce, resetSquashBounce } from '../../lib/bounce'
import styles from './BackToTop.module.css'

// Scrolls the CURRENT page to its own top — not a navigation link back to
// "/". Pinned to the right edge of the Job card (see `.bottomRow`/
// `.backToTop` in CSS) near the bottom of the page, not floating fixed in
// a viewport corner.
export default function BackToTop() {
  const ref = useRef<HTMLButtonElement | null>(null)

  return (
    <button
      type="button"
      ref={ref}
      className={styles.backToTop}
      onMouseEnter={() => playSquashBounce(ref.current)}
      onMouseLeave={() => resetSquashBounce(ref.current)}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
    >
      <HomeIcon className={styles.backToTopIcon} />
    </button>
  )
}
