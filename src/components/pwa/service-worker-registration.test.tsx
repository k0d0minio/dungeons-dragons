import { render } from '@testing-library/react'

import { ServiceWorkerRegistration } from './service-worker-registration'

describe('ServiceWorkerRegistration (DND-048)', () => {
  const register = jest.fn(() => Promise.resolve())

  beforeEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    })
  })

  afterEach(() => {
    // @ts-expect-error -- test-only cleanup of the stub above
    delete navigator.serviceWorker
  })

  it('registers /sw.js in production', () => {
    const env = jest.replaceProperty(process.env, 'NODE_ENV', 'production')

    render(<ServiceWorkerRegistration />)

    expect(register).toHaveBeenCalledWith('/sw.js')
    env.restore()
  })

  it('stays out of the way outside production, where it would break hot reload', () => {
    render(<ServiceWorkerRegistration />)

    expect(register).not.toHaveBeenCalled()
  })

  it('renders nothing either way', () => {
    const { container } = render(<ServiceWorkerRegistration />)

    expect(container).toBeEmptyDOMElement()
  })
})
