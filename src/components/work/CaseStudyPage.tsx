import { useEffect, useLayoutEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import Navbar from '../Navbar'
import StripedBackground from '../StripedBackground'
import Ink1 from '../../assets/svg/ink-1.svg?react'
import Ink2 from '../../assets/svg/ink-2.svg?react'
import Ink3 from '../../assets/svg/ink-3.svg?react'
import Ink4 from '../../assets/svg/ink-4.svg?react'
import Ink5 from '../../assets/svg/ink-5.svg?react'
import Ink6 from '../../assets/svg/ink-6.svg?react'
import Lightbox from './Lightbox'
import NextProjectButton from './NextProjectButton'
import BackToTop from './BackToTop'
import { CASE_STUDIES, isImageGroup } from './caseStudies'
import type { CaseStudyCell, CaseStudyImage, CaseStudySection, InkPlacement } from './caseStudies'
import styles from './CaseStudyPage.module.css'

const INK_COMPONENTS = { 1: Ink1, 2: Ink2, 3: Ink3, 4: Ink4, 5: Ink5, 6: Ink6 }

function InkDecoration({ ink }: { ink: InkPlacement }) {
  const InkArt = INK_COMPONENTS[ink.ink]
  return (
    <InkArt
      className={styles.ink}
      aria-hidden="true"
      style={{
        left: ink.left !== undefined ? `${ink.left}%` : undefined,
        right: ink.right !== undefined ? `${ink.right}%` : undefined,
        top: ink.top !== undefined ? `${ink.top}%` : undefined,
        bottom: ink.bottom !== undefined ? `${ink.bottom}%` : undefined,
        width: `${ink.widthPct}%`,
        transform: [ink.rotateDeg ? `rotate(${ink.rotateDeg}deg)` : '', ink.flipX ? 'scaleX(-1)' : ''].filter(Boolean).join(' ') || undefined,
      }}
    />
  )
}

function flattenCell(cell: CaseStudyCell): CaseStudyImage[] {
  return isImageGroup(cell) ? cell.images : [cell]
}

function ImageButton({ image, style, onOpen }: { image: CaseStudyImage; style?: CSSProperties; onOpen: () => void }) {
  const className = image.noStroke ? `${styles.imageFrame} ${styles.noStroke}` : styles.imageFrame
  return (
    <button type="button" className={className} style={{ aspectRatio: image.aspect ?? '4 / 3', ...style }} onClick={onOpen}>
      <img src={image.src} alt={image.alt} loading="lazy" />
    </button>
  )
}

// One section's image rows, plus the lightbox that opens scoped to THIS
// section's own images (not every image on the page) — a running counter
// (not `indexOf`) tracks each image's flat position, since the same
// photo can legitimately appear twice in one section (e.g. Cela's
// Sampling Booth), and since a row cell can itself be a mini-grid of
// several images (see `isImageGroup`) rather than always one image.
function SectionBlock({ section }: { section: CaseStudySection }) {
  const flatImages = section.rows.flatMap((row) => row.flatMap(flattenCell))
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  let position = -1

  return (
    <div className={styles.section}>
      {section.columnLabels ? (
        <div className={styles.columnLabels} style={{ gridTemplateColumns: `repeat(${section.columnLabels.length}, 1fr)` }}>
          {section.columnLabels.map((label, i) => (
            <h2 className={styles.sectionTitle} key={i}>
              {label}
            </h2>
          ))}
        </div>
      ) : (
        section.label && <h2 className={styles.sectionTitle}>{section.label}</h2>
      )}
      {section.rows.map((row, rowIndex) => (
        <div className={styles.row} key={rowIndex}>
          {row.map((cell, cellIndex) => {
            if (isImageGroup(cell)) {
              return (
                <div className={styles.miniGrid} key={cellIndex} style={{ flex: cell.weight ?? 1, gridTemplateColumns: `repeat(${cell.columns}, 1fr)` }}>
                  {cell.images.map((image, imageIndex) => {
                    position += 1
                    const thisIndex = position
                    return <ImageButton image={image} key={imageIndex} onOpen={() => setLightboxIndex(thisIndex)} />
                  })}
                </div>
              )
            }
            position += 1
            const thisIndex = position
            return <ImageButton image={cell} key={cellIndex} style={{ flex: cell.weight ?? 1 }} onOpen={() => setLightboxIndex(thisIndex)} />
          })}
        </div>
      ))}
      {lightboxIndex !== null && <Lightbox images={flatImages} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}
    </div>
  )
}

export default function CaseStudyPage() {
  const { slug } = useParams()
  const study = slug ? CASE_STUDIES[slug] : undefined
  const [heroLightboxOpen, setHeroLightboxOpen] = useState(false)

  // Resets scroll on every navigation between case-study pages (incl.
  // via NEXT PROJECT) — react-router doesn't do this on its own since
  // it's a client-side route change, not a real page load. `useLayoutEffect`,
  // not `useEffect` — this route never remounts `CaseStudyPage` between
  // slugs, so a plain `useEffect` would let the browser paint the new
  // project's content at the OLD scrollY for one frame before jumping to
  // (0,0), a visible flash (same bug class already fixed this way
  // elsewhere in the project — see LoadingScreen/Lightbox).
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  // Every case-study page otherwise shares the site's one <title> from
  // index.html — browser tabs (and GA4's "Pages and screens" report,
  // which groups by title) can't tell them apart. Restores whatever the
  // title was before on cleanup, which covers both leaving back to `/`
  // and NEXT PROJECT (component stays mounted, `slug` just changes —
  // this re-runs and overwrites, no flash back to the old title first).
  useEffect(() => {
    if (!study) return
    const prevTitle = document.title
    document.title = `${study.titleLines[0]} — Tin Tin`
    return () => {
      document.title = prevTitle
    }
  }, [study])

  if (!study) return <Navigate to="/" replace />

  return (
    <div className={styles.page}>
      <Navbar activeId="work" />
      <StripedBackground
        bg="var(--ink-purple)"
        stripe="var(--stripe-purple)"
        angle={20}
        stripeWidth={60}
        gap={60}
        style={{ position: 'absolute', inset: 0, zIndex: -1 }}
      />
      {/* Ink whose Figma position bleeds past the Job card's own left/right
          edge (`relativeTo: 'page'`, the default/majority case) renders
          straight into `.page` — pinned to the actual screen edge at any
          viewport width, same as every other section's corner-bleeding
          ink. Only ink Figma placed WITHIN the card's own span
          (`relativeTo: 'card'`) goes inside `.inkFrame`, which mirrors
          `.project`'s 1216px-capped/centered box so THAT ink scales with
          the card instead — see project memory for why this split
          exists (a card-only frame made every edge-bleeding ink drift on
          resize instead of staying pinned to the screen). */}
      {study.inks
        .filter((ink) => (ink.relativeTo ?? 'card') === 'page')
        .map((ink, i) => (
          <InkDecoration ink={ink} key={`page-${i}`} />
        ))}
      <div className={styles.inkFrame}>
        {study.inks
          .filter((ink) => (ink.relativeTo ?? 'card') === 'card')
          .map((ink, i) => (
            <InkDecoration ink={ink} key={`card-${i}`} />
          ))}
      </div>

      <main className={styles.project}>
        <article className={styles.job}>
          <h1 className={styles.title}>
            {study.titleLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>

          <button type="button" className={styles.hero} onClick={() => setHeroLightboxOpen(true)}>
            <img src={study.heroImage} alt={study.heroAlt} />
          </button>
          {heroLightboxOpen && (
            <Lightbox images={[{ src: study.heroImage, alt: study.heroAlt }]} startIndex={0} onClose={() => setHeroLightboxOpen(false)} />
          )}

          {study.description && <p className={styles.description}>{study.description}</p>}

          {study.sections.map((section, i) => (
            // Keyed by slug too, not just the section's own label/index —
            // otherwise two DIFFERENT case studies whose sections happen to
            // share a label (or both go unlabeled) at the same array
            // position get treated as the SAME SectionBlock across a
            // `/work/:slug` param change (this route never remounts
            // CaseStudyPage), leaving stale state (e.g. an open Lightbox's
            // `index`) pointed at the wrong study's shorter image list.
            <SectionBlock section={section} key={`${slug}-${section.label ?? i}`} />
          ))}
        </article>

        <div className={styles.bottomRow}>
          <NextProjectButton to={`/work/${study.next}`} />
          <BackToTop />
        </div>
      </main>
    </div>
  )
}
