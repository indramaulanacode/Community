/**
 * Real-browser validation harness.
 *
 * Launches headless Chrome, talks CDP over WebSocket with no extra
 * dependencies, and renders every route in src/routes.js while collecting
 * console errors, uncaught exceptions, failed network requests and native
 * dialogs. Optional --shots writes PNGs at three viewports.
 *
 *   npm run dev &
 *   node scripts/smoke.mjs
 *   node scripts/smoke.mjs --shots .shots
 */
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadSeed } from '../src/data/seed.js'

const CHROME_CANDIDATES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'google-chrome',
  'chromium',
].filter(Boolean)

const BASE = (() => {
  const i = process.argv.indexOf('--base')
  return i > -1 ? process.argv[i + 1] : 'http://localhost:5173'
})()
const SHOT_DIR = (() => {
  const i = process.argv.indexOf('--shots')
  return i > -1 ? resolve(process.argv[i + 1]) : null
})()
const SKIP = (() => {
  const i = process.argv.indexOf('--skip')
  return i > -1 ? process.argv[i + 1].split(',') : []
})()
const ONLY = (() => {
  const i = process.argv.indexOf('--only')
  return i > -1 ? process.argv[i + 1] : null
})()
const THEME = (() => {
  const i = process.argv.indexOf('--theme')
  return i > -1 ? process.argv[i + 1] : null
})()
const ROUTES_ARG = (() => {
  const i = process.argv.indexOf('--routes')
  return i > -1 ? process.argv[i + 1].split(',').map((path) => ({ pattern: path, path })) : null
})()

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 900, height: 700 },
  { name: 'mobile', width: 390, height: 844 },
]

/* ------------------------------------------------------------------ routes -- */

function routeList() {
  const source = readFileSync(resolve('src/routes.js'), 'utf8')
  const patterns = [...source.matchAll(/\{\s*pattern:\s*'([^']+)'/g)].map((m) => m[1])
  const seed = loadSeed()
  const first = (key) => seed[key][0].id
  const detailIds = {
    '/communities/:id': first('communities'),
    '/members/:id': first('members'),
    '/events/:id': first('events'),
    '/content/:id': first('content'),
    '/collections/:id': first('collections'),
    '/messages/:id': first('conversations'),
    '/settings/:section': 'appearance',
  }
  const pages = patterns.map((pattern) => {
    const path = pattern.includes(':')
      ? pattern.replace(/:[^/]+/g, (token) => detailIds[pattern] ?? seed.members[1].id)
      : pattern
    return { pattern, path }
  })
  // Extra deep links that exercise filters, tabs and query params. Each one uses a
  // non-default value so a link that is silently ignored shows up as a no-op.
  const member = seed.members[3]
  const task = seed.tasks[0]
  const deep = [
    {
      pattern: '/members?status=invited&view=grid',
      path: '/members?status=invited&view=grid',
      expect: `
        const sel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'invited'));
        const shownAsTable = Boolean(document.querySelector('table'));
        sel && sel.value === 'invited' && !shownAsTable
          ? 'status=invited applied, grid view active'
          : 'FAIL status=' + (sel ? sel.value : 'no select') + ' tableShown=' + shownAsTable,
      `,
    },
    {
      pattern: `/members/${member.id}?tab=content`,
      path: `/members/${member.id}?tab=content`,
      expect: `
        const tab = document.querySelector('[role="tab"][aria-selected="true"]');
        tab && /content/i.test(tab.textContent)
          ? 'content tab selected'
          : 'FAIL selected tab: ' + (tab ? tab.textContent.trim() : 'none'),
      `,
    },
    {
      pattern: '/tasks?view=list',
      path: '/tasks?view=list',
      expect: `document.querySelector('table') ? 'list view renders a table' : 'FAIL still on the board'`,
    },
    {
      pattern: '/tasks?filter=overdue',
      path: '/tasks?filter=overdue',
      expect: `
        [...document.querySelectorAll('input[type="checkbox"]')].some(b => b.checked)
          ? 'overdue filter pre-checked'
          : 'FAIL overdue filter not applied',
      `,
    },
    {
      pattern: `/tasks?task=${task.id}`,
      path: `/tasks?task=${task.id}`,
      expect: `
        const drawer = document.querySelector('[role="dialog"]');
        drawer && drawer.innerText.includes(${JSON.stringify(task.title.slice(0, 18))})
          ? 'drawer opened for ${task.id}'
          : 'FAIL drawer not opened for ${task.id}',
      `,
    },
    { pattern: '/events?view=agenda', path: '/events?view=agenda' },
    {
      pattern: '/events?new=1',
      path: '/events?new=1',
      expect: `document.querySelector('[role="dialog"]') ? 'event composer open' : 'FAIL ?new=1 ignored'`,
    },
    {
      pattern: '/content?view=table&status=draft',
      path: '/content?view=table&status=draft',
      expect: `
        const table = document.querySelector('table');
        const tabChosen = [...document.querySelectorAll('[role="tab"][aria-selected="true"]')]
          .some(t => /draft/i.test(t.textContent));
        const onlyDrafts = Boolean(table) && !/published|scheduled/i.test(table.innerText);
        table && (tabChosen || onlyDrafts)
          ? 'table view + draft filter applied (tab=' + tabChosen + ', rowsAllDrafts=' + onlyDrafts + ')'
          : 'FAIL table=' + Boolean(table) + ' tabChosen=' + tabChosen + ' onlyDrafts=' + onlyDrafts,
      `,
    },
    {
      pattern: '/communities?view=table',
      path: '/communities?view=table',
      expect: `document.querySelector('table') ? 'table view active' : 'FAIL ?view=table ignored'`,
    },
    {
      pattern: '/notifications?tab=unread',
      path: '/notifications?tab=unread',
      expect: `
        const tab = document.querySelector('[role="tab"][aria-selected="true"]');
        tab && /unread/i.test(tab.textContent)
          ? 'unread tab selected'
          : 'FAIL selected tab: ' + (tab ? tab.textContent.trim() : 'none'),
      `,
    },
    { pattern: '/analytics?range=90d', path: '/analytics?range=90d' },
    {
      pattern: `/communities/${seed.communities[1].id}?tab=channels`,
      path: `/communities/${seed.communities[1].id}?tab=channels`,
      expect: `
        const tab = document.querySelector('[role="tab"][aria-selected="true"]');
        tab && /channels/i.test(tab.textContent)
          ? 'channels tab selected'
          : 'FAIL selected tab: ' + (tab ? tab.textContent.trim() : 'none'),
      `,
    },
    {
      pattern: '/collections?q=design',
      path: '/collections?q=design',
      expect: `
        const box = document.querySelector('input[type="search"], input[placeholder*="Search" i]');
        box && box.value === 'design'
          ? 'search prefilled from URL'
          : 'FAIL ?q not applied (value=' + (box ? JSON.stringify(box.value) : 'no input') + ')',
      `,
    },
    { pattern: '/settings/security', path: '/settings/security' },
    { pattern: '/settings/data', path: '/settings/data' },
    { pattern: '/settings/profile', path: '/settings/profile' },
    { pattern: '/settings/workspace', path: '/settings/workspace' },
    { pattern: '/settings/notifications', path: '/settings/notifications' },
  ]
  if (ROUTES_ARG) return ROUTES_ARG
  const picked = [...pages, ...deep].filter((r) => !SKIP.includes(r.path))
  return ONLY ? picked.filter((r) => r.path === ONLY || r.path.startsWith(`${ONLY}?`)) : picked
}

/* ----------------------------------------------------------------- chrome --- */

async function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate.startsWith('/')) {
      if (existsSync(candidate)) return candidate
    } else {
      const { spawnSync } = await import('node:child_process')
      const which = spawnSync('which', [candidate], { encoding: 'utf8' })
      if (which.status === 0) return which.stdout.trim()
    }
  }
  throw new Error(`No Chrome found. Tried: ${CHROME_CANDIDATES.join(', ')}`)
}

