/**
 * Assemble the buyer package for the UI8 upload from an explicit allowlist.
 *
 *   node scripts/package.mjs                 -> ./ui8-upload
 *   node scripts/package.mjs --out <dir>     -> somewhere else
 *   node scripts/package.mjs --zip           -> also write <out>.zip
 *   node scripts/package.mjs --no-previews   -> skip previews/ (the listing images go
 *                                               up separately; 25 MB need not be twice)
 *
 * Nothing here is clever about what to include: a file is shipped because it is
 * named below. Development-only paths (promt.md, .qoder, .shots*, dist,
 * node_modules, .git) can never leak in, and the verification pass at the end
 * fails the build if they do.
 */
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const MARKER = '.communities-package'

/** Shipped verbatim. */
const FILES = [
  'index.html',
  'package.json',
  'package-lock.json',
  'vite.config.js',
  'README.md',
  '.gitignore',
]

/** Shipped whole, except anything matching SKIP inside them. */
const DIRS = ['src', 'previews']

/** Shipped when the repository has one, skipped when it does not. */
const OPTIONAL = ['LICENSE', 'CHANGELOG.md', '.editorconfig', 'public']

/** Shipped selectively — the buyer-facing docs and the two test harnesses. */
const PICKED = {
  docs: ['usage-guide.md', 'ui-kit.md'],
  scripts: ['verify.mjs', 'smoke.mjs', 'package.mjs'],
}

/** Never shipped, wherever they appear. */
const SKIP = /(^|[/])(node_modules|dist|\.shots|\.shots-dark|\.git|\.qoder|promt\.md|\.DS_Store)$|\.log$/
const EXPECTED_AT_ROOT = new Set([...FILES, ...OPTIONAL, ...DIRS, ...Object.keys(PICKED)])

const args = process.argv.slice(2)
const outIndex = args.indexOf('--out')
const OUT = resolve(ROOT, outIndex > -1 ? args[outIndex + 1] : 'ui8-upload')

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} kB`
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

function walk(dir, base = dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (SKIP.test(relative(base, path))) continue
    if (entry.isDirectory()) walk(path, base, acc)
    else acc.push(path)
  }
  return acc
}

/** Everything under a directory, exclusions included — used to catch leaks. */
function walkEverything(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walkEverything(path, acc)
    else acc.push(path)
  }
  return acc
}

/* ------------------------------------------------------------- clean output -- */

if (existsSync(OUT)) {
  // Only ever wipe a directory this script created, never someone's checkout.
  if (!existsSync(join(OUT, MARKER))) {
    console.error(`REFUSING to overwrite ${OUT} — no ${MARKER} marker there.\nPass --out <empty dir> to build somewhere else.`)
    process.exit(1)
  }
  rmSync(OUT, { recursive: true, force: true })
}

const copied = []
let bytes = 0

function ship(source) {
  const rel = relative(ROOT, source)
  if (SKIP.test(rel)) return
  const target = join(OUT, rel)
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(source, target)
  bytes += statSync(source).size
  copied.push(rel)
}

for (const file of FILES) {
  const path = join(ROOT, file)
  if (!existsSync(path)) {
    console.error(`MISSING required file: ${file}`)
    process.exit(1)
  }
  ship(path)
}
const dirs = args.includes('--no-previews') ? DIRS.filter((dir) => dir !== 'previews') : DIRS
for (const dir of dirs) for (const file of walk(join(ROOT, dir))) ship(file)
for (const name of OPTIONAL) {
  const path = join(ROOT, name)
  if (!existsSync(path)) continue
  if (statSync(path).isDirectory()) for (const file of walk(path)) ship(file)
  else ship(path)
}
for (const [dir, names] of Object.entries(PICKED)) {
  for (const name of names) {
    const path = join(ROOT, dir, name)
    if (!existsSync(path)) {
      console.error(`MISSING ${dir}/${name}`)
      process.exit(1)
    }
    ship(path)
  }
}

/* ------------------------------------------------------------------ verify -- */

const problems = []

// Anything that slipped in that no allowlist entry explains.
for (const entry of readdirSync(OUT)) {
  if (entry === MARKER) continue
  if (!EXPECTED_AT_ROOT.has(entry)) problems.push(`unexpected top-level entry: ${entry}`)
}
const leaked = walkEverything(OUT).filter((path) => SKIP.test(relative(OUT, path)))
if (leaked.length) {
  problems.push(`${leaked.length} development files leaked: ${leaked.slice(0, 5).map((p) => relative(OUT, p)).join(', ')}`)
}

// The two files `npm install` needs.
const shipped = new Set(copied)
for (const required of ['package.json', 'package-lock.json']) {
  if (!shipped.has(required)) problems.push(`${required} missing from the output`)
}
if (!existsSync(join(OUT, 'LICENSE'))) {
  console.log(
    '\nNOTE  No LICENSE file. UI8 needs an explicit licence before review — drop one at the\n' +
      '      repository root and re-run; it ships automatically once it exists.',
  )
}

// The manifest is for the human assembling the upload, not the buyer.
writeFileSync(
  join(OUT, MARKER),
  `${copied.length} files, ${mb(bytes)}\nBuilt by scripts/package.mjs from the working tree at ${new Date().toISOString()}\n` +
    `${copied.slice().sort().join('\n')}\n`,
)

const counts = {}
for (const rel of copied) {
  const top = rel.split('/')[0]
  counts[top] = (counts[top] || 0) + 1
}

const shown = relative(ROOT, OUT)
console.log(`\n${shown.startsWith('..') ? OUT : `${shown}/`}`)
for (const [top, count] of Object.entries(counts)) {
  const size = top.includes('.') ? kb(statSync(join(OUT, top)).size) : mb(bytesIn(top))
  console.log(`  ${top.padEnd(22)} ${String(count).padStart(4)} files   ${size}`)
}
console.log(`  ${'TOTAL'.padEnd(22)} ${String(copied.length).padStart(4)} files   ${mb(bytes)}`)

function bytesIn(top) {
  let total = 0
  for (const rel of copied) if (rel.startsWith(`${top}/`)) total += statSync(join(OUT, rel)).size
  return total
}

if (problems.length) {
  console.error('\nPACKAGE PROBLEMS')
  for (const problem of problems) console.error('  - ' + problem)
  process.exit(1)
}

if (args.includes('--zip')) {
  const relOut = relative(ROOT, OUT)
  // `zip` stores the path it is given, so an absolute one bakes the whole
  // machine into the archive. Only package a directory inside the repository.
  if (relOut.startsWith('..')) {
    console.error('\n--zip needs the output inside the repository. Pass --out ui8-upload.')
    process.exit(1)
  }
  const zip = `${OUT}.zip`
  rmSync(zip, { force: true })
  const result = spawnSync('zip', ['-qr', `${relOut}.zip`, relOut], { cwd: ROOT, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status)
  console.log(`\nwrote ${relOut}.zip (${mb(statSync(zip).size)})`)
}

console.log('\nReady to upload. Nothing under node_modules/, no .shots*, no promt.md.')
