/**
 * Hash routing, so the template deploys as a static bundle with no server
 * rewrite rules. Links are real anchors, which means cmd-click, middle-click
 * and the back button all behave normally.
 */
import { useEffect, useMemo, useState } from 'react'

const DEFAULT_ROUTE = '/dashboard'

function readHash() {
  const raw = window.location.hash.replace(/^#/, '')
  return raw || DEFAULT_ROUTE
}

export function useRoutePath() {
  const [path, setPath] = useState(readHash)

  useEffect(() => {
    const onChange = () => setPath(readHash())
    window.addEventListener('hashchange', onChange)
    // Deep link on first load: fill in the hash so a refresh keeps the route.
    if (!window.location.hash) window.location.replace(`#${DEFAULT_ROUTE}`)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  useEffect(() => {
    document.getElementById('root')?.scrollTo?.({ top: 0 })
    window.scrollTo({ top: 0 })
  }, [path])

  return path
}

export function navigate(to, { replace = false } = {}) {
  const target = to.startsWith('#') ? to.slice(1) : to
  if (readHash() === target) return
  if (replace) {
    window.location.replace(`#${target}`)
  } else {
    window.location.hash = target
  }
}

/** Anchor that speaks the router's language. */
export function Link({ to, children, className = '', ...rest }) {
  return (
    <a href={`#${to}`} className={className} {...rest}>
      {children}
    </a>
  )
}

/**
 * Match a path pattern like `/communities/:id`.
 * Returns null when it does not match, otherwise the static segments.
 */
export function matchRoute(pattern, path) {
  const a = pattern.split('/').filter(Boolean)
  const b = path.split('/').filter(Boolean)
  if (a.length !== b.length) return null

  const params = {}
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].startsWith(':')) {
      params[a[i].slice(1)] = decodeURIComponent(b[i])
    } else if (a[i] !== b[i]) {
      return null
    }
  }
  return params
}

/**
 * Resolve the active path against a route table.
 * Query strings are kept out of matching and exposed as `query`.
 * `routes` is an ordered list of `{ pattern, key, title, data? }`.
 */
export function useRoute(routes) {
  const path = useRoutePath()

  return useMemo(() => {
    const [pathname, search = ''] = path.split('?')
    const segments = pathname.split('/').filter(Boolean)
    const section = segments[0] || 'dashboard'

    for (const route of routes) {
      const params = matchRoute(route.pattern, pathname)
      if (params) {
        return {
          ...route,
          params,
          path,
          pathname,
          query: new URLSearchParams(search),
          section,
          segments,
        }
      }
    }
    return {
      pattern: null,
      key: 'not-found',
      title: 'Not found',
      params: {},
      path,
      pathname,
      query: new URLSearchParams(search),
      section,
      segments,
    }
  }, [path, routes])
}
