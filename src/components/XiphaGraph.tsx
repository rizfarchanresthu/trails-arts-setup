import { Download } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { exportOrbmentPng } from '@/lib/exportOrbmentPng'
import {
  ELEMENT_COLORS,
  LINE_COLORS,
  XIPHA_LINE_LABELS,
  XIPHA_LINE_TYPES,
  formatXiphaSlotLabel,
  getArtElements,
  getXiphaLineSlotIds,
  type ArtsDriver,
  type ArtsPlugin,
  type ElementName,
  type HoloCore,
  type Quartz,
  type ShardSkill,
  type SlotId,
  type XiphaLineType,
} from '../domain/types'
import { type XiphaLineTotals } from '../domain/xiphaEvaluator'
import { type OrbmentState } from '../state/orbmentState'
import {
  getCumulativeArtsDriverArts,
  getHoloCoreLevelData,
  getXiphaState,
  isXiphaSlotActive,
} from '../state/xiphaState'

type Point = { x: number; y: number }

type XiphaGraphProps = {
  title: string
  state: OrbmentState
  quartzById: Map<number, Quartz>
  holoCore: HoloCore | null
  artsDriver: ArtsDriver | null
  artsPlugins: ArtsPlugin[]
  lineTotals: XiphaLineTotals
  activeShardSkills: ShardSkill[]
}

const EXPORT_MUTED_COLOR = '#5b6474'

const HOLO_CORE_CENTER: Point = { x: 70, y: 170 }
const HOLO_CORE_RADIUS = 26
const ARTS_DRIVER_CENTER: Point = { x: 282, y: 170 }
const ARTS_DRIVER_RADIUS = 24
const DIAMOND_RADIUS = 12
const LINE_STEP = { x: 24, y: 22 }
const NAME_OFFSET = 15
const LABEL_DISTANCE = 1.4
const DEVICE_LINK_COLOR = '#8f96a3'

const LINE_LAYOUT: Record<XiphaLineType, { start: Point; ySign: 1 | -1 }> = {
  weapon: { start: { x: 104, y: 108 }, ySign: -1 },
  shield: { start: { x: 134, y: 146 }, ySign: -1 },
  drive: { start: { x: 134, y: 194 }, ySign: 1 },
  extra: { start: { x: 104, y: 232 }, ySign: 1 },
}

