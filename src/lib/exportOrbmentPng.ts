type ExportLine = {
  color: string
  slots: { label: string | null; quartz: string | null; accent: string | null }[]
  totals: { element: string; value: number; color: string }[]
}

type ExportArt = { name: string; color: string }

type ExportListSection = {
  heading: string
  items: ExportArt[]
}

type ExportMasterQuartz = {
  role: string
  name: string
  level: number
  description: string
  effects: { title: string; detail: string }[]
}

type ExportOptions = {
  svg: SVGSVGElement
  title: string
  lines: ExportLine[]
  arts: ExportArt[]
  artsHeading?: string
  additionalLists?: ExportListSection[]
  masterQuartz?: ExportMasterQuartz[]
  fileName: string
}

const CANVAS_WIDTH = 3200
const BASE_CANVAS_HEIGHT = 1800
const PADDING = 96
const GUTTER = 64
const LEFT_WIDTH = 760
const RIGHT_WIDTH = 900
const MAX_ART_COLUMNS = 2

const SVG_VIEW_SIZE = 340
const BACKGROUND = '#ffffff'
const TEXT_COLOR = '#141922'
const MUTED_TEXT_COLOR = '#5b6474'
const FONT_STACK =
  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

const TITLE_FONT_SIZE = 72
const HEADER_FONT_SIZE = 44
const GROUP_BAR_HEIGHT = 8
const ROW_FONT_SIZE = 32
const TOTALS_FONT_SIZE = 28
const BODY_FONT_SIZE = 26
const BODY_LINE_HEIGHT = 36
const ROW_HEIGHT = 50
const LINE_GROUP_GAP = 28
const MQ_BLOCK_GAP = 36

const LIGHT_THEME_CSS = `
.orbmentHexGuide { fill: none; stroke: #d8deea; stroke-width: 1.5; stroke-dasharray: 5 4; }
.orbmentGapMarker { fill: #e7ebf3; stroke: #b7bfd0; stroke-width: 1.5; }
.orbmentRing { fill: none; stroke: #d8deea; stroke-width: 1.5; }
.orbmentEdge { opacity: 0.9; }
.orbmentNodeId { text-anchor: middle; dominant-baseline: middle; font-size: 10px; font-weight: 700; fill: #141922; font-family: ${FONT_STACK}; }
.orbmentNodeText { text-anchor: middle; dominant-baseline: middle; font-size: 9px; font-weight: 600; fill: #2d3646; font-family: ${FONT_STACK}; }
.orbmentNodeRectText { text-anchor: middle; dominant-baseline: middle; font-size: 8px; font-weight: 700; fill: #2d3646; font-family: ${FONT_STACK}; }
`

const SVG_NS = 'http://www.w3.org/2000/svg'

function buildStandaloneSvg(source: SVGSVGElement): string {
  const clone = source.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', SVG_NS)
  clone.setAttribute('width', String(SVG_VIEW_SIZE))
  clone.setAttribute('height', String(SVG_VIEW_SIZE))
  clone.setAttribute('viewBox', `0 0 ${SVG_VIEW_SIZE} ${SVG_VIEW_SIZE}`)
  clone.removeAttribute('class')

  // CSS variables resolve against the document, not a standalone SVG document.
  clone.querySelectorAll('[fill^="var("], [stroke^="var("]').forEach((element) => {
    if (element.getAttribute('fill')?.startsWith('var(')) element.setAttribute('fill', BACKGROUND)
    if (element.getAttribute('stroke')?.startsWith('var(')) element.setAttribute('stroke', '#8f96a3')
  })

  const style = document.createElementNS(SVG_NS, 'style')
  style.textContent = LIGHT_THEME_CSS
  const background = document.createElementNS(SVG_NS, 'rect')
  background.setAttribute('width', String(SVG_VIEW_SIZE))
  background.setAttribute('height', String(SVG_VIEW_SIZE))
  background.setAttribute('fill', BACKGROUND)

  clone.insertBefore(background, clone.firstChild)
  clone.insertBefore(style, clone.firstChild)

  return new XMLSerializer().serializeToString(clone)
}

/** Darkens colors that would be unreadable as text on a white background. */
function readableOnWhite(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return hex
  const value = parseInt(match[1], 16)
  const rgb = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255
  if (luminance <= 0.55) return hex
  const scale = 0.55 / luminance
  return `#${rgb.map((channel) => Math.round(channel * scale).toString(16).padStart(2, '0')).join('')}`
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to render orbment SVG'))
    image.src = url
  })
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (truncated.length > 1 && ctx.measureText(`${truncated}...`).width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated}...`
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const lines: string[] = []
  let current = words[0]
  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${current} ${words[index]}`
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = words[index]
    }
  }
  lines.push(current)
  return lines
}

function measureLinesHeight(lines: ExportLine[]): number {
  return lines.reduce(
    (total, line) =>
      total +
      ROW_HEIGHT +
      line.slots.length * ROW_HEIGHT +
      (line.totals.length > 0 ? ROW_HEIGHT : 0) +
      LINE_GROUP_GAP,
    0,
  )
}

