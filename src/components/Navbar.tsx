import { useState } from 'react'
import type { MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Logo from '../assets/svg/logo.svg?react'
import MenuHover from '../assets/svg/menu-hover.svg?react'
import StripedBackground from './StripedBackground'
import { HOVER_CHIP_CLIP_PATH } from './hoverChipGeometry'
import { useCursorTilt } from '../hooks/useCursorTilt'
import styles from './Navbar.module.css'

const LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'contact', label: 'Contact' },
]

interface NavbarProps {
  activeId?: string
}

export default function Navbar({ activeId = 'home' }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const onHomePage = location.pathname === '/'
  // Cursor-follow "liquid pull" — the hover chip leans/stretches toward
  // wherever the mouse actually is inside the link, instead of just
  // popping in centered. Written as CSS custom properties consumed by
  // .hoverChip's `translate`/`rotate` (standalone CSS properties, not the
  // `transform` shorthand) so this transitions on its own fast timing,
  // independent of the slower elastic `scale` pop-in on the same element.
  const { onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave } = useCursorTilt()

  // `mobile` links are only ever visually reachable while the panel is
  // open (CSS hides it otherwise via max-height/opacity, not display:none),
  // so tabIndex has to be toggled in step with `menuOpen` here — the CSS
  // hiding alone doesn't stop them being Tab-focused while off-screen.
  // Native `href="#home"` anchor scrolling doesn't reliably reach actual
  // document top:0 — `.hero` is `position:sticky` (see Hero.tsx), so for
  // ANY scrollY between 0 and the sticky-release point, its own
  // getBoundingClientRect().top already reads 0 (pinned). The browser's
  // smooth-scroll-to-anchor stops as soon as that "target reached" check
  // first passes while scrolling upward, which happens right at the
  // release boundary — confirmed live, landed at scrollY≈717 instead of
  // 0. Intercepting Home/logo clicks with an explicit scrollTo(0)
  // sidesteps the sticky element entirely.
  const goHome = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // From a case-study sub-page, a same-document scrollTo can't reach a
  // section that only exists on `/` — client-side navigate there first,
  // carrying WHICH section to land on via router state, then Home's own
  // mount effect (App.tsx) does the actual scroll once the section
  // exists in the DOM. A plain `href="/#id"` was tried first and landed
  // on the Hero instead — the sticky Hero already causes native
  // anchor-scroll trouble for `#home` itself (see goHome above), and
  // that same layout quirk turned out to throw off anchor-scroll to
  // the OTHER sections too on a fresh page load, not just `#home`.
  const renderLink = (id: string, label: string, mobile = false) => (
    <div className={styles.linkItem} data-active={activeId === id} key={id}>
      <a
        href={onHomePage ? `#${id}` : '/'}
        className={styles.linkButton}
        tabIndex={mobile && !menuOpen ? -1 : undefined}
        onClick={(e) => {
          setMenuOpen(false)
          if (onHomePage) {
            if (id === 'home') goHome(e)
            return
          }
          e.preventDefault()
          navigate('/', id === 'home' ? undefined : { state: { scrollTo: id } })
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <span className={styles.hoverChip} aria-hidden="true">
          <MenuHover className={styles.hoverChipArt} />
          <div className={styles.hoverChipStripesWrap}>
            <div className={styles.hoverChipStripesInner}>
              <StripedBackground
                bg="var(--ink-pink)"
                stripe="var(--nav-hover-stripe)"
                angle={-15}
                stripeWidth={12}
                gap={10}
                speed={2}
                style={{ position: 'absolute', inset: 0, clipPath: HOVER_CHIP_CLIP_PATH }}
              />
            </div>
          </div>
        </span>
        <span className={styles.linkLabel}>{label}</span>
        <span className={styles.underline} aria-hidden="true" />
      </a>
    </div>
  )

  return (
    <nav className={styles.nav}>
      <div className={styles.navTopRow}>
        <a
          href="/"
          className={styles.logoLink}
          aria-label="Tin Tin — home"
          onClick={(e) => {
            if (onHomePage) {
              goHome(e)
            } else {
              e.preventDefault()
              navigate('/')
            }
          }}
        >
          <Logo className={styles.logo} />
        </a>

        <div className={styles.links}>
          {LINKS.map((l) => renderLink(l.id, l.label))}
        </div>

        <button
          type="button"
          className={styles.hamburger}
          data-open={menuOpen}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Grows the SAME bar downward when open (max-height transition on
          this element; .nav has no fixed height of its own, so it just
          follows) rather than showing a separate panel below the bar. */}
      <div className={styles.mobileLinks} data-open={menuOpen}>
        {LINKS.map((l) => renderLink(l.id, l.label, true))}
      </div>
    </nav>
  )
}
