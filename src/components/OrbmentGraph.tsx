import { ELEMENT_COLORS, LINE_COLORS, type OrbmentLine, type OrbmentTopology, type Quartz, type SlotId } from '../domain/types'
import { type EquippedQuartzMap, type NodeTierMap, type SlotRestrictionMap } from '../state/orbmentState'

type Point = { x: number; y: number }

type OrbmentGraphProps = {
  lines: OrbmentLine[]
  slotRestrictions: SlotRestrictionMap
  equippedQuartz: EquippedQuartzMap
  quartzById: Map<number, Quartz>
  topology: OrbmentTopology
  nodeTiers: NodeTierMap
}

const NODE_RADIUS = 24
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

export function OrbmentGraph({
  lines,
  slotRestrictions,
  equippedQuartz,
  quartzById,
  topology,
  nodeTiers,
}: OrbmentGraphProps) {
  const layout = getLayout(topology)
  const slotPoints = layout.slotPoints
  const edges = buildEdges(lines)
  const outerPath = layout.guideSequence
    .map((slotId) => slotPoints[slotId])
    .map((point) => `${point.x},${point.y}`)
    .join(' ')

  return (
    <section className="orbmentPanel">
      <h3>Orbment</h3>
      <svg viewBox="0 0 340 340" className="orbmentSvg" aria-label="Orbment graph">
        <polygon points={outerPath} className="orbmentHexGuide" />
        {layout.gapMarker ? (
          <circle cx={layout.gapMarker.x} cy={layout.gapMarker.y} r={6} className="orbmentGapMarker" />
        ) : null}

        {edges.map((edge, index) => {
          const from = slotPoints[edge.from]
          const to = slotPoints[edge.to]
          const { start, end } = trimEdgeToNodeBoundary(from, to, NODE_RADIUS)
          return (
            <line
              key={`${edge.from}-${edge.to}-${edge.lineIndex}-${index}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={lineColor(edge.lineIndex)}
              strokeWidth={4}
              strokeLinecap="round"
              className="orbmentEdge"
            />
          )
        })}

        {topology.slotIds.map((slotId) => {
          const restriction = slotRestrictions[slotId]
          const equippedQuartzId = equippedQuartz[slotId]
          const equippedQuartzName = equippedQuartzId ? quartzById.get(equippedQuartzId)?.name.en : null
          const fill = restriction ? withAlpha(ELEMENT_COLORS[restriction], 0.24) : '#ffffff'
          const stroke = restriction ? ELEMENT_COLORS[restriction] : '#8f96a3'

          return (
            <g key={`slot-${slotId}`}>
              <circle
                cx={slotPoints[slotId].x}
                cy={slotPoints[slotId].y}
                r={NODE_RADIUS}
                fill={fill}
                stroke={stroke}
                strokeWidth={3}
              />
              <text x={slotPoints[slotId].x} y={slotPoints[slotId].y - 31} className="orbmentNodeId">
                {slotId}
                {layout.showTier ? ` T${nodeTiers[slotId]}` : ''}
              </text>
              <text x={slotPoints[slotId].x} y={slotPoints[slotId].y + 1} className="orbmentNodeText">
                {shortName(equippedQuartzName)}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="lineLegend">
        {lines.map((line, index) => (
          <span key={`line-legend-${index}`} className="legendItem">
            <span className="legendSwatch" style={{ backgroundColor: lineColor(index) }} />
            Line {index + 1}: {line.join('-')}
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

function trimEdgeToNodeBoundary(from: Point, to: Point, radius: number): { start: Point; end: Point } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy)

  if (distance === 0) {
    return { start: from, end: to }
  }

  const ux = dx / distance
  const uy = dy / distance

  return {
    start: { x: from.x + ux * radius, y: from.y + uy * radius },
    end: { x: to.x - ux * radius, y: to.y - uy * radius },
  }
}

function lineColor(lineIndex: number): string {
  return LINE_COLORS[lineIndex] ?? '#8f96a3'
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

  return {
    slotPoints: FC_SLOT_POINTS,
    guideSequence: topology.outerDirectionSequence,
    gapMarker: null,
    showTier: true,
  }
}
