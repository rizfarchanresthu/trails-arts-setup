import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
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
    <Card className="panel">
      <CardHeader className="px-0 pb-0">
        <CardTitle className="text-xl">Available Arts ({sortedArts.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
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
            <Button
              key={art.id}
              type="button"
              variant="outline"
              className="artCard artButton h-auto whitespace-normal"
              onClick={() => setSelectedArt(art)}
            >
              <span className="artNameCell">
                {art.image_url ? <img className="artIcon" src={art.image_url} alt="" loading="lazy" /> : null}
                <strong>{art.name.en}</strong>
              </span>
              <Badge variant="outline" className="elementBadge" style={{ color: ELEMENT_COLORS[art.element] }}>
                {art.element}
              </Badge>
              <span>{art.category}</span>
              <span>{art.cost}</span>
            </Button>
          ))}
        </div>
      </CardContent>

      <Dialog open={selectedArt != null} onOpenChange={(open) => !open && setSelectedArt(null)}>
        <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-lg" showCloseButton>
          {selectedArt ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedArt.name.en}</DialogTitle>
                <DialogDescription>Japanese: {selectedArt.name.ja}</DialogDescription>
              </DialogHeader>
              <Separator />
              <p>
                Element:{' '}
                <Badge variant="outline" className="elementBadge" style={{ color: ELEMENT_COLORS[selectedArt.element] }}>
                  {selectedArt.element}
                </Badge>
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
                        <Badge
                          variant="outline"
                          className="elementBadge"
                          style={{ color: ELEMENT_COLORS[entry.element] }}
                        >
                          {entry.element}
                        </Badge>{' '}
                        {entry.value}
                      </>
                    ) : (
                      <>
                        {(entry.elements ?? []).map((element, elementIndex) => (
                          <span key={`req-element-${selectedArt.id}-${index}-${element}`} className="inlineElementGroup">
                            {elementIndex > 0 ? '/' : ''}
                            <Badge variant="outline" className="elementBadge" style={{ color: ELEMENT_COLORS[element] }}>
                              {element}
                            </Badge>
                          </span>
                        ))}{' '}
                        {entry.value}
                      </>
                    )}
                    {index < selectedArt.elemental_value.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
