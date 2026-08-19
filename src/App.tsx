import { useEffect, useRef, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/hero/Hero'
import type { HeroHandle } from './components/hero/Hero'
import About from './components/about/About'
import type { AboutHandle } from './components/about/About'
import Work from './components/work/Work'
import Contact from './components/contact/Contact'
import CaseStudyPage from './components/work/CaseStudyPage'
import LoadingScreen from './components/LoadingScreen'

// Shown once per browser session (tab), not on every visit to `/` — e.g.
// clicking Home from a case-study page shouldn't re-block on a screen the
// box model has already finished loading for.
const LOADING_SHOWN_KEY = 'tt-loading-shown'

// sessionStorage access can throw (Safari private mode with strict cookie
// blocking, some enterprise policies/privacy extensions) — guarded so a
// blocked read can't crash Home's very first render, and a blocked write
// can't skip `setShowLoading(false)` right after it (which would leave the
// already-invisible loading overlay permanently blocking clicks).
function readLoadingShown() {
  try {
    return sessionStorage.getItem(LOADING_SHOWN_KEY) === '1'
  } catch {
    return false
  }
}
function markLoadingShown() {
  try {
    sessionStorage.setItem(LOADING_SHOWN_KEY, '1')
  } catch {
    // Storage unavailable — worst case the loading screen shows again on
    // the next visit this session, which is harmless.
  }
}
// After the loading screen's own fade-out finishes, wait this long before
// starting the box's bounce-in — playing it any earlier (e.g. the instant
// the model itself is ready) means it plays out WHILE still hidden behind
// that overlay, so by the time the overlay is gone the box has already
// landed and the bounce is never actually seen.
const POST_LOADING_ENTRANCE_DELAY_MS = 250

function Home() {
  const aboutRef = useRef<AboutHandle>(null)
  const heroRef = useRef<HeroHandle>(null)
  const location = useLocation()

  const [showLoading, setShowLoading] = useState(() => !readLoadingShown())
  const [heroReady, setHeroReady] = useState(false)
  // No loading screen this mount (a revisit within the same session) —
  // nothing is covering Hero, so the box entrance can auto-play the
  // instant the model itself is ready, same as before the loading screen
  // existed at all.
  const handleModelReady = () => {
    setHeroReady(true)
    if (!showLoading) heroRef.current?.playEntrance()
  }
  const handleLoadingDone = () => {
    markLoadingShown()
    setShowLoading(false)
    window.setTimeout(() => heroRef.current?.playEntrance(), POST_LOADING_ENTRANCE_DELAY_MS)
  }

  // Arriving here from a case-study sub-page (Navbar's Work/About/
  // Contact links) carries which section to land on via router state,
  // since a plain `href="/#id"` lands on the Hero instead — see the
  // long comment in Navbar.tsx. Scrolled manually (not a native anchor
  // jump) once this section's own layout has settled.
  const state = location.state as { scrollTo?: string } | null
  const targetId = state?.scrollTo
  // Landing on a section past Hero via that programmatic scroll must not
  // let Hero's own scroll-triggered liquid transition fire partway
  // through — it would snap the scroll back to About's top instead of
  // the real target (see the `skipIntro` doc in Hero.tsx).
  const skipHeroIntro = Boolean(targetId && targetId !== 'home')

  useEffect(() => {
    if (!targetId) return
    const t = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 300)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll-spy: Navbar's active-page underline follows whichever section
  // currently sits in a thin band near the viewport's vertical center
  // (rootMargin carves that band out of the observer's root), rather than
  // a fixed "scrolled past the top" check — reads correctly regardless of
  // how tall each section is. Falls back to 'home' until the first
  // observation fires.
  const [activeId, setActiveId] = useState('home')
  useEffect(() => {
    const ids = ['home', 'about', 'work', 'contact']
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return
        const best = visible.reduce((a, b) => (a.intersectionRatio > b.intersectionRatio ? a : b))
        setActiveId(best.target.id)
      },
      // Contact (the last section) can never scroll all the way to a
      // dead-center band — the page runs out of scrollable height first
      // (a known, deliberate limit, not a bug: see project memory on
      // Contact's own anchor landing short of its top for the same
      // reason), capping out around 60% down the viewport at max scroll.
      // A generous band (15%-85%) still resolves the right section via
      // intersectionRatio when multiple qualify, while being wide enough
      // for Contact to actually reach it.
      { rootMargin: '-15% 0px -15% 0px', threshold: 0 },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <main>
      <Navbar activeId={activeId} />
      <Hero
        ref={heroRef}
        onCoverComplete={() => aboutRef.current?.playFigureEntrance()}
        skipIntro={skipHeroIntro}
        onModelReady={handleModelReady}
        autoPlayEntrance={!showLoading}
      />
      <About ref={aboutRef} />
      <Work />
      <Contact />
      {showLoading && <LoadingScreen heroReady={heroReady} onDone={handleLoadingDone} />}
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/work/:slug" element={<CaseStudyPage />} />
    </Routes>
  )
}

export default App
