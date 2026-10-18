import { useEffect, useRef, useState } from 'react'
import { cn, formatCount, sum } from '../../lib/utils.js'

const AXIS = 'text-content-3'

const NICE_STEPS = []
for (let exponent = -2; exponent <= 9; exponent += 1) {
  for (const multiple of [1, 2, 2.5, 5]) NICE_STEPS.push(multiple * 10 ** exponent)
}
NICE_STEPS.sort((a, b) => a - b)

/**
 * Gridline values for a zero-based axis. Picking the nicest step rather than a
 * fifth of the data maximum keeps a 51-member chart labelling 0/20/40/60 instead
 * of 0/13/26/38/51, which reads like a rounding error.
 */
function axisTicks(max) {
  if (!(max > 0)) return [0, 1]
  const whole = Number.isInteger(max)
  let best = null
  for (let lines = 2; lines <= 4; lines += 1) {
    const step = NICE_STEPS.find(
      (s) => s >= max / lines - 1e-9 && (!whole || Number.isInteger(s)),
    )
    if (!step) continue
    const top = step * lines
    if (!best || top < best.top) best = { step, top }
  }
  if (!best) return [0, max]
  return Array.from({ length: best.top / best.step + 1 }, (_, i) => i * best.step)
}

/** Charts are drawn at measured pixel width so labels never stretch. */
function useMeasure() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    setWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}

export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
]

export function ChartLegend({ series, className = '' }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {series.map((item, index) => (
        <li key={item.key || item.label} className="flex items-center gap-1.5 text-[11px] text-content-2">
          <span
            className="size-2 shrink-0 rounded-sm"
            style={{ background: item.color || CHART_COLORS[index % CHART_COLORS.length] }}
            aria-hidden="true"
          />
          {item.label}
          {item.value !== undefined && (
            <span className="font-semibold text-content tnum">{item.value}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

function Tooltip({ x, y, width, children }) {
  const flip = width && x > width - 130
  return (
    <div
      className="pointer-events-none absolute z-10 w-max max-w-56 rounded-control border border-line bg-elevated px-2.5 py-1.5 text-[11px] shadow-pop"
      style={{ left: flip ? undefined : x + 10, right: flip ? width - x + 10 : undefined, top: Math.max(0, y - 12) }}
    >
      {children}
    </div>
  )
}

/**
 * Line / area chart. `series` is a list of `{ key, label }` read out of each
 * row in `data` — pass the real records, never a hardcoded shape.
 */
export function LineChart({
  data = [],
  series = [],
  xKey = 'label',
  height = 200,
  area = true,
  formatValue = formatCount,
  formatX = (value) => value,
  className = '',
}) {
  const [ref, measured] = useMeasure()
  const [hover, setHover] = useState(null)
  const width = measured || 640

  const pad = { top: 10, right: 12, bottom: 22, left: 40 }
  const innerW = Math.max(10, width - pad.left - pad.right)
  const innerH = Math.max(10, height - pad.top - pad.bottom)
  const count = data.length

  const values = series.flatMap((s) => data.map((row) => Number(row[s.key]) || 0))
  const ticks = axisTicks(Math.max(0, ...values))
  const top = ticks[ticks.length - 1] || 1

  const xAt = (index) => pad.left + (count <= 1 ? innerW / 2 : (index * innerW) / (count - 1))
  const yAt = (value) => pad.top + innerH - ((Number(value) || 0) / top) * innerH

  const labelEvery = Math.max(1, Math.ceil(count / (innerW > 560 ? 8 : 5)))
  // The newest point is always worth naming, unless a label already sits beside it.
  const showLabel = (i) =>
    i % labelEvery === 0 || (i === count - 1 && (count - 1) % labelEvery > 1)

  const onMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - box.left
    const index = Math.round(((x - pad.left) / innerW) * (count - 1))
    setHover(Math.max(0, Math.min(count - 1, index)))
  }

  return (
    <div ref={ref} className={cn('relative w-full', className)} style={{ height }}>
      {count > 0 && width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Trend chart with ${count} points and ${series.length} series`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={yAt(tick)}
                y2={yAt(tick)}
                stroke="var(--line)"
                strokeDasharray={tick === 0 ? '0' : '3 4'}
              />
              <text
                x={pad.left - 6}
                y={yAt(tick) + 3}
                textAnchor="end"
                fontSize="9"
                className={AXIS}
                fill="currentColor"
              >
                {formatValue(tick)}
              </text>
            </g>
          ))}

          {series.map((s, sIndex) => {
            const color = s.color || CHART_COLORS[sIndex % CHART_COLORS.length]
            const points = data.map((row, i) => [xAt(i), yAt(row[s.key])])
            const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
            const fill = `${line}L${points[points.length - 1][0].toFixed(1)},${pad.top + innerH}L${points[0][0].toFixed(1)},${pad.top + innerH}Z`
            const gradientId = `grad-${s.key}-${sIndex}`

            return (
              <g key={s.key}>
                {area && series.length <= 2 && (
                  <>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={fill} fill={`url(#${gradientId})`} />
                  </>
                )}
                <path
                  d={line}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.9"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {hover !== null && (
                  <circle
                    cx={points[hover][0]}
                    cy={points[hover][1]}
                    r="3.4"
                    fill="var(--surface)"
                    stroke={color}
                    strokeWidth="2"
                  />
                )}
              </g>
            )
          })}

          {hover !== null && (
            <line
              x1={xAt(hover)}
              x2={xAt(hover)}
              y1={pad.top}
              y2={pad.top + innerH}
              stroke="var(--line-2)"
            />
          )}

          {data.map((row, i) =>
            showLabel(i) ? (
              <text
                key={`${row[xKey]}-${i}`}
                x={xAt(i)}
                y={height - 5}
                textAnchor={i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle'}
                fontSize="9"
                className={AXIS}
                fill="currentColor"
              >
                {formatX(row[xKey])}
              </text>
            ) : null,
          )}
        </svg>
      )}

      {hover !== null && data[hover] && (
        <Tooltip x={xAt(hover)} y={yAt(data[hover][series[0]?.key])} width={width}>
          <p className="font-semibold text-content">{formatX(data[hover][xKey])}</p>
          {series.map((s, sIndex) => (
            <p key={s.key} className="mt-0.5 flex items-center gap-1.5 text-content-2">
              <span
                className="size-1.5 rounded-full"
                style={{ background: s.color || CHART_COLORS[sIndex % CHART_COLORS.length] }}
              />
              {s.label}
              <span className="ml-auto font-semibold text-content tnum">
                {formatValue(data[hover][s.key])}
              </span>
            </p>
          ))}
          {data[hover].partial && (
            <p className="mt-1 text-content-3">
              {data[hover].key === data[data.length - 1].key ? 'Month in progress' : ''}
            </p>
          )}
        </Tooltip>
      )}
    </div>
  )
}