function measureMasterQuartzHeight(
  ctx: CanvasRenderingContext2D,
  masterQuartz: ExportMasterQuartz[],
  maxWidth: number,
): number {
  if (masterQuartz.length === 0) return 0
  let height = HEADER_FONT_SIZE + 32
  ctx.font = `500 ${BODY_FONT_SIZE}px ${FONT_STACK}`
  for (const entry of masterQuartz) {
    height += ROW_HEIGHT
    height += wrapText(ctx, entry.description, maxWidth).length * BODY_LINE_HEIGHT
    for (const effect of entry.effects) {
      const text = effect.detail ? `${effect.title}: ${effect.detail}` : effect.title
      height += wrapText(ctx, `• ${text}`, maxWidth).length * BODY_LINE_HEIGHT
    }
    height += MQ_BLOCK_GAP
  }
  return height
}

function splitIntoColumns<T>(items: T[], columnCount: number): T[][] {
  const perColumn = Math.ceil(items.length / columnCount)
  return Array.from({ length: columnCount }, (_, index) =>
    items.slice(index * perColumn, (index + 1) * perColumn),
  )
}

function measureListSectionHeight(itemCount: number, availableHeight: number, headerOffset: number): {
  columnCount: number
  height: number
} {
  const columnCount = Math.min(
    MAX_ART_COLUMNS,
    Math.max(1, Math.ceil((itemCount * ROW_HEIGHT) / Math.max(1, availableHeight - headerOffset))),
  )
  const rowsPerColumn = itemCount > 0 ? Math.ceil(itemCount / columnCount) : 0
  return {
    columnCount,
    height: headerOffset + rowsPerColumn * ROW_HEIGHT,
  }
}

function drawListSection(
  ctx: CanvasRenderingContext2D,
  section: ExportListSection,
  left: number,
  top: number,
  headerOffset: number,
  columnCount: number,
): number {
  ctx.fillStyle = TEXT_COLOR
  ctx.font = `700 ${HEADER_FONT_SIZE}px ${FONT_STACK}`
  ctx.fillText(`${section.heading} (${section.items.length})`, left, top + HEADER_FONT_SIZE / 2)

  const columnWidth = (RIGHT_WIDTH - GUTTER * (columnCount - 1)) / columnCount
  const columns = section.items.length > 0 ? splitIntoColumns(section.items, columnCount) : []
  ctx.font = `600 ${ROW_FONT_SIZE}px ${FONT_STACK}`
  let maxColumnBottom = top + headerOffset
  columns.forEach((column, columnIndex) => {
    const columnLeft = left + columnIndex * (columnWidth + GUTTER)
    let itemY = top + headerOffset + ROW_HEIGHT / 2
    for (const item of column) {
      ctx.fillStyle = readableOnWhite(item.color)
      ctx.fillText(truncateToWidth(ctx, item.name, columnWidth), columnLeft, itemY)
      itemY += ROW_HEIGHT
    }
    maxColumnBottom = Math.max(maxColumnBottom, itemY - ROW_HEIGHT / 2)
  })
  return maxColumnBottom
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  fillStyle: string,
): number {
  ctx.fillStyle = fillStyle
  const wrapped = wrapText(ctx, text, maxWidth)
  for (const line of wrapped) {
    ctx.fillText(line, x, y)
    y += lineHeight
  }
  return y
}

