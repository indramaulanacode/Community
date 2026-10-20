
/**
 * Application state for the demo mode.
 *
 * Everything lives in a reducer over the seed data and is mirrored to
 * `localStorage`, so create/edit/delete survive a refresh without a backend.
 * Swapping in a real API means replacing the reducer cases with requests and
 * keeping the same action names — see README.md, "Replacing the demo store".
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import { loadSeed } from '../data/seed.js'
import { clearState, loadState, saveState } from '../lib/storage.js'
import { uid } from '../lib/utils.js'

const ENTITIES = [
  'members',
  'communities',
  'events',
  'tasks',
  'content',
  'collections',
  'conversations',
  'reports',
  'notifications',
  'activity',
]

/** A stored demo older than this is re-seeded so the dates still look alive. */
const SEED_TTL_DAYS = 14

const AppContext = createContext(null)

function isStale(state) {
  if (!state?.seededAt) return true
  const age = Date.now() - new Date(state.seededAt).getTime()
  return age > SEED_TTL_DAYS * 86_400_000
}

function initialState() {
  const seed = loadSeed()
  const stored = loadState()
  // The in-payload version gates the schema, not just the age: a snapshot
  // written by an older seed (no reports, different quiet windows) must be
  // replaced, or every new selector reads `undefined` off the stored state.
  if (stored && !isStale(stored) && stored.version === seed.version) {
    // Prefs may have gained keys in code since the snapshot was written.
    return { ...stored, prefs: { ...seed.prefs, ...stored.prefs } }
  }
  return seed
}

function reducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return action.state

    case 'reset':
      return { ...loadSeed(), prefs: { ...loadSeed().prefs, ...state.prefs } }

    /* ------------------------------------------------------------- entities -- */
    case 'entity/add': {
      const { entity, record } = action
      return { ...state, [entity]: [record, ...state[entity]] }
    }

    case 'entity/update': {
      const { entity, id, patch } = action
      return {
        ...state,
        [entity]: state[entity].map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      }
    }

    case 'entity/updateMany': {
      const { entity, ids, patch } = action
      const set = new Set(ids)
      return {
        ...state,
        [entity]: state[entity].map((item) =>
          set.has(item.id) ? { ...item, ...patch } : item,
        ),
      }
    }

    case 'entity/remove': {
      const { entity, id } = action
      return { ...state, [entity]: state[entity].filter((item) => item.id !== id) }
    }

    /* ------------------------------------------------------- membership glue -- */
    case 'member/join': {
      const { memberId, communityId } = action
      return {
        ...state,
        members: state.members.map((m) =>
          m.id === memberId && !m.communityIds.includes(communityId)
            ? { ...m, communityIds: [...m.communityIds, communityId] }
            : m,
        ),
        communities: state.communities.map((c) =>
          c.id === communityId && !c.memberIds.includes(memberId)
            ? { ...c, memberIds: [...c.memberIds, memberId] }
            : c,
        ),
      }
    }

    case 'member/leave': {
      const { memberId, communityId } = action
      return {
        ...state,
        members: state.members.map((m) =>
          m.id === memberId
            ? { ...m, communityIds: m.communityIds.filter((x) => x !== communityId) }
            : m,
        ),
        communities: state.communities.map((c) =>
          c.id === communityId
            ? { ...c, memberIds: c.memberIds.filter((x) => x !== memberId) }
            : c,
        ),
      }
    }

    /* ------------------------------------------------------------ messages -- */
    case 'message/send': {
      const { conversationId, message } = action
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, message], unread: 0, lastActivityAt: message.at }
            : c,
        ),
      }
    }

    case 'conversation/read':
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId ? { ...c, unread: 0 } : c,
        ),
      }

    /* -------------------------------------------------------- notifications -- */
    case 'notification/read':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, read: true } : n,
        ),
      }

    case 'notification/readAll':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) }

    case 'notification/clearRead':
      return {
        ...state,
        notifications: state.notifications.filter((n) => !n.read),
      }

    /* --------------------------------------------------------------- prefs -- */
    case 'pref/set':
      return { ...state, prefs: { ...state.prefs, [action.key]: action.value } }

    case 'pref/setNotify':
      return {
        ...state,
        prefs: {
          ...state.prefs,
          notify: { ...state.prefs.notify, [action.key]: action.value },
        },
      }

    case 'workspace/update':
      return { ...state, workspace: { ...state.workspace, ...action.patch } }

    /* -------------------------------------------------------------- toasts -- */
    case 'toast/push':
      return { ...state, toasts: [...(state.toasts || []), action.toast].slice(-4) }

    case 'toast/dismiss':
      return {
        ...state,
        toasts: (state.toasts || []).filter((t) => t.id !== action.id),
      }

    /* --------------------------------------------------------- load states -- */
    case 'status/set':
      return { ...state, status: action.status, error: action.error ?? null }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => ({
    ...initialState(),
    toasts: [],
    status: 'loading',
  }))

  /* Hydrate after mount: reading and re-serialising the snapshot is I/O, and
     the first paint legitimately shows the loading state. */
  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    dispatch({ type: 'status/set', status: 'ready' })
  }, [])

  useEffect(() => {
    if (state.status !== 'ready') return
    const { toasts, status, error, ...persistable } = state
    saveState(persistable)
  }, [state])

  /* Theme is applied to <html> and kept in sync with the OS preference. */
  const themePref = state.prefs.theme
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = themePref === 'dark' || (themePref === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    if (themePref !== 'system') return undefined
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [themePref])

  const toastTimers = useRef(new Map())
  useEffect(() => {
    const timers = toastTimers.current
    return () => {
      timers.forEach(clearTimeout)
      timers.clear()
    }
  }, [])

  const notify = useCallback((message, tone = 'success') => {
    const toast = { id: uid('toast'), message, tone }
    dispatch({ type: 'toast/push', toast })
    toastTimers.current.set(
      toast.id,
      setTimeout(() => {
        dispatch({ type: 'toast/dismiss', id: toast.id })
        toastTimers.current.delete(toast.id)
      }, 4200),
    )
    return toast.id
  }, [])

  const dismissToast = useCallback((id) => {
    const timer = toastTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      toastTimers.current.delete(id)
    }
    dispatch({ type: 'toast/dismiss', id })
  }, [])

  const setPref = useCallback((key, value) => dispatch({ type: 'pref/set', key, value }), [])

  const actions = useMemo(
    () => ({
      add: (entity, record) => {
        if (!ENTITIES.includes(entity)) throw new Error(`Unknown entity: ${entity}`)
        dispatch({ type: 'entity/add', entity, record })
        return record
      },
      update: (entity, id, patch) => dispatch({ type: 'entity/update', entity, id, patch }),
      updateMany: (entity, ids, patch) =>
        dispatch({ type: 'entity/updateMany', entity, ids, patch }),
      remove: (entity, id) => dispatch({ type: 'entity/remove', entity, id }),
      memberJoin: (memberId, communityId) =>
        dispatch({ type: 'member/join', memberId, communityId }),
      memberLeave: (memberId, communityId) =>
        dispatch({ type: 'member/leave', memberId, communityId }),
      sendMessage: (conversationId, body) => {
        const message = {
          id: uid('msg'),
          authorId: state.currentUserId,
          body,
          at: new Date().toISOString(),
          reactions: 0,
        }
        dispatch({ type: 'message/send', conversationId, message })
      },
      readConversation: (conversationId) =>
        dispatch({ type: 'conversation/read', conversationId }),
      readNotification: (id) => dispatch({ type: 'notification/read', id }),
      readAllNotifications: () => dispatch({ type: 'notification/readAll' }),
      clearReadNotifications: () => dispatch({ type: 'notification/clearRead' }),
      setPref,
      setNotifyPref: (key, value) => dispatch({ type: 'pref/setNotify', key, value }),
      updateWorkspace: (patch) => dispatch({ type: 'workspace/update', patch }),
      resetDemo: () => {
        clearState()
        dispatch({ type: 'reset' })
      },
      reload: async () => {
        dispatch({ type: 'status/set', status: 'loading' })
        await new Promise((resolve) => setTimeout(resolve, 550))
        dispatch({ type: 'hydrate', state: { ...initialState(), toasts: [], status: 'ready' } })
      },
      fail: (message) => dispatch({ type: 'status/set', status: 'error', error: message }),
      clearError: () => dispatch({ type: 'status/set', status: 'ready' }),
      notify,
      dismissToast,
    }),
    [notify, dismissToast, setPref, state.currentUserId],
  )

  const value = useMemo(
    () => ({ state, actions, currentMember: state.members.find((m) => m.id === state.currentUserId) }),
    [state, actions],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

/** Convenience hook for the most commonly read slices. */
export function useData() {
  const { state } = useApp()
  return state
}