/** Vertical bars with value labels on hover. */
export function BarChart({
  data = [],
  valueKey = 'value',
  xKey = 'label',
  height = 180,
  color = 'var(--chart-1)',
  formatValue = formatCount,
  className = '',
}) {
  const [ref, measured] = useMeasure()
  const [hover, setHover] = useState(null)
  const width = measured || 640
  const pad = { top: 10, right: 4, bottom: 22, left: 34 }
  const innerW = Math.max(10, width - pad.left - pad.right)
  const innerH = Math.max(10, height - pad.top - pad.bottom)
  const dataMax = Math.max(0, ...data.map((row) => Number(row[valueKey]) || 0))
  const ticks = axisTicks(dataMax)
  const max = ticks[ticks.length - 1] || 1
  const slot = data.length ? innerW / data.length : innerW
  const barW = Math.max(4, Math.min(30, slot * 0.62))

  return (
    <div ref={ref} className={cn('relative w-full', className)} style={{ height }}>
      {width > 0 && data.length > 0 && (
        <svg width={width} height={height} role="img" aria-label={`Bar chart with ${data.length} bars`}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={pad.top + innerH - (tick / max) * innerH}
                y2={pad.top + innerH - (tick / max) * innerH}
                stroke="var(--line)"
                strokeDasharray={tick === 0 ? '0' : '3 4'}
              />
              <text
                x={pad.left - 6}
                y={pad.top + innerH - (tick / max) * innerH + 3}
                textAnchor="end"
                fontSize="9"
                className={AXIS}
                fill="currentColor"
              >
                {formatValue(tick)}
              </text>
            </g>
          ))}
          {data.map((row, i) => {
            const value = Number(row[valueKey]) || 0
            const h = (value / max) * innerH
            const x = pad.left + i * slot + (slot - barW) / 2
            const y = pad.top + innerH - h
            const active = hover === i
            return (
              <g
                key={`${row[xKey]}-${i}`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              >
                {/* Full-height hit area so thin bars remain easy to hover. */}
                <rect x={pad.left + i * slot} y={pad.top} width={slot} height={innerH} fill="transparent" />
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(1, h)}
                  rx="3"
                  fill={color}
                  opacity={active ? 1 : 0.78}
                />
                {(slot > 26 || active) && (
                  <text
                    x={x + barW / 2}
                    y={height - 6}
                    textAnchor="middle"
                    fontSize="9"
                    className={AXIS}
                    fill="currentColor"
                  >
                    {String(row[xKey]).slice(0, slot > 40 ? 12 : 4)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tooltip
          x={pad.left + hover * slot + slot / 2}
          y={pad.top + innerH - ((Number(data[hover][valueKey]) || 0) / max) * innerH}
          width={width}
        >
          <p className="font-semibold text-content">{data[hover][xKey]}</p>
          <p className="text-content-2">
            {formatValue(data[hover][valueKey])}
            {data[hover].capacity
              ? ` of ${formatValue(data[hover].capacity)} capacity`
              : ''}
          </p>
        </Tooltip>
      )}
    </div>
  )
}

/** Horizontal ranked bars — better than a pie for more than four categories. */
export function RankedBars({ data = [], valueKey = 'value', labelKey = 'label', color = 'var(--chart-1)', formatValue = formatCount, className = '' }) {
  const max = Math.max(1, ...data.map((row) => Number(row[valueKey]) || 0))
  return (
    <ul className={cn('flex flex-col gap-2.5', className)}>
      {data.map((row, index) => {
        const value = Number(row[valueKey]) || 0
        return (
          <li key={`${row[labelKey]}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
            <span className="truncate text-xs text-content">{row[labelKey]}</span>
            <span className="text-[11px] font-semibold text-content-2 tnum">
              {formatValue(value)}
            </span>
            <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <span
                className="block h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${(value / max) * 100}%`,
                  background: row.color || color,
                }}
              />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function DonutChart({
  data = [],
  size = 148,
  thickness = 16,
  centerLabel,
  centerValue,
  formatValue = formatCount,
  className = '',
}) {
  const total = sum(data, (row) => Number(row.value) || 0) || 1
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className={cn('flex flex-wrap items-center gap-5', className)}>
      <svg
        width={size}
        height={size}
        role="img"
        aria-label={data.map((row) => `${row.label}: ${row.value}`).join(', ')}
        className="shrink-0 -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={thickness}
        />
        {data.map((row, index) => {
          const value = Number(row.value) || 0
          const length = (value / total) * circumference
          const dash = `${length} ${circumference - length}`
          const circle = (
            <circle
              key={row.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={row.color || CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
            />
          )
          offset += length
          return circle
        })}
        <g className="rotate-90" style={{ transformOrigin: 'center' }}>
          <text
            x="50%"
            y="48%"
            textAnchor="middle"
            fontSize="17"
            fontWeight="600"
            fill="var(--content)"
          >
            {centerValue !== undefined ? formatValue(centerValue) : formatValue(total)}
          </text>
          <text x="50%" y="62%" textAnchor="middle" fontSize="9" fill="var(--content-3)">
            {centerLabel || 'Total'}
          </text>
        </g>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((row, index) => (
          <li key={row.label} className="flex items-center gap-2 text-[11px]">
            <span
              className="size-2 shrink-0 rounded-sm"
              style={{ background: row.color || CHART_COLORS[index % CHART_COLORS.length] }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-content-2">{row.label}</span>
            <span className="shrink-0 font-semibold text-content tnum">
              {formatValue(row.value)}
            </span>
            <span className="w-9 shrink-0 text-right text-content-3 tnum">
              {Math.round(((Number(row.value) || 0) / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Sparkline({ values = [], width = 84, height = 26, color = 'var(--chart-1)', className = '' }) {
  if (!values.length) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const step = values.length > 1 ? width / (values.length - 1) : width
  const points = values.map((value, i) => {
    const y = height - 2 - ((value - min) / (max - min || 1)) * (height - 4)
    return `${(i * step).toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg
      width={width}
      height={height}
      className={cn('shrink-0 overflow-visible', className)}
      aria-hidden="true"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
