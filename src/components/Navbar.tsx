import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Logo from '../assets/svg/logo.svg?react'
import MenuHover from '../assets/svg/menu-hover.svg?react'
import StripedBackground from './StripedBackground'
import { HOVER_CHIP_CLIP_PATH } from './hoverChipGeometry'
import { useCursorTilt } from '../hooks/useCursorTilt'
import { useMediaQuery } from '../hooks/useMediaQuery'
import styles from './Navbar.module.css'

const LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'contact', label: 'Contact' },
]

// Simple outline glyph, not one of the illustrated Splatoon-style badge
// icons elsewhere in the project (advertising-icon.svg etc.) — those are
// drawn/detailed for ~60-150px display; at the tab bar's compact size a
// glyph this plain reads far more cleanly. `currentColor` so it inherits
// `.linkLabel`'s color (incl. its hover/active transitions) for free.
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M3.5 11 12 4l8.5 7M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5M10 20v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface NavbarProps {
  activeId?: string
}

export default function Navbar({ activeId = 'home' }: NavbarProps) {
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
  const isMobile = useMediaQuery('(max-width: 767px)')

  // Mobile bottom tab bar: hidden until the user scrolls UP, and only
  // ever eligible to show once they've scrolled to (or past) About — the
  // top of `/` is Hero's own full-bleed scene with its own big "CLICK TO
  // UNBOX" call-to-action, which a persistent bottom bar would clutter.
  // Pages with no `#about` at all (case-study pages) have no such
  // exclusion zone, so they're eligible from the start — only the scroll-
  // direction condition applies there.
  const [barVisible, setBarVisible] = useState(false)
  const lastScrollYRef = useRef(0)

  useEffect(() => {
    if (!isMobile) return
    lastScrollYRef.current = window.scrollY
    let ticking = false
    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const last = lastScrollYRef.current
        const aboutEl = document.getElementById('about')
        const eligible = !aboutEl || y >= aboutEl.getBoundingClientRect().top + y
        if (!eligible) {
          setBarVisible(false)
        } else if (y < last - 4) {
          setBarVisible(true)
        } else if (y > last + 4) {
          setBarVisible(false)
        }
        lastScrollYRef.current = y
        ticking = false
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMobile])

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
  const renderLink = (id: string, label: string, iconOnly = false) => (
    <div className={styles.linkItem} data-active={activeId === id} key={id}>
      <a
        href={onHomePage ? `#${id}` : '/'}
        className={styles.linkButton}
        aria-label={iconOnly && id === 'home' ? label : undefined}
        onClick={(e) => {
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
        <span className={styles.linkLabel}>{iconOnly && id === 'home' ? <HomeIcon /> : label}</span>
        <span className={styles.underline} aria-hidden="true" />
      </a>
    </div>
  )

  return (
    <>
      <nav className={styles.nav} aria-label="Site">
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

          {!isMobile && (
            <div className={styles.links}>
              {LINKS.map((l) => renderLink(l.id, l.label))}
            </div>
          )}
        </div>
      </nav>

      {isMobile && (
        <nav className={styles.mobileTabBar} data-visible={barVisible} aria-label="Mobile navigation">
          {LINKS.map((l) => renderLink(l.id, l.label, true))}
        </nav>
      )}
    </>
  )
}
