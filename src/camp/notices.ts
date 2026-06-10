import type { MetaState } from '../meta/state'

export type NoticeCategory = 'enemy-activity' | 'merchant-sighting' | 'atmosphere' | 'past-run-echo'

export interface NoticeEntry {
  category: NoticeCategory
  text: string
}

export interface NoticeState {
  notices: [NoticeEntry, NoticeEntry]
  atmosphericLine: string
}

const ORDINALS = [
  '',
  'first', 'second', 'third', 'fourth', 'fifth',
  'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth',
  'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth',
]

const COMPARATIVES = ['louder', 'quieter', 'stranger', 'faster', 'colder', 'heavier', 'sharper']

const TEMPLATE_BANKS: Record<NoticeCategory, string[]> = {
  'enemy-activity': [
    'Rustling in the lower corridors. Bring something sharp.',
    'The scratching on the walls has been {comparative} than usual.',
    'Three travellers went in yesterday. One came back, and wouldn\'t say what they saw.',
    'No sign of the patrol they sent to the lower levels.',
    'Something pushed over a lamp stand near the second junction. No one owns up.',
    'Heavy footsteps in the deep last night. Whatever it is, it paces.',
    'Bite marks on the rope near the lower gate. Fresh ones.',
    'A trap was sprung near the first arch. Nothing in it. Something avoided it.',
  ],
  'merchant-sighting': [
    'A heavyset badger was seen descending with a full pack. Looking to sell, by the look of him.',
    'Word is there\'s a tinker camped near the second landing. If he\'s still there.',
    'Smells of pine pitch and dried herbs on the upper stairs. Someone passed through recently.',
    'A price list pinned near the first doorway. Hand-drawn. Mostly legible.',
    'Two packs left unattended near the first arch. Owner not seen since.',
    'A candle set in a niche at the first turning. Old trader\'s signal. Someone\'s open for business.',
    'Wax drips on the steps past the second torch. Visitor, probably. Carrying inventory.',
  ],
  'atmosphere': [
    'The deep smells wrong tonight.',
    'The torches are burning {comparative} than yesterday. No one\'s touched them.',
    'Cold air from below, even though the season is warm.',
    'Something shifted in the night. Can\'t say what.',
    'Descent {run_count_ordinal}. The dungeon doesn\'t look different from here, but it feels it.',
    'The walls have been sweating. Not unusual for this depth, but more than usual.',
    'Pip\'s ears catch something at the threshold — not a sound, exactly. More of an absence.',
    'The shadows near the lower arch seem {comparative} than they did a day ago.',
  ],
  'past-run-echo': [
    'Someone left marks on the wall near the entrance. Fresh scratches. A tally of some kind.',
    'The stairs still smell of the last descent. Or maybe that\'s just how it always is.',
    'Heard something moving down there last night. Rhythmic. Deliberate.',
    'Run {run_count}. Still standing. The dungeon must be slipping.',
    'The floor near the second arch shows recent scuffing. Something heavy came through.',
    'A scrap of cloth caught on the door hinge. Pip\'s colour. From the last run.',
    'Whatever was down there before — it\'s had time to regroup.',
  ],
}

function ordinalFromNumber(n: number): string {
  if (n >= 1 && n <= 20) return ORDINALS[n]
  return `${n}th`
}

function safeRunCount(metaState: MetaState): number {
  if (typeof metaState.runCount !== 'number' || isNaN(metaState.runCount)) {
    console.warn('MetaState.runCount is invalid; treating as 0')
    return 0
  }
  return metaState.runCount
}

function resolveVariables(template: string, metaState: MetaState): string {
  const runCount = safeRunCount(metaState)
  const comparative = COMPARATIVES[Math.floor(Math.random() * COMPARATIVES.length)]
  const ordinal = runCount >= 1 ? ordinalFromNumber(runCount) : 'this'

  return template
    .replace(/\{run_count\}/g, String(runCount))
    .replace(/\{run_count_ordinal\}/g, ordinal)
    .replace(/\{comparative\}/g, comparative)
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateNotices(metaState: MetaState): NoticeState {
  const runCount = safeRunCount(metaState)

  const eligibleCategories: NoticeCategory[] = [
    'enemy-activity',
    'merchant-sighting',
    'atmosphere',
  ]
  if (runCount > 0) eligibleCategories.push('past-run-echo')

  const categoryA = pickRandom(eligibleCategories)
  const remaining = eligibleCategories.filter((c) => c !== categoryA)
  const categoryB = pickRandom(remaining)

  const textA = resolveVariables(pickRandom(TEMPLATE_BANKS[categoryA]), metaState)
  const textB = resolveVariables(pickRandom(TEMPLATE_BANKS[categoryB]), metaState)

  if (textA.includes('{') || textB.includes('{')) {
    console.warn('Notice generated with unfilled variable slots:', textA, textB)
  }

  return {
    notices: [
      { category: categoryA, text: textA },
      { category: categoryB, text: textB },
    ],
    atmosphericLine: textA,
  }
}
