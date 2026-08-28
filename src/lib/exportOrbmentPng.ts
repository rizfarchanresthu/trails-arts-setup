type ExportLine = {
  color: string
  slots: { label: string | null; quartz: string | null; accent: string | null }[]
  totals: { element: string; value: number; color: string }[]
}

type ExportArt = { name: string; color: string }

type ExportOptions = {
  svg: SVGSVGElement
  title: string
  lines: ExportLine[]
  arts: ExportArt[]
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
const ROW_HEIGHT = 50
const LINE_GROUP_GAP = 28

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

function splitIntoColumns<T>(items: T[], columnCount: number): T[][] {
  const perColumn = Math.ceil(items.length / columnCount)
  return Array.from({ length: columnCount }, (_, index) =>
    items.slice(index * perColumn, (index + 1) * perColumn),
  )
}

export async function exportOrbmentPng({ svg, title, lines, arts, fileName }: ExportOptions): Promise<void> {
  const svgBlob = new Blob([buildStandaloneSvg(svg)], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const image = await loadImage(svgUrl)

    const contentTop = PADDING + TITLE_FONT_SIZE + 56
    const headerOffset = HEADER_FONT_SIZE + 32
    const baseContentHeight = BASE_CANVAS_HEIGHT - contentTop - PADDING

    const artColumnCount = Math.min(
      MAX_ART_COLUMNS,
      Math.max(1, Math.ceil((arts.length * ROW_HEIGHT) / Math.max(1, baseContentHeight - headerOffset))),
    )
    const artColumns = arts.length > 0 ? splitIntoColumns(arts, artColumnCount) : []
    const artsHeight =
      headerOffset + Math.max(0, ...artColumns.map((column) => column.length * ROW_HEIGHT))
    const linesHeight = headerOffset + measureLinesHeight(lines)

    const contentHeight = Math.max(baseContentHeight, artsHeight, linesHeight)
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

    ctx.fillStyle = TEXT_COLOR
    ctx.font = `700 ${HEADER_FONT_SIZE}px ${FONT_STACK}`
    ctx.fillText(`Available Arts (${arts.length})`, rightLeft, contentTop + HEADER_FONT_SIZE / 2)

    const artColumnWidth = (RIGHT_WIDTH - GUTTER * (artColumnCount - 1)) / artColumnCount
    ctx.font = `600 ${ROW_FONT_SIZE}px ${FONT_STACK}`
    artColumns.forEach((column, columnIndex) => {
      const columnLeft = rightLeft + columnIndex * (artColumnWidth + GUTTER)
      let artY = contentTop + headerOffset + ROW_HEIGHT / 2
      for (const art of column) {
        ctx.fillStyle = readableOnWhite(art.color)
        ctx.fillText(truncateToWidth(ctx, art.name, artColumnWidth), columnLeft, artY)
        artY += ROW_HEIGHT
      }
    })

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!pngBlob) throw new Error('Failed to encode PNG')
    triggerDownload(pngBlob, fileName)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}
