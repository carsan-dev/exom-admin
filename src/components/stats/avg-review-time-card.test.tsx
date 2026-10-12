import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AvgReviewTimeCard } from './avg-review-time-card'

describe('AvgReviewTimeCard', () => {
  it.each([undefined, null])('omits the review count when the field is %s', (count) => {
    render(<AvgReviewTimeCard seconds={3600} reviewedInPeriod={count} />)
    expect(screen.queryByText(/revisi[oó]n/i, { selector: 'p.text-xs' })).not.toBeInTheDocument()
    expect(screen.queryByText(/^0 /)).not.toBeInTheDocument()
  })

  it('shows an explicit zero count', () => {
    render(<AvgReviewTimeCard seconds={null} reviewedInPeriod={0} />)
    expect(screen.getByText(/^0 revisiones/)).toBeInTheDocument()
  })
})
