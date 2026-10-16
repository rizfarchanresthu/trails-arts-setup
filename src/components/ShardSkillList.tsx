import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  ELEMENT_COLORS,
  XIPHA_LINE_LABELS,
  XIPHA_LINE_TYPES,
  getArtElements,
  type ElementName,
  type ShardSkill,
} from '../domain/types'
import { type XiphaLineTotals } from '../domain/xiphaEvaluator'

type ShardSkillListProps = {
  shardSkills: ShardSkill[]
  lineTotals: XiphaLineTotals
}

export function ShardSkillList({ shardSkills, lineTotals }: ShardSkillListProps) {
  const [selectedSkill, setSelectedSkill] = useState<ShardSkill | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Shard Skills ({shardSkills.length})</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <h3 className="text-sm font-medium">Line Totals</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {XIPHA_LINE_TYPES.map((lineType) => (
              <li key={`totals-${lineType}`}>
                {XIPHA_LINE_LABELS[lineType]}:{' '}
                {Object.entries(lineTotals[lineType])
                  .map(([element, value]) => `${element}:${value}`)
                  .join(', ')}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {shardSkills.length === 0 ? (
          <Alert>
            <AlertDescription>No Shard Skills active for the current Xipha setup.</AlertDescription>
          </Alert>
        ) : (
          XIPHA_LINE_TYPES.map((lineType) => {
            const skills = shardSkills.filter((skill) => skill.line_type === lineType)
            if (skills.length === 0) {
              return null
            }
            return (
              <div className="grid gap-2" key={`skills-${lineType}`}>
                <h3 className="text-sm font-medium">{XIPHA_LINE_LABELS[lineType]}</h3>
                {skills.map((skill) => (
                  <Button
                    key={skill.id}
                    type="button"
                    variant="outline"
                    className="artCard h-auto justify-stretch whitespace-normal px-3 py-2 text-left"
                    onClick={() => setSelectedSkill(skill)}
                  >
                    <strong className="truncate">{skill.name.en}</strong>
                    <ElementBadges elements={getArtElements(skill)} />
                    <span className="text-muted-foreground">{skill.effect}</span>
                  </Button>
                ))}
              </div>
            )
          })
        )}
      </CardContent>

      <Dialog open={selectedSkill != null} onOpenChange={(open) => !open && setSelectedSkill(null)}>
        <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-lg" showCloseButton>
          {selectedSkill ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSkill.name.en}</DialogTitle>
                <DialogDescription>Japanese: {selectedSkill.name.ja}</DialogDescription>
              </DialogHeader>
              <Separator />
              <div className="grid gap-2 text-sm">
                <p>Line: {XIPHA_LINE_LABELS[selectedSkill.line_type]}</p>
                <p>
                  Element: <ElementBadges elements={getArtElements(selectedSkill)} />
                </p>
                <p>Effect: {selectedSkill.effect || '-'}</p>
                <p>Description: {selectedSkill.description || '-'}</p>
                <p>
                  Requirement:{' '}
                  {selectedSkill.elemental_value
                    .map((entry) => `${entry.element ?? (entry.elements ?? []).join('/')} ${entry.value}`)
                    .join(', ')}
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ElementBadges({ elements }: { elements: ElementName[] }) {
  return (
    <span className="artCardElements">
      {elements.map((element) => (
        <Badge key={element} variant="outline" style={{ backgroundColor: ELEMENT_COLORS[element], color: 'white' }}>
          {element}
        </Badge>
      ))}
    </span>
  )
}
