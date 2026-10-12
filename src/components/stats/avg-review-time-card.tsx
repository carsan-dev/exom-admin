import { Timer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatReviewCount, formatReviewDuration } from '@/lib/review-duration'

interface AvgReviewTimeCardProps {
  seconds: number | null | undefined
  reviewedInPeriod?: number | null
}

export function AvgReviewTimeCard({ seconds, reviewedInPeriod }: AvgReviewTimeCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Tiempo medio de revisión</CardTitle>
        <Timer className="h-4 w-4 text-status-info" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">{formatReviewDuration(seconds)}</p>
        {reviewedInPeriod !== undefined && reviewedInPeriod !== null && (
          <p className="mt-1 text-xs text-muted-foreground">{formatReviewCount(reviewedInPeriod)}</p>
        )}
      </CardContent>
    </Card>
  )
}
