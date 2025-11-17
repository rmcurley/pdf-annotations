import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface SectionCardsProps {
  card1Label?: string
  card1Value: number
  card2Label?: string
  card2Value: number
  totalPending: number
  totalAccepted: number
}

export function SectionCards({
  card1Label = "Total Projects",
  card1Value,
  card2Label = "Total Documents",
  card2Value,
  totalPending,
  totalAccepted,
}: SectionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="text-sm font-medium text-muted-foreground">
            {card1Label}
          </div>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {card1Value}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <div className="text-sm font-medium text-muted-foreground">
            {card2Label}
          </div>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {card2Value}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <div className="text-sm font-medium text-muted-foreground">
            Total Pending Annotations
          </div>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {totalPending}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <div className="text-sm font-medium text-muted-foreground">
            Total Accepted Annotations
          </div>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {totalAccepted}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}
