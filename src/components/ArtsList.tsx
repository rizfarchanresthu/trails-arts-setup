import { useMemo, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { ScrollArea } from '@/components/ui/scroll-area'
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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Available Arts ({sortedArts.length})</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <h3 className="text-sm font-medium">Line Totals</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
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

        <Separator />

        {sortedArts.length === 0 ? (
          <Alert>
            <AlertDescription>No arts unlocked for the current orbment setup.</AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className="h-[min(70vh,40rem)]">
            <div className="grid gap-2 pr-3">
              {sortedArts.map((art) => (
                <Button
                  key={art.id}
                  type="button"
                  variant="outline"
                  className="artCard h-auto justify-stretch whitespace-normal px-3 py-2 text-left"
                  onClick={() => setSelectedArt(art)}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    {art.image_url ? (
                      <img className="size-4 shrink-0 object-contain" src={art.image_url} alt="" loading="lazy" />
                    ) : null}
                    <strong className="truncate">{art.name.en}</strong>
                  </span>
                  <Badge variant="outline" style={{ color: ELEMENT_COLORS[art.element] }}>
                    {art.element}
                  </Badge>
                  <span className="text-muted-foreground">{art.category}</span>
                  <span className="text-muted-foreground">{art.cost}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
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
              <div className="grid gap-2 text-sm">
                <p>
                  Element:{' '}
                  <Badge variant="outline" style={{ color: ELEMENT_COLORS[selectedArt.element] }}>
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
                          <Badge variant="outline" style={{ color: ELEMENT_COLORS[entry.element] }}>
                            {entry.element}
                          </Badge>{' '}
                          {entry.value}
                        </>
                      ) : (
                        <>
                          {(entry.elements ?? []).map((element, elementIndex) => (
                            <span key={`req-element-${selectedArt.id}-${index}-${element}`}>
                              {elementIndex > 0 ? '/' : ''}
                              <Badge variant="outline" style={{ color: ELEMENT_COLORS[element] }}>
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
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
