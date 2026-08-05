import {
  ELEMENT_COLORS,
  LINE_COLORS,
  formatSlotLabel,
  type MasterQuartz,
  type OrbmentLine,
  type OrbmentTopology,
  type OrbmentVisual,
  type Quartz,
  type SlotId,
} from '../domain/types'
import { type EquippedQuartzMap, type NodeTierMap, type SlotRestrictionMap } from '../state/orbmentState'

type Point = { x: number; y: number }

type OrbmentGraphProps = {
  lines: OrbmentLine[]
  slotRestrictions: SlotRestrictionMap
  equippedQuartz: EquippedQuartzMap
  quartzById: Map<number, Quartz>
  topology: OrbmentTopology
  nodeTiers: NodeTierMap
  orbmentVisual?: OrbmentVisual
  equippedMasterQuartzId?: number | null
  masterQuartzLevel?: number
  masterQuartzById?: Map<number, MasterQuartz>
}

const NODE_RADIUS = 24
const RECT_WIDTH = 32
const RECT_HEIGHT = 52
const RECT_RX = 4
const RING_CENTER: Point = { x: 170, y: 170 }
const RING_RADIUS = 118
const FC_SLOT_POINTS: Record<number, Point> = {
  1: { x: 170, y: 170 },
  2: { x: 68, y: 230 },
  3: { x: 68, y: 110 },
  4: { x: 170, y: 52 },
  5: { x: 272, y: 110 },
  6: { x: 272, y: 230 },
}
const SC_SLOT_POINTS: Record<number, Point> = {
  1: { x: 170, y: 170 },
  2: { x: 68, y: 230 },
  3: { x: 68, y: 110 },
  4: { x: 170, y: 52 },
  5: { x: 272, y: 110 },
  6: { x: 272, y: 230 },
  7: { x: 170, y: 288 },
}
const FC_EMPTY_HEX_VERTEX: Point = { x: 170, y: 288 }
const CS_SLOT_POINTS = createColdSteelSlotPoints()

export function OrbmentGraph({
  lines,
  slotRestrictions,
  equippedQuartz,
  quartzById,
  topology,
  nodeTiers,
  orbmentVisual,
  equippedMasterQuartzId = null,
  masterQuartzLevel = 1,
  masterQuartzById = new Map(),
}: OrbmentGraphProps) {
  const layout = getLayout(topology)
  const slotPoints = layout.slotPoints
  const edges = buildEdges(lines)
  const outerPath = layout.guideSequence
    .map((slotId) => slotPoints[slotId])
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
  const title = orbmentVisual?.title ?? 'Orbment'
  const useCircularOuter = orbmentVisual?.outerEdges === 'circular'
  const useRectNodes = orbmentVisual?.nodeShape === 'rect'

  return (
    <section className="orbmentPanel">
      <h3>{title}</h3>
      <svg viewBox="0 0 340 340" className="orbmentSvg" aria-label={`${title} graph`}>
        <polygon points={outerPath} className="orbmentHexGuide" />
        {layout.gapMarker ? (
          <circle cx={layout.gapMarker.x} cy={layout.gapMarker.y} r={6} className="orbmentGapMarker" />
        ) : null}

        {edges.map((edge, index) => {
          const from = slotPoints[edge.from]
          const to = slotPoints[edge.to]
          const isOuterEdge = edge.from !== topology.centerSlot && edge.to !== topology.centerSlot
          const edgeKey = `${edge.from}-${edge.to}-${edge.lineIndex}-${index}`

          if (useCircularOuter && isOuterEdge) {
            const arcPath = buildOuterArcPath(from, to, useRectNodes)
            if (arcPath) {
              return (
                <path
                  key={edgeKey}
                  d={arcPath}
                  fill="none"
                  stroke={lineColor(edge.lineIndex)}
                  strokeWidth={4}
                  strokeLinecap="round"
                  className="orbmentEdge"
                />
              )
            }
          }

          const fromIsRect = useRectNodes && edge.from !== topology.masterQuartzSlot
          const toIsRect = useRectNodes && edge.to !== topology.masterQuartzSlot
          const trimmed = trimMixedEdge(from, to, fromIsRect, toIsRect)

          return (
            <line
              key={edgeKey}
              x1={trimmed.start.x}
              y1={trimmed.start.y}
              x2={trimmed.end.x}
              y2={trimmed.end.y}
              stroke={lineColor(edge.lineIndex)}
              strokeWidth={4}
              strokeLinecap="round"
              className="orbmentEdge"
            />
          )
        })}

        {topology.slotIds.map((slotId) => {
          const isMasterSlot = topology.masterQuartzSlot === slotId
          const restriction = isMasterSlot ? null : slotRestrictions[slotId]
          const equippedQuartzId = equippedQuartz[slotId]
          const equippedQuartzName = isMasterSlot
            ? (equippedMasterQuartzId ? masterQuartzById.get(equippedMasterQuartzId)?.name.en : null)
            : equippedQuartzId
              ? quartzById.get(equippedQuartzId)?.name.en
              : null
          const fill = restriction ? withAlpha(ELEMENT_COLORS[restriction], 0.24) : '#ffffff'
          const stroke = restriction ? ELEMENT_COLORS[restriction] : '#8f96a3'
          const point = slotPoints[slotId]
          const label = isMasterSlot
            ? `M${equippedMasterQuartzId ? ` L${masterQuartzLevel}` : ''}`
            : `${formatSlotLabel(slotId, topology)}${layout.showTier ? ` T${nodeTiers[slotId]}` : ''}`

          if (useRectNodes && !isMasterSlot) {
            return (
              <g key={`slot-${slotId}`}>
                <rect
                  x={point.x - RECT_WIDTH / 2}
                  y={point.y - RECT_HEIGHT / 2}
                  width={RECT_WIDTH}
                  height={RECT_HEIGHT}
                  rx={RECT_RX}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={3}
                />
                <text x={point.x} y={point.y - 8} className="orbmentNodeRectText">
                  {label}
                </text>
                <text x={point.x} y={point.y + 10} className="orbmentNodeRectText">
                  {shortName(equippedQuartzName)}
                </text>
              </g>
            )
          }

          return (
            <g key={`slot-${slotId}`}>
              <circle cx={point.x} cy={point.y} r={NODE_RADIUS} fill={fill} stroke={stroke} strokeWidth={3} />
              {isMasterSlot ? (
                <>
                  <text x={point.x} y={point.y - 8} className="orbmentNodeRectText">
                    {label}
                  </text>
                  <text x={point.x} y={point.y + 10} className="orbmentNodeRectText">
                    {shortName(equippedQuartzName)}
                  </text>
                </>
              ) : (
                <>
                  <text x={point.x} y={point.y - 31} className="orbmentNodeId">
                    {label}
                  </text>
                  <text x={point.x} y={point.y + 1} className="orbmentNodeText">
                    {shortName(equippedQuartzName)}
                  </text>
                </>
              )}
            </g>
          )
        })}
      </svg>

      <div className="lineLegend">
        {lines.map((line, index) => (
          <span key={`line-legend-${index}`} className="legendItem">
            <span className="legendSwatch" style={{ backgroundColor: lineColor(index) }} />
            Line {index + 1}: {line.map((slotId) => formatSlotLabel(slotId, topology)).join('-')}
          </span>
        ))}
      </div>
    </section>
  )
}

