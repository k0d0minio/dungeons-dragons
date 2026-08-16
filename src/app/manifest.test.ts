import manifest from './manifest'

describe('web app manifest (DND-048)', () => {
  const result = manifest()

  it('installs as a standalone app starting at the reference browser', () => {
    expect(result.display).toBe('standalone')
    expect(result.start_url).toBe('/')
    expect(result.name).toBe('D&D 5e Companion')
    expect(result.short_name).toBe('D&D 5e')
  })

  it('offers both required icon sizes, for any and maskable purposes', () => {
    const bySize = (size: string, purpose: string) =>
      result.icons?.find((icon) => icon.sizes === size && icon.purpose === purpose)

    for (const size of ['192x192', '512x512']) {
      expect(bySize(size, 'any')).toBeDefined()
      expect(bySize(size, 'maskable')).toBeDefined()
    }
  })

  it('matches the dark themeColor the layout already declares', () => {
    expect(result.background_color).toBe('#0a0a0a')
    expect(result.theme_color).toBe('#0a0a0a')
  })
})