export async function exportOrbmentPng({
  svg,
  title,
  lines,
  arts,
  artsHeading = 'Available Arts',
  additionalLists = [],
  masterQuartz = [],
  fileName,
}: ExportOptions): Promise<void> {
  const svgBlob = new Blob([buildStandaloneSvg(svg)], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const image = await loadImage(svgUrl)

    const contentTop = PADDING + TITLE_FONT_SIZE + 56
    const headerOffset = HEADER_FONT_SIZE + 32
    const sectionGap = LINE_GROUP_GAP
    const baseContentHeight = BASE_CANVAS_HEIGHT - contentTop - PADDING
    const mqTextWidth = LEFT_WIDTH - 16

    const measureCtx = document.createElement('canvas').getContext('2d')
    if (!measureCtx) throw new Error('Canvas 2D context unavailable')

    const rightSections: ExportListSection[] = [{ heading: artsHeading, items: arts }, ...additionalLists]
    const sectionLayouts = rightSections.map((section) =>
      measureListSectionHeight(section.items.length, baseContentHeight, headerOffset),
    )
    const rightHeight = sectionLayouts.reduce(
      (total, layout, index) => total + layout.height + (index > 0 ? sectionGap : 0),
      0,
    )
    const linesHeight = headerOffset + measureLinesHeight(lines)
    const masterHeight = measureMasterQuartzHeight(measureCtx, masterQuartz, mqTextWidth)
    const leftHeight = linesHeight + (masterHeight > 0 ? LINE_GROUP_GAP + masterHeight : 0)

    const contentHeight = Math.max(baseContentHeight, rightHeight, leftHeight)
    const canvasHeight = contentTop + contentHeight + PADDING

    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_WIDTH
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')

    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight)

    ctx.fillStyle = TEXT_COLOR
    ctx.font = `700 ${TITLE_FONT_SIZE}px ${FONT_STACK}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(title, CANVAS_WIDTH / 2, PADDING + TITLE_FONT_SIZE)

    const leftLeft = PADDING
    const rightLeft = CANVAS_WIDTH - PADDING - RIGHT_WIDTH
    const centerLeft = leftLeft + LEFT_WIDTH + GUTTER
    const centerWidth = rightLeft - GUTTER - centerLeft

    const graphSize = Math.min(centerWidth, contentHeight)
    ctx.drawImage(
      image,
      centerLeft + (centerWidth - graphSize) / 2,
      contentTop + (contentHeight - graphSize) / 2,
      graphSize,
      graphSize,
    )

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'

    ctx.fillStyle = TEXT_COLOR
    ctx.font = `700 ${HEADER_FONT_SIZE}px ${FONT_STACK}`
    ctx.fillText('Setup', leftLeft, contentTop + HEADER_FONT_SIZE / 2)

    let cursorY = contentTop + headerOffset + ROW_HEIGHT / 2
    for (const line of lines) {
      ctx.fillStyle = line.color
      ctx.fillRect(leftLeft, cursorY - GROUP_BAR_HEIGHT / 2, LEFT_WIDTH, GROUP_BAR_HEIGHT)
      cursorY += ROW_HEIGHT

      ctx.font = `500 ${ROW_FONT_SIZE}px ${FONT_STACK}`
      for (const slot of line.slots) {
        const accent = slot.accent ? readableOnWhite(slot.accent) : null
        const name = slot.quartz ?? '—'
        const text = slot.label ? `${slot.label}: ${name}` : name
        ctx.fillStyle = accent ?? MUTED_TEXT_COLOR
        ctx.fillText('•', leftLeft + 8, cursorY)
        ctx.fillStyle = accent ?? (slot.quartz ? TEXT_COLOR : MUTED_TEXT_COLOR)
        ctx.fillText(truncateToWidth(ctx, text, LEFT_WIDTH - 48), leftLeft + 48, cursorY)
        cursorY += ROW_HEIGHT
      }

      if (line.totals.length > 0) {
        let totalsX = leftLeft + 48
        ctx.font = `700 ${TOTALS_FONT_SIZE}px ${FONT_STACK}`
        for (const total of line.totals) {
          const text = `${total.element} ${total.value}`
          const width = ctx.measureText(text).width
          if (totalsX + width > leftLeft + LEFT_WIDTH) break
          ctx.fillStyle = readableOnWhite(total.color)
          ctx.fillText(text, totalsX, cursorY)
          totalsX += width + 24
        }
        cursorY += ROW_HEIGHT
      }

      cursorY += LINE_GROUP_GAP
    }

    if (masterQuartz.length > 0) {
      cursorY += LINE_GROUP_GAP
      ctx.fillStyle = TEXT_COLOR
      ctx.font = `700 ${HEADER_FONT_SIZE}px ${FONT_STACK}`
      ctx.fillText('Master Quartz', leftLeft, cursorY)
      cursorY += headerOffset

      for (const entry of masterQuartz) {
        ctx.fillStyle = TEXT_COLOR
        ctx.font = `700 ${ROW_FONT_SIZE}px ${FONT_STACK}`
        ctx.fillText(
          truncateToWidth(ctx, `${entry.role}: ${entry.name} (L${entry.level})`, LEFT_WIDTH),
          leftLeft,
          cursorY,
        )
        cursorY += ROW_HEIGHT

        ctx.font = `500 ${BODY_FONT_SIZE}px ${FONT_STACK}`
        cursorY = drawWrappedText(
          ctx,
          entry.description,
          leftLeft + 8,
          cursorY,
          mqTextWidth,
          BODY_LINE_HEIGHT,
          MUTED_TEXT_COLOR,
        )

        for (const effect of entry.effects) {
          const text = effect.detail ? `${effect.title}: ${effect.detail}` : effect.title
          cursorY = drawWrappedText(
            ctx,
            `• ${text}`,
            leftLeft + 8,
            cursorY,
            mqTextWidth,
            BODY_LINE_HEIGHT,
            TEXT_COLOR,
          )
        }

        cursorY += MQ_BLOCK_GAP
      }
    }

    let rightTop = contentTop
    rightSections.forEach((section, index) => {
      const layout = sectionLayouts[index]
      drawListSection(ctx, section, rightLeft, rightTop, headerOffset, layout.columnCount)
      rightTop += layout.height + sectionGap
    })

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!pngBlob) throw new Error('Failed to encode PNG')
    triggerDownload(pngBlob, fileName)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}
