import { useRef } from 'react'
import type { MouseEvent } from 'react'

/**
 * Cursor-follow "liquid pull" — sets `--tilt-x`/`--tilt-y` (both -1..1,
 * relative to the element's own center) on whatever element the returned
 * handlers are attached to. Consumed by CSS as e.g.
 * `translate: calc(var(--tilt-x) * 10px) ...`. Deferred to the next
 * animation frame since React nulls out a synthetic event's
 * `currentTarget` once the handler returns, so the element has to be
 * captured into a plain variable now, not read off the event again later.
 */
export function useCursorTilt() {
  const rafRef = useRef<number>(0)

  const onMouseMove = (e: MouseEvent<HTMLElement>) => {
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const relX = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)
    const relY = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      target.style.setProperty('--tilt-x', relX.toFixed(3))
      target.style.setProperty('--tilt-y', relY.toFixed(3))
    })
  }

  const onMouseLeave = (e: MouseEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty('--tilt-x', '0')
    e.currentTarget.style.setProperty('--tilt-y', '0')
  }

  return { onMouseMove, onMouseLeave }
}