function buildEdges(lines: OrbmentLine[]): { from: SlotId; to: SlotId; lineIndex: number }[] {
  const edges: { from: SlotId; to: SlotId; lineIndex: number }[] = []
  for (const [lineIndex, line] of lines.entries()) {
    for (let i = 0; i < line.length - 1; i += 1) {
      edges.push({ from: line[i], to: line[i + 1], lineIndex })
    }
  }
  return edges
}

function trimMixedEdge(
  from: Point,
  to: Point,
  fromIsRect: boolean,
  toIsRect: boolean,
): { start: Point; end: Point } {
  return {
    start: fromIsRect ? rectExitPoint(from, to, RECT_WIDTH, RECT_HEIGHT) : circleExitPoint(from, to, NODE_RADIUS),
    end: toIsRect ? rectExitPoint(to, from, RECT_WIDTH, RECT_HEIGHT) : circleExitPoint(to, from, NODE_RADIUS),
  }
}

function circleExitPoint(origin: Point, target: Point, radius: number): Point {
  const dx = target.x - origin.x
  const dy = target.y - origin.y
  const distance = Math.hypot(dx, dy)
  if (distance === 0) {
    return origin
  }
  return {
    x: origin.x + (dx / distance) * radius,
    y: origin.y + (dy / distance) * radius,
  }
}

function rectExitPoint(origin: Point, target: Point, width: number, height: number): Point {
  const dx = target.x - origin.x
  const dy = target.y - origin.y
  if (dx === 0 && dy === 0) {
    return origin
  }

  const tx = dx === 0 ? Number.POSITIVE_INFINITY : width / 2 / Math.abs(dx)
  const ty = dy === 0 ? Number.POSITIVE_INFINITY : height / 2 / Math.abs(dy)
  const t = Math.min(tx, ty)

  return {
    x: origin.x + dx * t,
    y: origin.y + dy * t,
  }
}

