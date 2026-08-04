import { ELEMENT_COLORS, LINE_COLORS, type OrbmentLine, type Quartz, type SlotId } from '../domain/types'
import { type EquippedQuartzMap, type SlotRestrictionMap } from '../state/orbmentState'

type Point = { x: number; y: number }

type OrbmentGraphProps = {
  lines: OrbmentLine[]
  slotRestrictions: SlotRestrictionMap
  equippedQuartz: EquippedQuartzMap
  quartzById: Map<number, Quartz>
}

// Slot numbering: 1 = center, 2 = bottom-left, then clockwise on the hex (bottom vertex empty).
const SLOT_POINTS: Record<SlotId, Point> = {
  1: { x: 170, y: 170 },
  2: { x: 68, y: 230 },
  3: { x: 68, y: 110 },
  4: { x: 170, y: 52 },
  5: { x: 272, y: 110 },
  6: { x: 272, y: 230 },
}

const EMPTY_HEX_VERTEX: Point = { x: 170, y: 288 }

export function OrbmentGraph({ lines, slotRestrictions, equippedQuartz, quartzById }: OrbmentGraphProps) {
  const edges = buildEdges(lines)

  return (
    <section className="orbmentPanel">
      <h3>Orbment</h3>
      <svg viewBox="0 0 340 340" className="orbmentSvg" aria-label="Orbment graph">
        <polygon
          points={`${SLOT_POINTS[2].x},${SLOT_POINTS[2].y} ${SLOT_POINTS[3].x},${SLOT_POINTS[3].y} ${SLOT_POINTS[4].x},${SLOT_POINTS[4].y} ${SLOT_POINTS[5].x},${SLOT_POINTS[5].y} ${SLOT_POINTS[6].x},${SLOT_POINTS[6].y}`}
          className="orbmentHexGuide"
        />
        <circle cx={EMPTY_HEX_VERTEX.x} cy={EMPTY_HEX_VERTEX.y} r={6} className="orbmentGapMarker" />

        {edges.map((edge, index) => {
          const from = SLOT_POINTS[edge.from]
          const to = SLOT_POINTS[edge.to]
          return (
            <line
              key={`${edge.from}-${edge.to}-${edge.lineIndex}-${index}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={lineColor(edge.lineIndex)}
              strokeWidth={4}
              strokeLinecap="round"
              className="orbmentEdge"
            />
          )
        })}

        {([1, 2, 3, 4, 5, 6] as SlotId[]).map((slotId) => {
          const restriction = slotRestrictions[slotId]
          const equippedQuartzId = equippedQuartz[slotId]
          const equippedQuartzName = equippedQuartzId ? quartzById.get(equippedQuartzId)?.name.en : null
          const fill = restriction ? withAlpha(ELEMENT_COLORS[restriction], 0.24) : '#ffffff'
          const stroke = restriction ? ELEMENT_COLORS[restriction] : '#8f96a3'

          return (
            <g key={`slot-${slotId}`}>
              <circle
                cx={SLOT_POINTS[slotId].x}
                cy={SLOT_POINTS[slotId].y}
                r={24}
                fill={fill}
                stroke={stroke}
                strokeWidth={3}
              />
              <text x={SLOT_POINTS[slotId].x} y={SLOT_POINTS[slotId].y - 3} className="orbmentNodeId">
                {slotId}
              </text>
              <text x={SLOT_POINTS[slotId].x} y={SLOT_POINTS[slotId].y + 11} className="orbmentNodeText">
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
