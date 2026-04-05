import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { isApprovalPendingError } from './api-utils'

interface InvalidateAdminQueriesOptions {
  extraQueryKeys?: ReadonlyArray<QueryKey>
  includeApprovalQueries?: boolean
  includeDashboard?: boolean
}

const approvalQueryKey = ['approval-requests'] as const
const dashboardQueryKey = ['dashboard'] as const

export const approvalManagedResourceQueryKeys = [
  ['trainings'],
  ['diets'],
  ['exercises'],
  ['ingredients'],
  ['admin-challenges'],
  ['admin-achievements'],
  ['admin-notifications'],
] as const satisfies ReadonlyArray<QueryKey>

export async function invalidateAdminQueries(
  queryClient: QueryClient,
  options: InvalidateAdminQueriesOptions = {},
) {
  const queryKeys: QueryKey[] = []

  if (options.includeApprovalQueries) {
    queryKeys.push(approvalQueryKey)
  }

  if (options.includeDashboard) {
    queryKeys.push(dashboardQueryKey)
  }

  if (options.extraQueryKeys?.length) {
    queryKeys.push(...options.extraQueryKeys)
  }

  if (queryKeys.length === 0) {
    return
  }

  await Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

export async function invalidateAdminQueriesOnApprovalPending(
  queryClient: QueryClient,
  error: unknown,
  options: Omit<InvalidateAdminQueriesOptions, 'includeApprovalQueries'> = {},
) {
  if (!isApprovalPendingError(error)) {
    return
  }

  await invalidateAdminQueries(queryClient, {
    ...options,
    includeApprovalQueries: true,
  })
}