function buildOuterArcPath(from: Point, to: Point, useRectNodes: boolean): string | null {
  const fromAngle = Math.atan2(from.y - RING_CENTER.y, from.x - RING_CENTER.x)
  const toAngle = Math.atan2(to.y - RING_CENTER.y, to.x - RING_CENTER.x)
  const delta = signedAngleDelta(fromAngle, toAngle)
  if (delta === 0) {
    return null
  }

  const direction = Math.sign(delta)
  const start = useRectNodes
    ? pickArcTrimPoint(circleRectIntersections(RING_CENTER, RING_RADIUS, from, RECT_WIDTH, RECT_HEIGHT), fromAngle, direction)
    : pointOnRing(fromAngle + direction * (NODE_RADIUS / RING_RADIUS))
  const end = useRectNodes
    ? pickArcTrimPoint(
        circleRectIntersections(RING_CENTER, RING_RADIUS, to, RECT_WIDTH, RECT_HEIGHT),
        toAngle,
        -direction,
      )
    : pointOnRing(toAngle - direction * (NODE_RADIUS / RING_RADIUS))

  if (!start || !end) {
    return null
  }

  const sweep = direction > 0 ? 1 : 0
  return `M ${start.x} ${start.y} A ${RING_RADIUS} ${RING_RADIUS} 0 0 ${sweep} ${end.x} ${end.y}`
}

function pointOnRing(angle: number): Point {
  return {
    x: RING_CENTER.x + Math.cos(angle) * RING_RADIUS,
    y: RING_CENTER.y + Math.sin(angle) * RING_RADIUS,
  }
}

function circleRectIntersections(
  center: Point,
  radius: number,
  rectCenter: Point,
  width: number,
  height: number,
): Point[] {
  const left = rectCenter.x - width / 2
  const right = rectCenter.x + width / 2
  const top = rectCenter.y - height / 2
  const bottom = rectCenter.y + height / 2
  const points: Point[] = []

  function addVertical(x: number): void {
    const disc = radius * radius - (x - center.x) ** 2
    if (disc < 0) {
      return
    }
    const root = Math.sqrt(disc)
    for (const y of [center.y + root, center.y - root]) {
      if (y >= top - 0.5 && y <= bottom + 0.5) {
        points.push({ x, y })
      }
    }
  }

  function addHorizontal(y: number): void {
    const disc = radius * radius - (y - center.y) ** 2
    if (disc < 0) {
      return
    }
    const root = Math.sqrt(disc)
    for (const x of [center.x + root, center.x - root]) {
      if (x >= left - 0.5 && x <= right + 0.5) {
        points.push({ x, y })
      }
    }
  }

  addVertical(left)
  addVertical(right)
  addHorizontal(top)
  addHorizontal(bottom)
  return points
}

function pickArcTrimPoint(intersections: Point[], fromAngle: number, direction: number): Point | null {
  let best: Point | null = null
  let bestDelta = Number.POSITIVE_INFINITY

  for (const point of intersections) {
    const angle = Math.atan2(point.y - RING_CENTER.y, point.x - RING_CENTER.x)
    const delta = signedAngleDelta(fromAngle, angle)
    if (delta === 0 || Math.sign(delta) !== direction) {
      continue
    }
    if (Math.abs(delta) < bestDelta) {
      bestDelta = Math.abs(delta)
      best = point
    }
  }

  return best
}

function signedAngleDelta(from: number, to: number): number {
  let delta = to - from
  while (delta <= -Math.PI) {
    delta += Math.PI * 2
  }
  while (delta > Math.PI) {
    delta -= Math.PI * 2
  }
  return delta
}

function lineColor(lineIndex: number): string {
  return LINE_COLORS[lineIndex % LINE_COLORS.length]
}

function createColdSteelSlotPoints(): Record<number, Point> {
  const points: Record<number, Point> = { 1: { ...RING_CENTER } }
  const startAngle = (157.5 * Math.PI) / 180
  const step = Math.PI / 4
  for (let index = 0; index < 8; index += 1) {
    const angle = startAngle + index * step
    points[index + 2] = {
      x: RING_CENTER.x + RING_RADIUS * Math.cos(angle),
      y: RING_CENTER.y + RING_RADIUS * Math.sin(angle),
    }
  }
  return points
}

function withAlpha(hexColor: string, alpha: number): string {
  const normalized = hexColor.replace('#', '')
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function shortName(value: string | null | undefined): string {
  if (!value) {
    return '-'
  }
  return value.length > 8 ? `${value.slice(0, 8)}.` : value
}

function getLayout(topology: OrbmentTopology): {
  slotPoints: Record<number, Point>
  guideSequence: SlotId[]
  gapMarker: Point | null
  showTier: boolean
} {
  if (topology.slotIds.length === 6) {
    return {
      slotPoints: FC_SLOT_POINTS,
      guideSequence: [2, 3, 4, 5, 6],
      gapMarker: FC_EMPTY_HEX_VERTEX,
      showTier: false,
    }
  }

  if (topology.slotIds.length === 7) {
    return {
      slotPoints: SC_SLOT_POINTS,
      guideSequence: [2, 3, 4, 5, 6, 7],
      gapMarker: null,
      showTier: true,
    }
  }

  if (topology.slotIds.length === 9) {
    return {
      slotPoints: CS_SLOT_POINTS,
      guideSequence: [2, 3, 4, 5, 6, 7, 8, 9],
      gapMarker: null,
      showTier: false,
    }
  }

  return {
    slotPoints: FC_SLOT_POINTS,
    guideSequence: topology.outerDirectionSequence,
    gapMarker: null,
    showTier: true,
  }
}
