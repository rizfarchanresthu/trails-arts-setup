import { Download } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { exportOrbmentPng } from '@/lib/exportOrbmentPng'
import {
  ELEMENT_COLORS,
  LINE_COLORS,
  formatSlotLabel,
  getArtElements,
  type ElementName,
  type Art,
  type ElementTotals,
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
  equippedSubMasterQuartzId?: number | null
  subMasterQuartzLevel?: number
  masterQuartzById?: Map<number, MasterQuartz>
  showTier?: boolean
  availableArts?: Art[]
  lineTotals?: ElementTotals[]
}

const NODE_RADIUS = 24
const MASTER_NODE_RADIUS = 32
const SUB_MASTER_NODE_RADIUS = 28
const RECT_WIDTH = 32
const RECT_HEIGHT = 52
const RECT_RX = 4
const RING_CENTER: Point = { x: 170, y: 170 }
const RING_RADIUS = 118
const SUB_MASTER_RING_RADIUS = RING_RADIUS * 0.5
const SUB_MASTER_LINK_COLOR = '#c9a227'
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
const CS3_SLOT_POINTS = createColdSteelIIISlotPoints()
const CS3_GUIDE_POINTS = createColdSteelIIIGuidePoints()

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
  equippedSubMasterQuartzId = null,
  subMasterQuartzLevel = 1,
  masterQuartzById = new Map(),
  showTier,
  availableArts = [],
  lineTotals = [],
}: OrbmentGraphProps) {
  const layout = getLayout(topology)
  const shouldShowTier = showTier ?? layout.showTier
  const slotPoints = layout.slotPoints
  const edges = buildEdges(lines)
  const outerPath = layout.guideSequence
    .map((slotId) => layout.guidePoints?.[slotId] ?? slotPoints[slotId])
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
  const title = orbmentVisual?.title ?? 'Orbment'
  const useCircularOuter = orbmentVisual?.outerEdges === 'circular'
  const useRectNodes = orbmentVisual?.nodeShape === 'rect'
  const subMasterSlot = topology.subMasterQuartzSlot
  const svgRef = useRef<SVGSVGElement>(null)
  const legendEntries = lines.map((line, index) => ({
    color: lineColor(index),
    text: `Line ${index + 1}: ${line.map((slotId) => formatSlotLabel(slotId, topology)).join('-')}`,
  }))

  const resolveEquippedName = (slotId: SlotId): string | null => {
    if (slotId === topology.masterQuartzSlot) {
      return equippedMasterQuartzId ? (masterQuartzById.get(equippedMasterQuartzId)?.name.en ?? null) : null
    }
    if (slotId === topology.subMasterQuartzSlot) {
      return equippedSubMasterQuartzId
        ? (masterQuartzById.get(equippedSubMasterQuartzId)?.name.en ?? null)
        : null
    }
    const quartzId = equippedQuartz[slotId]
    return quartzId ? (quartzById.get(quartzId)?.name.en ?? null) : null
  }

  const slotDisplayLabel = (slotId: SlotId): string | null => {
    if (slotId === topology.masterQuartzSlot) return `Master (L${masterQuartzLevel})`
    if (slotId === topology.subMasterQuartzSlot) return `Sub-Master (L${subMasterQuartzLevel})`
    return null
  }

  const slotAccentColor = (slotId: SlotId): string | null => {
    if (slotId === topology.masterQuartzSlot || slotId === topology.subMasterQuartzSlot) return null
    const restriction = slotRestrictions[slotId]
    return restriction ? ELEMENT_COLORS[restriction] : null
  }

  const handleExport = () => {
    if (!svgRef.current) return
    const exportLines = lines.map((line, index) => ({
      color: lineColor(index),
      slots: line.map((slotId) => ({
        label: slotDisplayLabel(slotId),
        quartz: resolveEquippedName(slotId),
        accent: slotAccentColor(slotId),
      })),
      totals: Object.entries(lineTotals[index] ?? {})
        .filter(([, value]) => value > 0)
        .map(([element, value]) => ({
          element,
          value,
          color: ELEMENT_COLORS[element as ElementName],
        })),
    }))

    if (subMasterSlot !== undefined && !lines.some((line) => line.includes(subMasterSlot))) {
      exportLines.push({
        color: SUB_MASTER_LINK_COLOR,
        slots: [
          {
            label: slotDisplayLabel(subMasterSlot),
            quartz: resolveEquippedName(subMasterSlot),
            accent: null,
          },
        ],
        totals: [],
      })
    }

    void exportOrbmentPng({
      svg: svgRef.current,
      title,
      lines: exportLines,
      arts: availableArts.map((art) => ({
        name: art.name.en,
        color: ELEMENT_COLORS[getArtElements(art)[0]],
      })),
      fileName: `orbment-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`,
    })
  }

  return (
    <section className="orbmentPanel">
      <h3>{title}</h3>
      <svg ref={svgRef} viewBox="0 0 340 340" className="orbmentSvg" aria-label={`${title} graph`}>
        <polygon points={outerPath} className="orbmentHexGuide" />
        {layout.gapMarker ? (
          <circle cx={layout.gapMarker.x} cy={layout.gapMarker.y} r={6} className="orbmentGapMarker" />
        ) : null}

        {subMasterSlot !== undefined && slotPoints[topology.centerSlot] && slotPoints[subMasterSlot] ? (
          <line
            x1={circleExitPoint(slotPoints[topology.centerSlot], slotPoints[subMasterSlot], MASTER_NODE_RADIUS).x}
            y1={circleExitPoint(slotPoints[topology.centerSlot], slotPoints[subMasterSlot], MASTER_NODE_RADIUS).y}
            x2={circleExitPoint(slotPoints[subMasterSlot], slotPoints[topology.centerSlot], SUB_MASTER_NODE_RADIUS).x}
            y2={circleExitPoint(slotPoints[subMasterSlot], slotPoints[topology.centerSlot], SUB_MASTER_NODE_RADIUS).y}
            stroke={SUB_MASTER_LINK_COLOR}
            strokeWidth={4}
            strokeLinecap="round"
            className="orbmentEdge"
          />
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

          const fromIsRect =
            useRectNodes &&
            edge.from !== topology.masterQuartzSlot &&
            edge.from !== topology.subMasterQuartzSlot
          const toIsRect =
            useRectNodes &&
            edge.to !== topology.masterQuartzSlot &&
            edge.to !== topology.subMasterQuartzSlot
          const fromRadius =
            edge.from === topology.masterQuartzSlot
              ? MASTER_NODE_RADIUS
              : edge.from === topology.subMasterQuartzSlot
                ? SUB_MASTER_NODE_RADIUS
                : NODE_RADIUS
          const toRadius =
            edge.to === topology.masterQuartzSlot
              ? MASTER_NODE_RADIUS
              : edge.to === topology.subMasterQuartzSlot
                ? SUB_MASTER_NODE_RADIUS
                : NODE_RADIUS
          const trimmed = trimMixedEdge(from, to, fromIsRect, toIsRect, fromRadius, toRadius)

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
          const isSubMasterSlot = topology.subMasterQuartzSlot === slotId
          const restriction = isMasterSlot || isSubMasterSlot ? null : slotRestrictions[slotId]
          const equippedQuartzId = equippedQuartz[slotId]
          const equippedQuartzName = isMasterSlot
            ? (equippedMasterQuartzId ? masterQuartzById.get(equippedMasterQuartzId)?.name.en : null)
            : isSubMasterSlot
              ? (equippedSubMasterQuartzId ? masterQuartzById.get(equippedSubMasterQuartzId)?.name.en : null)
              : equippedQuartzId
                ? quartzById.get(equippedQuartzId)?.name.en
                : null
          const fill = restriction ? withAlpha(ELEMENT_COLORS[restriction], 0.24) : 'var(--card)'
          const stroke = restriction ? ELEMENT_COLORS[restriction] : '#8f96a3'
          const point = slotPoints[slotId]
          const label = isMasterSlot
            ? `M${equippedMasterQuartzId ? ` L${masterQuartzLevel}` : ''}`
            : isSubMasterSlot
              ? `S${equippedSubMasterQuartzId ? ` L${subMasterQuartzLevel}` : ''}`
              : `${formatSlotLabel(slotId, topology)}${shouldShowTier ? ` T${nodeTiers[slotId]}` : ''}`
          const nodeRadius = isMasterSlot
            ? MASTER_NODE_RADIUS
            : isSubMasterSlot
              ? SUB_MASTER_NODE_RADIUS
              : NODE_RADIUS

          if (useRectNodes && !isMasterSlot && !isSubMasterSlot) {
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
              <circle cx={point.x} cy={point.y} r={nodeRadius} fill={fill} stroke={stroke} strokeWidth={3} />
              {isMasterSlot || isSubMasterSlot ? (
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
        {legendEntries.map((entry, index) => (
          <span key={`line-legend-${index}`} className="legendItem">
            <span className="legendSwatch" style={{ backgroundColor: entry.color }} />
            {entry.text}
          </span>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={handleExport} className="orbmentExportButton">
        <Download />
        Download PNG
      </Button>
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
  fromRadius = NODE_RADIUS,
  toRadius = NODE_RADIUS,
): { start: Point; end: Point } {
  return {
    start: fromIsRect ? rectExitPoint(from, to, RECT_WIDTH, RECT_HEIGHT) : circleExitPoint(from, to, fromRadius),
    end: toIsRect ? rectExitPoint(to, from, RECT_WIDTH, RECT_HEIGHT) : circleExitPoint(to, from, toRadius),
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

function createColdSteelIIISlotPoints(): Record<number, Point> {
  const points: Record<number, Point> = { 1: { ...RING_CENTER } }
  // Cardinal octagon: 2 SW, 3 W, 4 NW, 5 N, 6 NE, 7 E, 8 SE (SVG y-down)
  const outerAnglesDeg = [135, 180, 225, 270, 315, 0, 45]
  for (let index = 0; index < outerAnglesDeg.length; index += 1) {
    const angle = (outerAnglesDeg[index] * Math.PI) / 180
    points[index + 2] = {
      x: RING_CENTER.x + RING_RADIUS * Math.cos(angle),
      y: RING_CENTER.y + RING_RADIUS * Math.sin(angle),
    }
  }
  // Slot 9: inset south (90°)
  const southAngle = (90 * Math.PI) / 180
  points[9] = {
    x: RING_CENTER.x + SUB_MASTER_RING_RADIUS * Math.cos(southAngle),
    y: RING_CENTER.y + SUB_MASTER_RING_RADIUS * Math.sin(southAngle),
  }
  return points
}

function createColdSteelIIIGuidePoints(): Record<number, Point> {
  const points: Record<number, Point> = {}
  // Full cardinal octagon including empty south vertex for the guide polygon
  const guideAnglesDeg = [135, 180, 225, 270, 315, 0, 45, 90]
  const guideSlotIds = [2, 3, 4, 5, 6, 7, 8, 0]
  for (let index = 0; index < guideAnglesDeg.length; index += 1) {
    const angle = (guideAnglesDeg[index] * Math.PI) / 180
    points[guideSlotIds[index]] = {
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
  guidePoints?: Record<number, Point>
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

  if (topology.slotIds.length === 9 && topology.subMasterQuartzSlot !== undefined) {
    return {
      slotPoints: CS3_SLOT_POINTS,
      guideSequence: [2, 3, 4, 5, 6, 7, 8, 0],
      guidePoints: CS3_GUIDE_POINTS,
      gapMarker: null,
      showTier: false,
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
