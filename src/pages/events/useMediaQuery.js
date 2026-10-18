/**
 * Live media-query read.
 *
 * The month and week grids need seven usable columns; below the widths used in
 * `EventsPage` they would collapse into unreadable slivers, so those views fall
 * back to the agenda rather than overflowing horizontally.
 */
import { useEffect, useState } from 'react'

const supports = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => (supports() ? window.matchMedia(query).matches : false))

  useEffect(() => {
    if (!supports()) return undefined
    const media = window.matchMedia(query)
    const sync = () => setMatches(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [query])

  return matches
}
