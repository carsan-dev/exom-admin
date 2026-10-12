import { expect, it } from 'vitest'
import { formatReviewCount, formatReviewDuration } from './review-duration'

it('formats durations and never renders 0 for null', () => {
  expect(formatReviewDuration(null)).toBe('—')
  expect(formatReviewDuration(undefined)).toBe('—')
  expect(formatReviewDuration(0)).toBe('< 1 min')
  expect(formatReviewDuration(59)).toBe('< 1 min')
  expect(formatReviewDuration(60)).toBe('1 min')
  expect(formatReviewDuration(18 * 60 + 30)).toBe('18 min')
  expect(formatReviewDuration(5 * 3600 + 12 * 60)).toBe('5 h 12 min')
  expect(formatReviewDuration(2 * 86400 + 4 * 3600 + 59 * 60)).toBe('2 d 4 h')
})

it('pluralises review counts', () => {
  expect(formatReviewCount(1)).toBe('1 revisión en el periodo')
  expect(formatReviewCount(0)).toBe('0 revisiones en el periodo')
  expect(formatReviewCount(7)).toBe('7 revisiones en el periodo')
})
