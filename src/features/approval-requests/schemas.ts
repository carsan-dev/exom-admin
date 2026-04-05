import { z } from 'zod'

export const resolveApprovalRequestSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    rejection_reason: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.action === 'reject') {
      const reason = values.rejection_reason?.trim() ?? ''

      if (reason.length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rejection_reason'],
          message: 'El motivo debe tener al menos 10 caracteres',
        })
      }
    }
  })

export const requestReasonSchema = z.object({
  request_reason: z.string().trim().min(10, 'El motivo debe tener al menos 10 caracteres').max(500, 'El motivo no puede superar los 500 caracteres'),
})
