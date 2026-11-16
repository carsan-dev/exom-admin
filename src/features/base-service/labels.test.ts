import { describe, expect, it } from 'vitest'
import { buildUpdatePayload } from './build-update-payload'
import {
  AMBIGUOUS_WARNING,
  canResendDelivery,
  getAmbiguityWarning,
  getGoalLabel,
  getResendMessage,
  getSendFailureExplanation,
  getSendFailureKind,
  type SendFailureKind,
} from './labels'
import { makeDelivery, makeSubscriber } from './test-support'

describe('getGoalLabel', () => {
  it.each([
    ['perder-grasa', 'Perder grasa'],
    ['ganar-musculo', 'Ganar músculo'],
    ['ganar-musculo-y-perder-grasa', 'Ganar músculo y perder grasa'],
    ['ganar-fuerza', 'Ganar fuerza'],
    ['ponerte-en-forma', 'Ponerte en forma'],
  ])('maps %s', (key, label) => {
    expect(getGoalLabel(key)).toBe(label)
  })

  it('prettifies unknown keys', () => {
    expect(getGoalLabel('resistencia-extrema')).toBe('Resistencia extrema')
  })
})

/** One list mirroring the "Send error codes" table of the API contract (r4, 30 codes): code -> why-group. */
const CONTRACT_SEND_ERRORS: [string, SendFailureKind][] = [
  ['SUBSCRIBER_ARCHIVED', 'archived'],
  ['EMAIL_REQUEST_REJECTED', 'rejected'],
  ['EMAIL_PROVIDER_REJECTED', 'ops'],
  ['EMAIL_PROVIDER_AUTH_REJECTED', 'ops'],
  ['EMAIL_PROVIDER_NOT_CONFIGURED', 'ops'],
  ['EMAIL_PROVIDER_UNAVAILABLE', 'unclear'],
  ['EMAIL_PROVIDER_RATE_LIMITED', 'unclear'],
  ['EMAIL_PROVIDER_UNREACHABLE', 'unclear'],
  ['EMAIL_ACCEPTANCE_MISSING', 'unclear'],
  ['EMAIL_IDEMPOTENCY_IN_PROGRESS', 'unclear'],
  ['EMAIL_DEDUP_WINDOW_EXPIRED', 'unclear'],
  ['EMAIL_IDEMPOTENCY_CONFLICT', 'unclear'],
  ['ATTEMPT_FAILED_OR_AMBIGUOUS', 'unclear'],
  ['BASE_SOURCE_UNAVAILABLE', 'ops'],
  ['BASE_CONTENT_UNAVAILABLE', 'ops'],
  ['BASE_SOURCE_NOT_FOUND', 'ops'],
  ['BASE_SOURCE_NOT_CONFIGURED', 'ops'],
  ['BASE_SOURCE_CHANGED', 'ops'],
  ['BASE_STAMP_TOO_LONG', 'stamp'],
  ['BASE_SNAPSHOT_INVALID', 'invalid-data'],
  ['SEND_STATE_UNRECORDED', 'unrecorded'],
  ['BASE_DELIVERY_SUPERSEDED', 'internal'],
  ['BASE_DELIVERY_NOT_FOUND', 'internal'],
  ['BASE_DELIVERY_FILES_INVALID', 'internal'],
  ['BASE_SUBSCRIBER_NOT_FOUND', 'internal'],
  ['EMAIL_RECIPIENT_CHANGED', 'internal'],
  ['INVALID_BASE_DELIVERY_INTENT', 'internal'],
  ['CLAIM_REQUIRED', 'internal'],
  ['CLAIM_LOST', 'internal'],
  ['ATTEMPTS_EXHAUSTED', 'internal'],
]