export function XiphaGraph({
  title,
  state,
  quartzById,
  holoCore,
  artsDriver,
  artsPlugins,
  lineTotals,
  activeShardSkills,
}: XiphaGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const xipha = getXiphaState(state)

  const equippedQuartz = (slotId: SlotId): Quartz | null => {
    const quartzId = state.equippedQuartz[slotId]
    return quartzId ? (quartzById.get(quartzId) ?? null) : null
  }

  const handleExport = () => {
    if (!svgRef.current) return
    const lines = XIPHA_LINE_TYPES.map((lineType, index) => ({
      color: lineColor(index),
      slots: getXiphaLineSlotIds(lineType)
        .filter((slotId) => isXiphaSlotActive(xipha, slotId))
        .map((slotId) => {
          const restriction = state.slotRestrictions[slotId]
          return {
            label: formatXiphaSlotLabel(slotId),
            quartz: equippedQuartz(slotId)?.name.en ?? null,
            accent: restriction ? ELEMENT_COLORS[restriction] : null,
          }
        }),
      totals: Object.entries(lineTotals[lineType])
        .filter(([, value]) => value > 0)
        .map(([element, value]) => ({ element, value, color: ELEMENT_COLORS[element as ElementName] })),
    }))
    lines.push({
      color: DEVICE_LINK_COLOR,
      slots: [
        {
          label: holoCore ? `Holo Core (L${xipha.holoCoreLevel})` : 'Holo Core',
          quartz: holoCore?.name.en ?? null,
          accent: null,
        },
        {
          label: artsDriver ? `Arts Driver (L${xipha.artsDriverLevel})` : 'Arts Driver',
          quartz: artsDriver?.name.en ?? null,
          accent: null,
        },
      ],
      totals: [],
    })

    const equippedPlugins = xipha.artsPluginIds
      .map((pluginId) => (pluginId == null ? null : (artsPlugins.find((entry) => entry.id === pluginId) ?? null)))
      .filter((plugin): plugin is ArtsPlugin => plugin != null)
    const pluginByArtName = new Map(artsPlugins.map((plugin) => [plugin.name.en, plugin]))
    const availableArts = artsDriver
      ? getCumulativeArtsDriverArts(artsDriver, xipha.artsDriverLevel, equippedPlugins)
      : []
    const additionalLists: Array<{ heading: string; items: Array<{ name: string; color: string }> }> = []
    if (availableArts.length > 0) {
      additionalLists.push({
        heading: 'Available Arts',
        items: availableArts.map((art) => {
          const plugin = pluginByArtName.get(art)
          return {
            name: art,
            color: plugin ? ELEMENT_COLORS[plugin.element] : EXPORT_MUTED_COLOR,
          }
        }),
      })
    }

    const holoCoreLevelData = getHoloCoreLevelData(holoCore, xipha.holoCoreLevel)
    if (holoCore && holoCoreLevelData) {
      const holoItems: Array<{ name: string; color: string }> = []
      for (const effect of holoCoreLevelData.effects) {
        holoItems.push({
          name: effect.detail ? `${effect.title}: ${effect.detail}` : effect.title,
          color: EXPORT_MUTED_COLOR,
        })
      }
      const hasBoost =
        Boolean(holoCore.s_boost_ability) || holoCoreLevelData.boost_effects.length > 0
      if (hasBoost) {
        holoItems.push({ name: 'When Boosted', color: EXPORT_MUTED_COLOR })
        if (holoCore.s_boost_ability) {
          holoItems.push({
            name: `S-Boost Ability: ${holoCore.s_boost_ability}`,
            color: EXPORT_MUTED_COLOR,
          })
        }
        for (const effect of holoCoreLevelData.boost_effects) {
          holoItems.push({
            name: effect.detail ? `${effect.title}: ${effect.detail}` : effect.title,
            color: EXPORT_MUTED_COLOR,
          })
        }
      }
      if (holoItems.length > 0) {
        additionalLists.push({ heading: 'Holo Core', items: holoItems })
      }
    }

    void exportOrbmentPng({
      svg: svgRef.current,
      title,
      lines,
      arts: activeShardSkills.map((skill) => ({
        name: skill.name.en,
        color: ELEMENT_COLORS[getArtElements(skill)[0]],
      })),
      artsHeading: 'Shard Skills',
      additionalLists,
      fileName: `orbment-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`,
    })
  }

  return (
    <section className="orbmentPanel">
      <h3>{title}</h3>
      <svg ref={svgRef} viewBox="0 0 340 340" className="orbmentSvg" aria-label={`${title} graph`}>
        <line
          x1={HOLO_CORE_CENTER.x + HOLO_CORE_RADIUS}
          y1={HOLO_CORE_CENTER.y}
          x2={ARTS_DRIVER_CENTER.x - ARTS_DRIVER_RADIUS}
          y2={ARTS_DRIVER_CENTER.y}
          className="orbmentHexGuide"
        />

        {XIPHA_LINE_TYPES.map((lineType, lineIndex) => {
          const slotIds = getXiphaLineSlotIds(lineType)
          const points = slotIds.map((_, index) => getSlotPoint(lineType, index))
          const color = lineColor(lineIndex)
          const segments: Array<{ from: Point; to: Point; fromRadius: number; active: boolean }> = [
            { from: HOLO_CORE_CENTER, to: points[0], fromRadius: HOLO_CORE_RADIUS, active: true },
            ...points.slice(1).map((point, index) => ({
              from: points[index],
              to: point,
              fromRadius: DIAMOND_RADIUS,
              active: isXiphaSlotActive(xipha, slotIds[index + 1]),
            })),
          ]
          const labelPoint = getSlotPoint(lineType, slotIds.length - 1 + LABEL_DISTANCE)
          const labelAngle = (Math.atan2(LINE_LAYOUT[lineType].ySign * LINE_STEP.y, LINE_STEP.x) * 180) / Math.PI

          return (
            <g key={`line-${lineType}`}>
              {segments.map((segment, index) => {
                const start = moveToward(segment.from, segment.to, segment.fromRadius)
                const end = moveToward(segment.to, segment.from, DIAMOND_RADIUS)
                return (
                  <line
                    key={`segment-${lineType}-${index}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={segment.active ? color : DEVICE_LINK_COLOR}
                    strokeWidth={segment.active ? 4 : 2}
                    strokeDasharray={segment.active ? undefined : '3 3'}
                    strokeLinecap="round"
                    opacity={segment.active ? 0.9 : 0.5}
                  />
                )
              })}

              {slotIds.map((slotId, index) => {
                const point = points[index]
                const active = isXiphaSlotActive(xipha, slotId)
                const quartz = active ? equippedQuartz(slotId) : null
                const restriction = active ? state.slotRestrictions[slotId] : null
                const quartzColor = quartz && !Array.isArray(quartz.element) ? ELEMENT_COLORS[quartz.element] : null
                const fill = quartzColor ?? (restriction ? withAlpha(ELEMENT_COLORS[restriction], 0.24) : 'var(--card)')
                const stroke = restriction ? ELEMENT_COLORS[restriction] : '#8f96a3'
                const namePoint = getNamePoint(lineType, point)

                return (
                  <g key={`slot-${slotId}`} opacity={active ? 1 : 0.4}>
                    {restriction ? (
                      <polygon
                        points={diamondPoints(point, DIAMOND_RADIUS + 4)}
                        fill="none"
                        stroke={ELEMENT_COLORS[restriction]}
                        strokeWidth={1.5}
                      />
                    ) : null}
                    <polygon
                      points={diamondPoints(point)}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={restriction ? 3 : 2}
                      strokeDasharray={active ? undefined : '3 2'}
                    />
                    <text
                      x={point.x}
                      y={point.y + 0.5}
                      className="orbmentNodeRectText"
                      style={{ fontSize: 7, fill: quartzColor ? '#ffffff' : undefined }}
                    >
                      {formatXiphaSlotLabel(slotId)}
                    </text>
                    {quartz ? (
                      <text
                        x={namePoint.x}
                        y={namePoint.y}
                        className="orbmentNodeText"
                        style={{ fontSize: 7, textAnchor: 'end' }}
                      >
                        {shortName(quartz.name.en)}
                      </text>
                    ) : null}
                  </g>
                )
              })}

              <text
                x={labelPoint.x}
                y={labelPoint.y}
                className="orbmentNodeId"
                style={{ fontSize: 8, letterSpacing: 1 }}
                transform={`rotate(${labelAngle} ${labelPoint.x} ${labelPoint.y})`}
              >
                {XIPHA_LINE_LABELS[lineType].toUpperCase()}
              </text>
            </g>
          )
        })}

        <circle
          cx={HOLO_CORE_CENTER.x}
          cy={HOLO_CORE_CENTER.y}
          r={HOLO_CORE_RADIUS}
          fill="var(--card)"
          stroke="#8f96a3"
          strokeWidth={3}
        />
        <circle
          cx={HOLO_CORE_CENTER.x}
          cy={HOLO_CORE_CENTER.y}
          r={HOLO_CORE_RADIUS - 7}
          fill="none"
          stroke="#8f96a3"
          strokeWidth={1}
        />
        <text x={HOLO_CORE_CENTER.x} y={HOLO_CORE_CENTER.y - 6} className="orbmentNodeRectText">
          {holoCore ? `Holo L${xipha.holoCoreLevel}` : 'Holo Core'}
        </text>
        <text x={HOLO_CORE_CENTER.x} y={HOLO_CORE_CENTER.y + 7} className="orbmentNodeRectText" style={{ fontSize: 7 }}>
          {shortName(holoCore?.name.en)}
        </text>

        <circle
          cx={ARTS_DRIVER_CENTER.x}
          cy={ARTS_DRIVER_CENTER.y}
          r={ARTS_DRIVER_RADIUS}
          fill="var(--card)"
          stroke="#8f96a3"
          strokeWidth={3}
        />
        <text x={ARTS_DRIVER_CENTER.x} y={ARTS_DRIVER_CENTER.y - 6} className="orbmentNodeRectText">
          {artsDriver ? `Driver L${xipha.artsDriverLevel}` : 'Driver'}
        </text>
        <text
          x={ARTS_DRIVER_CENTER.x}
          y={ARTS_DRIVER_CENTER.y + 7}
          className="orbmentNodeRectText"
          style={{ fontSize: 7 }}
        >
          {shortName(artsDriver?.name.en)}
        </text>
      </svg>

      <div className="lineLegend">
        {XIPHA_LINE_TYPES.map((lineType, index) => (
          <span key={`line-legend-${lineType}`} className="legendItem">
            <span className="legendSwatch" style={{ backgroundColor: lineColor(index) }} />
            {XIPHA_LINE_LABELS[lineType]}: {xipha.lineSlotCounts[lineType]} slots
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

function getSlotPoint(lineType: XiphaLineType, index: number): Point {
  const { start, ySign } = LINE_LAYOUT[lineType]
  const zigzag = index % 2 === 1 ? 3 : 0
  return {
    x: start.x + LINE_STEP.x * index + zigzag,
    y: start.y + ySign * (LINE_STEP.y * index - zigzag),
  }
}

/** Quartz names sit on the side of the line facing away from the Arts Driver axis. */
function getNamePoint(lineType: XiphaLineType, point: Point): Point {
  const { ySign } = LINE_LAYOUT[lineType]
  const length = Math.hypot(LINE_STEP.x, LINE_STEP.y)
  return {
    x: point.x - (LINE_STEP.y / length) * NAME_OFFSET,
    y: point.y + ySign * (LINE_STEP.x / length) * NAME_OFFSET + 2,
  }
}

function diamondPoints(point: Point, radius = DIAMOND_RADIUS): string {
  return [
    `${point.x},${point.y - radius}`,
    `${point.x + radius},${point.y}`,
    `${point.x},${point.y + radius}`,
    `${point.x - radius},${point.y}`,
  ].join(' ')
}

function moveToward(origin: Point, target: Point, distance: number): Point {
  const dx = target.x - origin.x
  const dy = target.y - origin.y
  const length = Math.hypot(dx, dy)
  if (length === 0) {
    return origin
  }
  return { x: origin.x + (dx / length) * distance, y: origin.y + (dy / length) * distance }
}

function lineColor(lineIndex: number): string {
  return LINE_COLORS[lineIndex % LINE_COLORS.length]
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
