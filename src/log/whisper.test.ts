import { describe, expect, it } from 'vitest'
import { whisperAlpha, WHISPER_FADE_IN_MS, WHISPER_HOLD_END_MS, WHISPER_TOTAL_MS } from './whisper'

describe('whisperAlpha', () => {
  it('is 0 at elapsed 0', () => {
    expect(whisperAlpha(0)).toBe(0)
  })

  it('reaches full opacity by end of fade-in', () => {
    expect(whisperAlpha(WHISPER_FADE_IN_MS)).toBe(1)
  })

  it('is fully opaque throughout the hold period', () => {
    expect(whisperAlpha(WHISPER_FADE_IN_MS + 1)).toBe(1)
    expect(whisperAlpha(1000)).toBe(1)
    expect(whisperAlpha(WHISPER_HOLD_END_MS - 1)).toBe(1)
    expect(whisperAlpha(WHISPER_HOLD_END_MS)).toBe(1)
  })

  it('fades out from 1 to 0 between hold-end and total', () => {
    const midFadeOut = (WHISPER_HOLD_END_MS + WHISPER_TOTAL_MS) / 2
    const alpha = whisperAlpha(midFadeOut)
    expect(alpha).toBeGreaterThan(0)
    expect(alpha).toBeLessThan(1)
    expect(alpha).toBeCloseTo(0.5, 5)
  })

  it('is 0 at total duration', () => {
    expect(whisperAlpha(WHISPER_TOTAL_MS)).toBe(0)
  })

  it('is 0 after total duration', () => {
    expect(whisperAlpha(WHISPER_TOTAL_MS + 1000)).toBe(0)
  })

  it('increases monotonically during fade-in', () => {
    expect(whisperAlpha(50)).toBeLessThan(whisperAlpha(100))
    expect(whisperAlpha(100)).toBeLessThan(whisperAlpha(150))
    expect(whisperAlpha(150)).toBeLessThan(whisperAlpha(WHISPER_FADE_IN_MS))
  })

  it('decreases monotonically during fade-out', () => {
    expect(whisperAlpha(WHISPER_HOLD_END_MS + 100)).toBeGreaterThan(whisperAlpha(WHISPER_HOLD_END_MS + 200))
    expect(whisperAlpha(WHISPER_HOLD_END_MS + 200)).toBeGreaterThan(whisperAlpha(WHISPER_HOLD_END_MS + 400))
  })
})