describe('getSendFailureKind', () => {
  it.each(CONTRACT_SEND_ERRORS)('classifies %s as %s', (code, kind) => {
    expect(getSendFailureKind(code)).toBe(kind)
  })

  it.each([['SOMETHING_NEW'], [null]])('falls back to unknown for %s', (code) => {
    expect(getSendFailureKind(code)).toBe('unknown')
  })

  it('gives every contract code a non-generic explanation', () => {
    const generic = getSendFailureExplanation('SOMETHING_NEW')
    for (const [code] of CONTRACT_SEND_ERRORS) {
      expect(getSendFailureExplanation(code)).not.toBe(generic)
    }
  })

  it('mirrors all 30 codes of the contract table', () => {
    expect(new Set(CONTRACT_SEND_ERRORS.map(([code]) => code)).size).toBe(30)
  })

  it('explains SEND_STATE_UNRECORDED', () => {
    expect(getSendFailureExplanation('SEND_STATE_UNRECORDED')).toBe(
      'No se pudo registrar el resultado de este envío. Revisa el aviso de abajo y, si procede, pulsa Reenviar.',
    )
  })

  it('uses the corrected texts for rejected and too-long stamps', () => {
    expect(getSendFailureExplanation('EMAIL_REQUEST_REJECTED')).toBe(
      'El proveedor rechazó el envío, normalmente por una dirección de email no válida. Corrige el email en la ficha y pulsa Reenviar.',
    )
    expect(getSendFailureExplanation('BASE_STAMP_TOO_LONG')).toBe(
      'El nombre y el email eran demasiado largos para la línea de licencia. Acórtalos en la ficha y pulsa Reenviar.',
    )
  })
})

describe('getAmbiguityWarning (possibly_delivered is the source of truth, whatever the code)', () => {
  it.each(CONTRACT_SEND_ERRORS)('%s: warns only when possibly_delivered is true', (code) => {
    const ambiguous = makeDelivery({ status: 'FAILED', last_error: code, possibly_delivered: true })
    const safe = makeDelivery({ status: 'FAILED', last_error: code, possibly_delivered: false })
    expect(getAmbiguityWarning(ambiguous)).toBe(AMBIGUOUS_WARNING)
    expect(getAmbiguityWarning(safe)).toBeNull()
    expect(getResendMessage(ambiguous, makeSubscriber())[0]).toBe(AMBIGUOUS_WARNING)
    expect(getResendMessage(safe, makeSubscriber())).not.toContain(AMBIGUOUS_WARNING)
  })

  it('never warns for SENT or PENDING', () => {
    expect(getAmbiguityWarning(makeDelivery({ status: 'SENT', possibly_delivered: true }))).toBeNull()
    expect(getAmbiguityWarning(makeDelivery({ status: 'PENDING', possibly_delivered: true }))).toBeNull()
  })
})

describe('getResendMessage (resend goes to the current address)', () => {
  it('SENT, same address', () => {
    expect(getResendMessage(makeDelivery(), makeSubscriber())).toEqual([
      'Este mes ya se envió. Se volverá a enviar el mismo material.',
      'Se enviará a ana@example.com.',
    ])
  })

  it('mentions the previous address when the email changed', () => {
    const lines = getResendMessage(makeDelivery({ snapshot_email: 'ana-vieja@example.com' }), makeSubscriber())
    expect(lines).toContain('Se enviará a ana@example.com.')
    expect(lines).toContain('La vez anterior se envió a ana-vieja@example.com.')
    expect(lines.join(' ')).not.toMatch(/guardad/)
  })

  it('FAILED not ambiguous is a plain retry', () => {
    expect(getResendMessage(makeDelivery({ status: 'FAILED', last_error: 'EMAIL_REQUEST_REJECTED' }), makeSubscriber())[0]).toBe(
      'Se volverá a intentar el envío.',
    )
  })

  it('a FAILED BASE_STAMP_TOO_LONG delivery can be resent', () => {
    expect(canResendDelivery(makeDelivery({ status: 'FAILED', last_error: 'BASE_STAMP_TOO_LONG' }), makeSubscriber())).toBe(true)
    expect(canResendDelivery(makeDelivery({ status: 'PENDING' }), makeSubscriber())).toBe(false)
    expect(canResendDelivery(makeDelivery({ status: 'SENT' }), makeSubscriber({ is_archived: true }))).toBe(false)
  })
})

describe('buildUpdatePayload', () => {
  const base = { name: 'Ana Pérez', email: 'ana@example.com', goal: 'perder-grasa', days_per_week: '3', notes: '' }

  it('is empty when nothing changed (case and spacing normalised)', () => {
    expect(buildUpdatePayload(makeSubscriber(), { ...base, name: ' Ana   Pérez ', email: 'ANA@example.com' })).toEqual({})
  })

  it('includes only changed fields and clears notes with null', () => {
    const subscriber = makeSubscriber({ notes: 'Bizum' })
    expect(buildUpdatePayload(subscriber, { ...base, notes: '', days_per_week: '4' })).toEqual({ days_per_week: 4, notes: null })
  })
})
