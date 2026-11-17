import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ auth: { currentUser: { uid: 'A' } }, token: vi.fn() }))
vi.mock('./firebase', () => ({ auth: mocks.auth, getIdToken: mocks.token }))
vi.mock('sonner', () => ({ toast: { info: vi.fn() } }))
import { api } from './api'
import { holdLoginRedirect, type LoginRedirectHold, redirectToLogin } from './login-redirect'

let location: { pathname: string; href: string }
const holds: LoginRedirectHold[] = []
const hold = () => {
  const next = holdLoginRedirect()
  holds.push(next)
  return next
}

function respondWith(status: number) {
  api.defaults.adapter = async (config) => {
    const response = { data: { statusCode: status, message: 'error' }, status, statusText: 'error', headers: {}, config }
    if (status >= 400) throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response)
    return response
  }
}

beforeEach(() => {
  mocks.token.mockResolvedValue('test-token-A')
  location = { pathname: '/diets', href: 'http://localhost/diets' }
  vi.stubGlobal('location', location)
})

afterEach(() => {
  // Never leak a hold (module state) into the next test.
  for (const pending of holds.splice(0)) pending.release()
  vi.unstubAllGlobals()
})

describe('redirectToLogin', () => {
  it('redirects at once when nothing holds the redirect', () => {
    redirectToLogin({ deferrable: true })
    expect(location.href).toBe('/login')
  })

  it('does not navigate again when already on /login', () => {
    location.pathname = '/login'
    location.href = 'http://localhost/login'
    redirectToLogin({ deferrable: false })
    expect(location.href).toBe('http://localhost/login')
  })

  it('defers a deferrable redirect while held and runs it once released', () => {
    const batch = hold()
    redirectToLogin({ deferrable: true })

    expect(location.href).toBe('http://localhost/diets')
    expect(batch.isRedirectPending()).toBe(true)

    batch.release()
    expect(location.href).toBe('/login')
    expect(batch.isRedirectPending()).toBe(false)
  })

  it('still redirects other 401s at once while held if nothing was deferred yet', () => {
    const batch = hold()
    redirectToLogin({ deferrable: false })

    expect(location.href).toBe('/login')
    expect(batch.isRedirectPending()).toBe(false)
  })

  it('defers every 401 once a redirect is pending: the session is already known to be invalid', () => {
    const batch = hold()
    redirectToLogin({ deferrable: true })
    redirectToLogin({ deferrable: false })

    expect(location.href).toBe('http://localhost/diets')
    batch.release()
    expect(location.href).toBe('/login')
  })

  it('waits for the last hold and ignores repeated releases', () => {
    const first = hold()
    const second = hold()
    redirectToLogin({ deferrable: true })

    first.release()
    first.release()
    expect(location.href).toBe('http://localhost/diets')

    second.release()
    expect(location.href).toBe('/login')
  })

  it('does not redirect on release when no 401 arrived', () => {
    hold().release()
    expect(location.href).toBe('http://localhost/diets')
  })
})

describe('api 401 interceptor', () => {
  it('redirects at once on a 401 of any request when no batch holds the redirect', async () => {
    respondWith(401)
    await expect(api.get('/diets')).rejects.toMatchObject({ response: { status: 401 } })
    expect(location.href).toBe('/login')
  })

  it('redirects at once on a flagged 401 when no batch holds the redirect', async () => {
    respondWith(401)
    await expect(api.delete('/diets/d-1', { deferLoginRedirect: true })).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(location.href).toBe('/login')
  })

  it('redirects at once on an unflagged 401 during a batch that has not hit a 401', async () => {
    hold()
    respondWith(401)
    await expect(api.get('/diets')).rejects.toMatchObject({ response: { status: 401 } })
    expect(location.href).toBe('/login')
  })

  it('defers the 401 of a flagged batch request until the batch releases the redirect', async () => {
    const batch = hold()
    respondWith(401)
    await expect(api.delete('/diets/d-1', { deferLoginRedirect: true })).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(location.href).toBe('http://localhost/diets')

    batch.release()
    expect(location.href).toBe('/login')
  })

  it('never redirects for the auth routes, held or not', async () => {
    respondWith(401)
    await expect(api.post('/auth/login', {})).rejects.toMatchObject({ response: { status: 401 } })
    expect(location.href).toBe('http://localhost/diets')
  })
})