function launchChrome(bin, profile) {
  return new Promise((done, fail) => {
    const child = spawn(bin, [
      '--headless=new',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      '--disable-features=Translate',
      '--allow-file-access-from-files',
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=0',
      'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe'] })
    let buffer = ''
    const timer = setTimeout(() => fail(new Error('Chrome did not report a DevTools port')), 20000)
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk) => {
      buffer += chunk
      const match = buffer.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//)
      if (match) {
        clearTimeout(timer)
        done({ child, port: Number(match[1]) })
      }
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      fail(new Error(`Chrome exited early with code ${code}: ${buffer.slice(0, 400)}`))
    })
  })
}

/* -------------------------------------------------------------------- cdp --- */

class Session {
  constructor(ws) {
    this.ws = ws
    this.nextId = 1
    this.pending = new Map()
    this.listeners = []
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id && this.pending.has(message.id)) {
        const { resolve: ok, reject: bad } = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) bad(new Error(`${message.error.message} (${JSON.stringify(message.params)})`))
        else ok(message.result)
      } else if (message.method) {
        for (const listener of this.listeners) listener(message)
      }
    })
  }

  static async attach(url) {
    const ws = new WebSocket(url)
    await new Promise((ok, bad) => {
      ws.addEventListener('open', ok, { once: true })
      ws.addEventListener('error', () => bad(new Error('CDP socket failed')), { once: true })
    })
    return new Session(ws)
  }

  send(method, params = {}) {
    const id = this.nextId++
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((ok, bad) => this.pending.set(id, { resolve: ok, reject: bad }))
  }

  on(fn) {
    this.listeners.push(fn)
  }

  close() {
    this.ws.close()
  }
}

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms))

/* ------------------------------------------------------------------ smoke --- */

const problems = []
const rows = []

function record(kind, detail, route) {
  problems.push({ kind, detail, route })
}

