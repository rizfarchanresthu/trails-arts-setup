import { useMemo, useState } from 'react'
import { ELEMENT_COLORS, type Art, type ElementName, type ElementTotals } from '../domain/types'

type ArtsListProps = {
  arts: Art[]
  lineTotals: ElementTotals[]
  elementOrderSource: Art[]
}

const CATEGORY_ORDER: Record<Art['category'], number> = {
  offensive: 0,
  support: 1,
}

export function ArtsList({ arts, lineTotals, elementOrderSource }: ArtsListProps) {
  const [selectedArt, setSelectedArt] = useState<Art | null>(null)

  const elementOrder = useMemo(() => {
    const order = new Map<ElementName, number>()
    for (const art of elementOrderSource) {
      if (!order.has(art.element)) {
        order.set(art.element, order.size)
      }
    }
    return order
  }, [elementOrderSource])

  const sortedArts = useMemo(() => {
    return [...arts].sort((left, right) => {
      const leftElementIndex = elementOrder.get(left.element) ?? Number.MAX_SAFE_INTEGER
      const rightElementIndex = elementOrder.get(right.element) ?? Number.MAX_SAFE_INTEGER

      if (leftElementIndex !== rightElementIndex) {
        return leftElementIndex - rightElementIndex
      }

      const leftCategoryIndex = CATEGORY_ORDER[left.category]
      const rightCategoryIndex = CATEGORY_ORDER[right.category]
      if (leftCategoryIndex !== rightCategoryIndex) {
        return leftCategoryIndex - rightCategoryIndex
      }

      return left.id - right.id
    })
  }, [arts, elementOrder])

  return (
    <section className="panel">
      <h2>Available Arts ({sortedArts.length})</h2>

      <div className="linePreview">
        <h3>Line Totals</h3>
        <ul>
          {lineTotals.map((totals, index) => (
            <li key={`totals-${index}`}>
              Line {index + 1}:{' '}
              {Object.entries(totals)
                .map(([element, value]) => `${element}:${value}`)
                .join(', ')}
            </li>
          ))}
        </ul>
      </div>

      <div className="artList">
        {sortedArts.map((art) => (
          <button
            key={art.id}
            type="button"
            className="artCard artButton"
            onClick={() => setSelectedArt(art)}
          >
            <span className="artNameCell">
              {art.image_url ? <img className="artIcon" src={art.image_url} alt="" loading="lazy" /> : null}
              <strong>{art.name.en}</strong>
            </span>
            <span className="elementBadge" style={{ color: ELEMENT_COLORS[art.element] }}>
              {art.element}
            </span>
            <span>{art.category}</span>
            <span>{art.cost}</span>
          </button>
        ))}
      </div>

      {selectedArt ? (
        <div className="modalBackdrop" role="presentation" onClick={() => setSelectedArt(null)}>
          <article className="modalCard" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <h3>{selectedArt.name.en}</h3>
              <button type="button" onClick={() => setSelectedArt(null)}>
                Close
              </button>
            </div>
            <p>Japanese: {selectedArt.name.ja}</p>
            <p>
              Element:{' '}
              <span className="elementBadge" style={{ color: ELEMENT_COLORS[selectedArt.element] }}>
                {selectedArt.element}
              </span>
            </p>
            <p>Category: {selectedArt.category}</p>
            <p>Cost: {selectedArt.cost}</p>
            <p>
              Time: Cast {selectedArt.time.cast}, Delay {selectedArt.time.delay}
            </p>
            <p>Power: {selectedArt.power ?? '-'}</p>
            <p>Target: {selectedArt.target}</p>
            <p>Effect: {selectedArt.effect ?? '-'}</p>
            <p>Description: {selectedArt.description}</p>
            <p>
              Requirement:{' '}
              {selectedArt.elemental_value.map((entry, index) => (
                <span key={`req-${selectedArt.id}-${index}`}>
                  {entry.element ? (
                    <>
                      <span className="elementBadge" style={{ color: ELEMENT_COLORS[entry.element] }}>
                        {entry.element}
                      </span>{' '}
                      {entry.value}
                    </>
                  ) : (
                    <>
                      {(entry.elements ?? []).map((element, elementIndex) => (
                        <span key={`req-element-${selectedArt.id}-${index}-${element}`} className="inlineElementGroup">
                          {elementIndex > 0 ? '/' : ''}
                          <span className="elementBadge" style={{ color: ELEMENT_COLORS[element] }}>
                            {element}
                          </span>
                        </span>
                      ))}{' '}
                      {entry.value}
                    </>
                  )}
                  {index < selectedArt.elemental_value.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          </article>
        </div>
      ) : null}
    </section>
  )
}
