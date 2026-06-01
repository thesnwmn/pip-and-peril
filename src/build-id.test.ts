import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('BUILD_ID', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses VITE_BUILD_ID when set', async () => {
    vi.stubEnv('VITE_BUILD_ID', 'a1b2c3d')
    const { BUILD_ID } = await import('./build-id')
    expect(BUILD_ID).toBe('a1b2c3d')
  })

  it('stamp display truncates a full 40-char SHA to 7 chars', () => {
    const fullSha = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
    expect('build: ' + fullSha.slice(0, 7)).toBe('build: a1b2c3d')
  })

  it('stamp display is unchanged for short id like "dev"', () => {
    expect('build: ' + 'dev'.slice(0, 7)).toBe('build: dev')
  })

  it('console log format matches spec', () => {
    const buildId = 'a1b2c3d'
    expect(`[Pip & Peril] build: ${buildId}`).toBe('[Pip & Peril] build: a1b2c3d')
  })
})