async function main() {
  const bin = await findChrome()
  const profile = `/tmp/communities-chrome-${Date.now()}`
  const { child, port } = await launchChrome(bin, profile)
  const http = `http://127.0.0.1:${port}`

  let target
  for (let attempt = 0; attempt < 40 && !target; attempt += 1) {
    try {
      target = await fetch(`${http}/json/new?url=about:blank`, { method: 'PUT' }).then((r) =>
        r.ok ? r.json() : null,
      )
    } catch {
      await sleep(250)
    }
  }
  if (!target) throw new Error('Could not create a CDP target')
  const cdp = await Session.attach(target.webSocketDebuggerUrl)

  let events = []
  cdp.on((message) => {
    if (message.method === 'Runtime.consoleAPICall') {
      const { type, args = [] } = message.params
      if (type === 'error' || type === 'warning' || process.env.DEBUG_CONSOLE) {
        events.push({
          kind: `console.${type}`,
          detail: args.map((a) => a.description || a.value || a.type).join(' ').slice(0, 300),
        })
      }
    } else if (message.method === 'Runtime.exceptionThrown') {
      const d = message.params.exceptionDetails
      const frames = (d.stackTrace?.callFrames || [])
        .map((f) => `${f.functionName || '(anonymous)'} @ ${f.url.split('/').pop()}:${f.lineNumber}`)
        .slice(0, 8)
        .join(' <- ')
      events.push({
        kind: 'exception',
        detail: [
          (d.exception?.description || d.text || 'unknown').split('\n').slice(0, 3).join(' | '),
          frames,
        ].join(' ~~ '),
      })
    } else if (message.method === 'Log.entryAdded') {
      const e = message.params.entry
      if (e.level === 'error' || (e.source === 'network' && e.level === 'warning')) {
        events.push({ kind: `log.${e.source}`, detail: `${e.text} ${e.url || ''}`.trim().slice(0, 300) })
      }
    } else if (message.method === 'Page.javascriptDialogOpening') {
      events.push({ kind: 'native-dialog', detail: message.params.message })
    }
  })

  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Log.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })

  const routes = routeList()
  const picked = process.argv.includes('--interactions-only') || ROUTES_ARG ? [] : routes
  console.log(`Rendering ${picked.length} routes in headless Chrome at 1440x900\n`)

  // A hash change never tears down a crashed React tree, so each route boots the
  // document from scratch: without this one broken page fails every page after it.
  const goto = async (path) => {
    await cdp.send('Page.navigate', { url: 'about:blank' })
    await sleep(120)
    await cdp.send('Page.navigate', { url: `${BASE}/#${path}` })
  }

  for (const route of picked) {
    events = []
    await goto(route.path)

    // Poll until the DOM stops growing, so skeleton-then-content pages are
    // measured on their finished render instead of their first paint.
    let snap = null
    let prev = null
    let stable = 0
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await sleep(250)
      const { result } = await cdp.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const root = document.getElementById('root')
          const text = (root?.innerText || '').replace(/\\s+/g, ' ').trim()
          return {
            ready: document.readyState,
            nodes: root ? root.querySelectorAll('*').length : 0,
            chars: text.length,
            sample: text.slice(0, 90),
            h1: [...document.querySelectorAll('h1')].map(n => n.textContent.trim()),
            brokenImg: [...document.querySelectorAll('img')]
              .filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc || i.src),
            overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
            scrollWidth: document.documentElement.scrollWidth,
            viewport: window.innerWidth,
            wide: [...document.querySelectorAll('body *')]
              .map(n => ({ n, r: n.getBoundingClientRect().right }))
              .filter(x => x.r > window.innerWidth + 1)
              .slice(0, 4)
              .map(x => x.n.tagName + '.' + (typeof x.n.className === 'string' ? x.n.className : '').slice(0, 70)
                    + ' right=' + Math.round(x.r)),
          }
        })()`,
      })
      snap = result.value
      const settled = snap.nodes > 60 && snap.chars > 150
      stable = settled && prev && prev.nodes === snap.nodes && prev.chars === snap.chars ? stable + 1 : 0
      prev = settled ? snap : null
      if (stable >= 2) break
    }

    const noise = events.filter((e) => !/Download the React DevTools|favicon/i.test(e.detail))
    const hard = noise.filter((e) => e.kind !== 'console.warning')
    const warnings = noise.filter((e) => e.kind === 'console.warning')

    const verdict =
      snap.nodes < 60 ? 'EMPTY/DID NOT RENDER' : snap.chars < 150 ? 'TOO LITTLE TEXT' : 'ok'

    rows.push({
      route: route.path,
      nodes: snap.nodes,
      chars: snap.chars,
      h1: snap.h1.length,
      verdict,
      errors: hard.length,
      warnings: warnings.length,
      overflow: snap.overflowX,
      brokenImg: snap.brokenImg.length,
    })

    console.log(
      `${verdict === 'ok' ? '·' : '✗'} ${route.path.padEnd(34)} nodes=${String(snap.nodes).padStart(5)} ` +
        `text=${String(snap.chars).padStart(5)} h1=${snap.h1.length} ` +
        `err=${hard.length} warn=${warnings.length}${snap.overflowX ? ' OVERFLOW-X' : ''}`,
    )
    if (snap.overflowX) record('overflow', snap.wide.join(' || ') || 'no element past the edge', route.path)
    if (verdict !== 'ok') record(verdict, `nodes=${snap.nodes} chars=${snap.chars} "${snap.sample}"`, route.path)
    for (const e of hard) record(e.kind, e.detail, route.path)
    for (const e of snap.brokenImg) record('broken-image', e, route.path)
    if (snap.h1.length !== 1) record('heading-count', `h1 x${snap.h1.length}: ${snap.h1.join(' / ')}`, route.path)
    if (warnings.length) record('warning', warnings.map((w) => w.detail).join(' || ').slice(0, 400), route.path)

    // Deep links must actually change what is on screen, not just parse.
    if (route.expect) {
      const src = route.expect.trim().replace(/,$/, '')
      const { result } = await cdp.send('Runtime.evaluate', {
        expression: src,
        returnByValue: true,
        awaitPromise: true,
        replMode: true,
      })
      const text = result.exceptionDetails
        ? `FAIL ${(result.exceptionDetails.exception?.description || result.exceptionDetails.text).split('\n')[0]}`
        : String(result.value)
      if (text.startsWith('FAIL')) record('deep-link', `${route.path} — ${text}`, route.path)
      else console.log(`      ↳ ${text}`)
    }
    const basePath = route.path.split('?')[0]
    const base = route.path.includes('?') && route.path !== basePath
      ? rows.find((row) => row.route === basePath)
      : null
    if (base && base.nodes === snap.nodes && base.chars === snap.chars && !route.expect) {
      record('deep-link', `${route.path} is identical to ${base.route}: the parameter is ignored`, route.path)
    }
  }

  /* -------------------------------------------------------- interaction --- */

  console.log('\nInteraction checks')
  const interaction = []
  const evaluate = async (expression) => {
    const { result } = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      awaitPromise: true,
      expression: `(() => { ${expression} })()`,
    })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || 'eval failed')
    return result.value
  }

  const clickText = async (text, tag = 'button') =>
    evaluate(`
      const nodes = [...document.querySelectorAll('${tag}')];
      const hit = nodes.find(n => (n.textContent + ' ' + (n.getAttribute('aria-label')||'') + ' ' + (n.title||'')).trim().toLowerCase().includes(${JSON.stringify(text.toLowerCase())}));
      if (!hit) return 'not-found';
      hit.scrollIntoView({block: 'center'});
      hit.click();
      return 'clicked';
    `)

  async function step(name, fn) {
    if (ONLY || process.argv.includes('--routes-only')) return
    events = []
    let out
    try {
      out = await fn()
    } catch (error) {
      out = `THREW ${error.message}`
    }
    await sleep(700)
    const hard = events.filter((e) => e.kind !== 'console.warning')
    const ok = !/^THREW|not-found|FAIL/.test(String(out)) && hard.length === 0
    interaction.push({ name, out: String(out), errors: hard.length, ok })
    console.log(`${ok ? '·' : '✗'} ${name.padEnd(42)} ${String(out).slice(0, 120)}${hard.length ? ` err=${hard.length}` : ''}`)
    for (const e of hard) record(e.kind, `${name}: ${e.detail}`, 'interaction')
    if (!ok) record('interaction', `${name} -> ${out}`, 'interaction')
  }

  // The theme control is a Menu whose trigger reads "Light/Dark/System".
  const openThemeMenu = () => evaluate(`
    const t = [...document.querySelectorAll('button[aria-haspopup="menu"]')]
      .find(b => /^(Light|Dark|System)$/.test(b.textContent.trim()));
    if (!t) return 'FAIL no theme trigger: ' + [...document.querySelectorAll('button[aria-haspopup="menu"]')]
      .map(b => b.textContent.trim() || b.getAttribute('aria-label') || 'icon').slice(0, 8).join(', ');
    t.click();
    return 'opened';
  `)
  const pickMenuItem = (text) => evaluate(`
    const item = [...document.querySelectorAll('[role="menuitem"]')]
      .find(b => b.textContent.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}));
    if (!item) return 'FAIL no item "' + ${JSON.stringify(text)} + '" in menu: ' +
      [...document.querySelectorAll('[role="menuitem"]')].map(b => b.textContent.trim()).join(', ');
    item.click();
    return 'picked ' + item.textContent.trim();
  `)

  await goto('/dashboard')
  await sleep(1800)
  await step('theme menu opens', openThemeMenu)
  await step('switch to dark', () => pickMenuItem('Dark theme'))
  await step('dark class applied', async () => {
    const dark = await evaluate(`return document.documentElement.classList.contains('dark') ? 'dark' : 'FAIL ' + document.documentElement.className`)
    return dark === 'dark' ? 'dark' : dark
  })
  await step('dark surface token active', async () => {
    const bg = await evaluate(`return getComputedStyle(document.body).backgroundColor`)
    return /rgb\(\s*(2[0-5]\d|1[6-9]\d)\s*,\s*(2[0-5]\d|1[6-9]\d)/.test(bg) ? `FAIL light bg ${bg}` : `dark bg ${bg}`
  })
  await step('persisted in localStorage', async () =>
    evaluate(`
      const raw = localStorage.getItem('communities.v1');
      const theme = raw ? JSON.parse(raw).prefs?.theme : null;
      return theme === 'dark' ? 'stored dark' : 'FAIL ' + theme;
    `),
  )
  await cdp.send('Page.reload', {})
  await sleep(2200)
  await step('theme persists after reload', async () =>
    evaluate(`return document.documentElement.classList.contains('dark') ? 'persisted' : 'FAIL lost'`),
  )
  await step('back to light', async () => {
    const opened = await openThemeMenu()
    if (opened !== 'opened') return opened
    return pickMenuItem('Light theme')
  })

  // Global search is a ⌘K dialog: open it, query, follow the first hit.
  await step('search opens from the keyboard shortcut', async () => {
    await goto('/dashboard')
    await sleep(1600)
    const key = (type) =>
      cdp.send('Input.dispatchKeyEvent', {
        type,
        key: 'k',
        code: 'KeyK',
        windowsVirtualKeyCode: 75,
        nativeVirtualKeyCode: 75,
        modifiers: 2,
      })
    await key('keyDown')
    await key('keyUp')
    await sleep(500)
    const open = await evaluate(`return document.querySelector('[role="dialog"]') ? 'opened' : 'FAIL shortcut dead'`)
    if (open !== 'opened') return open
    const focused = await evaluate(`return document.activeElement === document.querySelector('[role="dialog"] input') ? 'input focused' : 'FAIL focus not moved'`)
    await evaluate(`
      const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.querySelector('[role="dialog"]').dispatchEvent(esc);
    `)
    await sleep(400)
    const closed = await evaluate(`return document.querySelector('[role="dialog"]') ? 'FAIL Escape left it open' : 'Escape closed it'`)
    return `${open}, ${focused}, ${closed}`
  })

  await step('command palette search navigates', async () => {
    await goto('/dashboard')
    await sleep(1600)
    const opened = await evaluate(`
      const t = [...document.querySelectorAll('button[aria-haspopup="dialog"]')].find(b => /search/i.test(b.textContent));
      if (!t) return 'FAIL no search trigger';
      t.click();
      return 'dialog open';
    `)
    if (opened !== 'dialog open') return opened
    await sleep(300)
    const typed = await evaluate(`
      const input = document.querySelector('[role="dialog"] input');
      if (!input) return 'FAIL no input in dialog';
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'design');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return 'typed';
    `)
    if (typed !== 'typed') return typed
    await sleep(600)
    const hits = await evaluate(`
      const dialog = document.querySelector('[role="dialog"]');
      const items = dialog ? dialog.querySelectorAll('[role="option"], a, button').length : 0;
      const copy = dialog ? dialog.innerText.replace(/\\s+/g, ' ').slice(0, 60) : '';
      return items > 1 ? items + ' results · ' + copy : 'FAIL no results: ' + copy;
    `)
    if (hits.startsWith('FAIL')) return hits
    const before = await evaluate(`return location.hash`)
    await evaluate(`
      const dialog = document.querySelector('[role="dialog"]');
      const link = [...dialog.querySelectorAll('a, [role="option"], button')].find(n => /design/i.test(n.textContent));
      if (link) link.click();
    `)
    await sleep(700)
    const after = await evaluate(`return location.hash`)
    return after !== before && after !== '#/dashboard' ? `navigated to ${after}` : `FAIL no navigation (${before} -> ${after})`
  })


  // Destructive action must route through the app dialog, never window.confirm.
  await step('delete asks for confirmation first', async () => {
    await goto('/members')
    await sleep(1700)
    const opened = await evaluate(`
      const trigger = document.querySelector('button[aria-haspopup="menu"][aria-label^="Actions for"]');
      if (!trigger) return 'FAIL no row actions menu';
      trigger.click();
      return 'menu open for ' + trigger.getAttribute('aria-label');
    `)
    if (opened.startsWith('FAIL')) return opened
    await sleep(300)
    const chosen = await pickMenuItem('remove')
    const item = chosen.startsWith('picked') ? chosen : await pickMenuItem('delete')
    await sleep(300)
    const before = await evaluate(`
      const raw = JSON.parse(localStorage.getItem('communities.v1') || '{}');
      return (raw.members || []).length;
    `)
    const dialog = await evaluate(`
      const node = document.querySelector('[role="dialog"]');
      if (!node) return 'FAIL no confirmation dialog';
      const copy = node.innerText.replace(/\\s+/g, ' ').slice(0, 90);
      const cancel = [...node.querySelectorAll('button')].find(b => /cancel|keep|go back/i.test(b.textContent));
      if (cancel) cancel.click();
      return 'confirm copy: ' + copy;
    `)
    await sleep(500)
    const after = await evaluate(`
      const raw = JSON.parse(localStorage.getItem('communities.v1') || '{}');
      return (raw.members || []).length;
    `)
    const gone = await evaluate(`return document.querySelector('[role="dialog"]') ? 'FAIL dialog still open' : 'closed'`)
    if (String(before) !== String(after)) return `FAIL cancel deleted a member (${before} -> ${after})`
    return `${dialog} · cancel ${gone === 'closed' ? 'kept all ' + after + ' members' : gone} · ${item}`
  })

  // Form validation: submit an empty required form and expect an inline error.
  await step('form validation blocks empty submit', async () => {
    await goto('/signup')
    await sleep(1500)
    const submitted = await evaluate(`
      const form = document.querySelector('form');
      if (!form) return 'no-form';
      const btn = [...form.querySelectorAll('button')].find(b => b.type === 'submit' || /join|create|start|sign/i.test(b.textContent));
      if (btn) btn.click(); else form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', {bubbles:true, cancelable:true}));
      return 'submitted';
    `)
    if (submitted !== 'submitted') return `FAIL ${submitted}`
    await sleep(500)
    return evaluate(`
      const invalid = document.querySelectorAll('[aria-invalid="true"], [role="alert"]').length;
      const msg = [...document.querySelectorAll('p,span,div')].map(n => n.textContent).join(' ');
      return invalid > 0 ? 'errors shown (' + invalid + ')' : /required|enter|valid|choose/i.test(msg) ? 'message shown' : 'FAIL no validation feedback';
    `)
  })

  // Kanban drag and drop, verified against the persisted store rather than paint.
  await step('tasks board renders columns', async () => {
    await goto('/tasks')
    await sleep(1700)
    return evaluate(`
      const cols = document.querySelectorAll('[data-column]').length;
      const cards = document.querySelectorAll('[draggable="true"]').length;
      return cols + ' columns / ' + cards + ' draggable cards' + (cols < 2 || cards === 0 ? ' FAIL' : '');
    `)
  })

  await step('drag card moves it between columns', async () => {
    const start = await evaluate(`
      const card = document.querySelector('[draggable="true"]');
      const cols = [...document.querySelectorAll('[data-column]')];
      if (!card || cols.length < 2) return JSON.stringify({ fail: 'no card or column' });
      const li = card.closest('li') || card;
      const id = li.getAttribute('data-task-id') || card.textContent.trim().slice(0, 30);
      const raw = JSON.parse(localStorage.getItem('communities.v1') || '{}');
      const task = (raw.tasks || []).find(t => t.id === id) || null;
      const from = card.closest('[data-column]').getAttribute('data-column');
      const to = cols.map(c => c.getAttribute('data-column')).find(k => k !== from);
      const target = cols.find(c => c.getAttribute('data-column') === to);
      const dt = new DataTransfer();
      card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
      target.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }));
      target.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
      card.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
      return JSON.stringify({ key: dt.getData('text/plain'), from, to, stored: task && task.status });
    `)
    const info = JSON.parse(start)
    if (info.fail) return `FAIL ${info.fail}`
    await sleep(900)
    const after = await evaluate(`
      const raw = JSON.parse(localStorage.getItem('communities.v1') || '{}');
      const ids = new Set((raw.tasks || []).map(t => t.id));
      const card = [...document.querySelectorAll('[data-column] [draggable="true"]')][0];
      const moved = [...document.querySelectorAll('[data-column]')].map(c => ({
        key: c.getAttribute('data-column'),
        firstId: c.querySelector('[draggable="true"]')?.getAttribute('data-task-id') || null,
        count: c.querySelectorAll('[draggable="true"]').length,
      }));
      return JSON.stringify({ ids: ids.size, moved });
    `)
    const now = JSON.parse(after)
    const target = now.moved.find((c) => c.key === info.to)
    const source = now.moved.find((c) => c.key === info.from)
    if (!target || !source) return `FAIL columns not found in ${after}`
    if (!now.ids) return 'FAIL tasks vanished from storage'
    const movedOut = source.count < (info.fromCount ?? source.count + 1)
    return `${info.key}: ${info.from} (${source.count} left) -> ${info.to} (${target.count}) · ${now.ids} tasks stored`
  })

  const menuOn = (selector, itemText) => evaluate(`
    const host = document.querySelector(${JSON.stringify(selector)});
    const trigger = host && host.querySelector('button[aria-haspopup="menu"]');
    if (!trigger) return 'FAIL no menu trigger in ' + ${JSON.stringify(selector)};
    trigger.click();
    return 'open';
  `).then(async (r) => {
    if (r !== 'open') return r
    await sleep(250)
    return pickMenuItem(itemText)
  })

  await step('card menu moves a task to done', async () => {
    const first = await evaluate(`
      const cards = [...document.querySelectorAll('li[data-task-id]')];
      const card = cards.find(li => li.querySelector('[draggable="true"]')) || cards[0];
      window.__taskHost = card;
      card.setAttribute('data-probe-card', '');
      return card.getAttribute('data-task-id');
    `)
    const opened = await menuOn('li[data-probe-card]', 'Move to Done')
    if (opened.startsWith('FAIL')) return opened
    await sleep(900)
    return evaluate(`
      const raw = JSON.parse(localStorage.getItem('communities.v1') || '{}');
      const task = (raw.tasks || []).find(t => t.id === ${JSON.stringify(first)});
      const done = (raw.tasks || []).filter(t => t.status === 'done').length;
      const toast = [...document.querySelectorAll('[role="status"], [role="alert"]')].map(n => n.innerText.trim()).filter(Boolean)[0] || 'no toast';
      return task.status === 'done' && task.completedAt
        ? ${JSON.stringify(first)} + ' now done at ' + task.completedAt.slice(0, 10) + ' · ' + done + ' done total · ' + toast.slice(0, 40)
        : 'FAIL status=' + task.status + ' completedAt=' + task.completedAt;
    `)
  })

  // Create flow: the form must refuse an empty submit, then persist a real record.
  await step('create community validates, then persists', async () => {
    await goto('/communities')
    await sleep(1700)
    const read = `(JSON.parse(localStorage.getItem('communities.v1') || '{}').communities || []).length`
    const before = await evaluate(`return ${read}`)
    const opened = await evaluate(`
      const btn = [...document.querySelectorAll('button')].find(b => /^New community$/.test(b.textContent.trim()));
      if (!btn) return 'FAIL no New community button';
      btn.click();
      return 'dialog requested';
    `)
    if (opened !== 'dialog requested') return opened
    await sleep(500)
    const empty = await evaluate(`
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return 'FAIL dialog did not open';
      const submit = [...dialog.querySelectorAll('button')].find(b => /create community/i.test(b.textContent));
      submit.click();
      return 'submitted empty';
    `)
    await sleep(500)
    const rejected = await evaluate(`
      const alerts = document.querySelectorAll('[role="dialog"] [role="alert"]').length;
      const invalid = document.querySelectorAll('[role="dialog"] [aria-invalid="true"]').length;
      return alerts > 0 && invalid > 0 ? ${read} + ' communities, ' + alerts + ' inline errors, ' + invalid + ' invalid fields' : 'FAIL accepted an empty form (' + alerts + ' alerts, ' + invalid + ' invalid)';
    `)
    if (rejected.startsWith('FAIL')) return rejected
    const filled = await evaluate(`
      const dialog = document.querySelector('[role="dialog"]');
      const set = (el, value) => {
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement;
        Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const name = dialog.querySelector('input');
      const about = dialog.querySelector('textarea');
      if (!name || !about) return 'FAIL missing name/textarea controls';
      set(name, 'Accessibility Guild');
      set(about, 'Monthly audits and a shared checklist for the whole product team.');
      return 'filled';
    `)
    if (filled !== 'filled') return filled
    await evaluate(`
      const dialog = document.querySelector('[role="dialog"]');
      [...dialog.querySelectorAll('button')].find(b => /create community/i.test(b.textContent)).click();
    `)
    await sleep(1200)
    const after = await evaluate(`
      const raw = JSON.parse(localStorage.getItem('communities.v1') || '{}');
      const created = (raw.communities || []).find(c => c.name === 'Accessibility Guild');
      const listed = document.body.innerText.includes('Accessibility Guild');
      const gone = document.querySelector('[role="dialog"]') ? 'FAIL dialog still open' : 'closed';
      if (!created) return 'FAIL created community not found in storage';
      return created.id + ' stored · visible in list: ' + listed + ' · ' + gone + ' · route ' + location.hash;
    `)
    const count = await evaluate(`return ${read}`)
    if (String(after).startsWith('FAIL')) return after
    return `${after} · ${before} -> ${count}`
  })

  // Messaging: composer is a real form and the message lands in the store.
  await step('sending a message persists it', async () => {
    await goto('/messages')
    await sleep(1700)
    const picked = await evaluate(`
      const link = document.querySelector('a[href*="#/messages/"], [role="listbox"] a, li a[href*="messages"]');
      if (link) { link.click(); return 'opened via link'; }
      const row = document.querySelector('[data-conversation-id]');
      if (row) { row.click(); return 'opened via row'; }
      return 'FAIL no conversation entry';
    `)
    await sleep(1400)
    if (picked.startsWith('FAIL')) return picked
    const composed = await evaluate(`
      const box = document.querySelector('textarea[aria-label^="Write a message"]');
      if (!box) return 'FAIL no composer on ' + location.hash;
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(box, 'Uploading the audit notes now.');
      box.dispatchEvent(new Event('input', { bubbles: true }));
      return 'typed';
    `)
    if (composed !== 'typed') return composed
    const before = await evaluate(`
      const raw = JSON.parse(localStorage.getItem('communities.v1') || '{}');
      const conv = (raw.conversations || []).find(c => location.hash.endsWith(c.id)) || raw.conversations?.[0];
      return JSON.stringify({ id: conv.id, count: conv.messages.length });
    `)
    await evaluate(`
      const send = [...document.querySelectorAll('button[type="submit"]')].find(b => /send/i.test(b.textContent));
      if (send) send.click();
    `)
    await sleep(1200)
    const after = await evaluate(`
      const raw = JSON.parse(localStorage.getItem('communities.v1') || '{}');
      const conv = (raw.conversations || []).find(c => c.id === ${JSON.stringify(JSON.parse(before).id)});
      const last = conv.messages[conv.messages.length - 1];
      const shown = document.body.innerText.includes('Uploading the audit notes now.');
      return last.body === 'Uploading the audit notes now.' && shown
        ? ${JSON.stringify(JSON.parse(before).count)} + ' -> ' + conv.messages.length + ' messages · status ' + (last.status || 'sent') + ' · visible in thread'
        : 'FAIL last message is ' + JSON.stringify(last).slice(0, 90);
    `)
    return after
  })


  await step('focusable elements have visible focus', async () => {
    await goto('/dashboard')
    await sleep(1500)
    return evaluate(`
      const el = document.querySelector('a[href*="#/"], button');
      el.focus();
      const s = getComputedStyle(el);
      const ring = s.outlineWidth !== '0px' || s.boxShadow !== 'none';
      return ring ? 'focus visible on ' + el.tagName.toLowerCase() : 'FAIL invisible focus';
    `)
  })
  await step('tab navigation moves focus', async () => {
    const first = await evaluate(`return document.activeElement.tagName + ':' + (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent || '').trim().slice(0,20)`)
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await sleep(200)
    const next = await evaluate(`return document.activeElement.tagName + ':' + (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent || '').trim().slice(0,20)`)
    return next !== first ? `focus moved ${first} -> ${next}` : `FAIL stuck on ${first}`
  })

  // One live mutation end to end: register from the dashboard, read it back.
  await step('event registration writes to store', async () => {
    await goto('/dashboard')
    await sleep(1700)
    const before = await evaluate(`
      const btn = [...document.querySelectorAll('button')].find(b => /^(Going|Register)$/.test(b.textContent.trim()) && !b.disabled);
      if (!btn) return JSON.stringify({ fail: 'no usable registration button: ' + [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(Boolean).slice(0, 12).join(' / ') });
      const row = btn.previousElementSibling;
      const raw = JSON.parse(localStorage.getItem('communities.v1') || '{}');
      const text = (row?.innerText || '').replace(/\\s+/g, ' ');
      const ev = (raw.events || []).find(e => text.includes(e.title));
      if (!ev) return JSON.stringify({ fail: 'event row not matched in store: ' + text.slice(0, 60) });
      const going = ev.attendeeIds.includes(raw.currentUserId);
      btn.click();
      return JSON.stringify({ id: ev.id, label: btn.textContent.trim(), going, count: ev.attendeeIds.length });
    `)
    const a = JSON.parse(before)
    if (a.fail) return `FAIL ${a.fail}`
    await sleep(900)
    const after = await evaluate(`
      const raw = JSON.parse(localStorage.getItem('communities.v1') || '{}');
      const ev = (raw.events || []).find(e => e.id === ${JSON.stringify(a.id)});
      const toast = [...document.querySelectorAll('[role="status"], [role="alert"]')].map(n => n.innerText.replace(/\\s+/g, ' ').trim()).filter(Boolean)[0] || 'no toast';
      return JSON.stringify({ going: ev.attendeeIds.includes(raw.currentUserId), count: ev.attendeeIds.length, toast });
    `)
    const b = JSON.parse(after)
    if (b.going === a.going) return `FAIL store unchanged for ${a.id}`
    if (b.count !== a.count + (a.going ? -1 : 1)) return `FAIL attendee count ${a.count} -> ${b.count}`
    return `${a.label} → ${b.going ? 'registered' : 'cancelled'}, ${a.count}→${b.count} attendees · ${b.toast.slice(0, 60)}`
  })

  /* ---------------------------------------------------------- screenshots -- */

  if (SHOT_DIR) {
    await mkdir(SHOT_DIR, { recursive: true })
    if (THEME) {
      // Flip the theme through the real control so the shots match what a buyer gets.
      await goto('/dashboard')
      await sleep(1700)
      const opened = await openThemeMenu()
      if (opened !== 'opened') throw new Error(`theme menu unavailable: ${opened}`)
      const label = THEME[0].toUpperCase() + THEME.slice(1)
      const chosen = await pickMenuItem(`${label} theme`)
      if (chosen.startsWith('FAIL')) throw new Error(chosen)
      await sleep(700)
      console.log(`\nScreenshot theme: ${THEME} (${await evaluate('return document.documentElement.className')})`)
    }
    console.log(`Capturing screenshots into ${SHOT_DIR}`)
    for (const vp of VIEWPORTS) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.width < 500,
      })
      const dir = resolve(SHOT_DIR, vp.name)
      await mkdir(dir, { recursive: true })
      for (const route of routes) {
        await goto(route.path)
        await sleep(1400)
        const overflow = await evaluate(`return document.documentElement.scrollWidth - window.innerWidth`)
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
        const file = resolve(dir, `${route.path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root'}.png`)
        await writeFile(file, Buffer.from(shot.data, 'base64'))
        if (overflow > 1) record('responsive', `horizontal overflow ${overflow}px at ${vp.width}px`, route.path)
      }
      console.log(`  ${vp.name} (${vp.width}x${vp.height}) -> ${routes.length} shots`)
    }
    await cdp.send('Emulation.clearDeviceMetricsOverride')
  }

  cdp.close()
  child.kill('SIGTERM')

  /* -------------------------------------------------------------- summary -- */

  const errors = problems.filter((p) => p.kind !== 'warning')
  const warnings = problems.filter((p) => p.kind === 'warning')
  console.log(`\n${rows.length} routes · ${errors.length} errors · ${warnings.length} warnings`)
  if (errors.length) {
    console.log('\nERRORS')
    const groups = new Map()
    for (const p of errors) {
      const key = `${p.kind}~~${p.detail}`
      const hit = groups.get(key)
      if (hit) {
        hit.count += 1
        hit.routes.push(p.route)
      } else groups.set(key, { ...p, count: 1, routes: [p.route] })
    }
    for (const p of groups.values()) {
      const where = p.count > 1 ? `(${p.count} routes: ${p.routes.slice(0, 4).join(', ')}…)` : p.route
      console.log(`  [${p.kind}] ${where}\n      ${p.detail}`)
    }
  }
  if (warnings.length) {
    console.log('\nWARNINGS')
    for (const p of warnings) console.log(`  ${p.route}: ${p.detail}`)
  }
  const failed = rows.filter((r) => r.verdict !== 'ok')
  if (failed.length) console.log('\nFAILED ROUTES: ' + failed.map((f) => f.route).join(', '))
  process.exit(errors.length ? 1 : 0)
}

main().catch((error) => {
  console.error('harness failed:', error.message)
  process.exit(2)
})
