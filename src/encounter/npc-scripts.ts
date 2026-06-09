export type ApproachColour = 'red' | 'green' | 'blue' | 'yellow'
export type NodeId = string

export interface CheckSpec {
  title: string
  approaches: ApproachColour[]
  difficulty: number
  stakeSuccess: string
  stakeCost: string
  stakeFail: string
  successLine: string
  costLine: string
  failLine: string
  critLine?: string
  critBonus?: NpcReward
}

export interface NpcReward {
  gold?: number
  item?: string
  hint?: string
}

export interface NpcResponse {
  label: string
  check?: CheckSpec
  next?: NodeId
  nextSuccess?: NodeId
  nextCost?: NodeId
  nextFail?: NodeId
  nextCrit?: NodeId
  reward?: NpcReward
  isLeave?: boolean
  isTerminal?: boolean
}

export interface NpcNode {
  npcLine: string
  responses: NpcResponse[]
}

export interface NpcScript {
  archetypeId: 'rat-scavenger' | 'frightened-mouse' | 'old-hermit'
  portraitId: string
  dismissalLines: string[]
  rootNode: NodeId
  nodes: Record<NodeId, NpcNode>
  hintPool: string[]
}

export const RAT_SCAVENGER: NpcScript = {
  archetypeId: 'rat-scavenger',
  portraitId: 'rat-scavenger',
  dismissalLines: [
    "We've talked already.",
    "I've nothing more for you.",
    "You've had your answer.",
  ],
  rootNode: 'root',
  nodes: {
    root: {
      npcLine: "Oi, mouse. You've got that look — the one that says you're going the wrong way.",
      responses: [
        {
          label: 'What do you know?',
          check: {
            title: 'Gather Information',
            approaches: ['blue', 'yellow'],
            difficulty: 2,
            stakeSuccess: 'He tells you something useful.',
            stakeCost: 'He tells you something vague.',
            stakeFail: 'He tells you nothing.',
            successLine: 'Fine. There\'s something in that direction worth your time.',
            costLine: 'Mm. Could be worse down the east passage. Or it couldn\'t.',
            failLine: 'Nothing, for you.',
            critLine: 'Not bad. Here — and this, in case you need it.',
          },
          nextSuccess: 'success-outcome',
          nextCost: 'cost-outcome',
          nextFail: 'fail-outcome',
          nextCrit: 'crit-outcome',
        },
        {
          label: 'Never mind.',
          isLeave: true,
        },
      ],
    },
    'success-outcome': {
      npcLine: 'Fine. There\'s something in that direction worth your time.',
      responses: [
        {
          label: 'Thanks.',
          isTerminal: true,
          reward: { hint: 'Something large moves on the floor below. I could hear it through the stone.' },
        },
      ],
    },
    'cost-outcome': {
      npcLine: 'Mm. Could be worse down the east passage. Or it couldn\'t.',
      responses: [
        {
          label: 'I\'ll take my chances.',
          isTerminal: true,
          reward: { hint: 'The thing in the next chamber goes quiet when it hears you first.' },
        },
      ],
    },
    'fail-outcome': {
      npcLine: 'Nothing, for you.',
      responses: [
        {
          label: 'Right then.',
          isTerminal: true,
        },
      ],
    },
    'crit-outcome': {
      npcLine: 'Not bad. Here — and this, in case you need it.',
      responses: [
        {
          label: 'Much obliged.',
          isTerminal: true,
          reward: { gold: 3, hint: 'The one who rules this place keeps its guard close.' },
        },
      ],
    },
  },
  hintPool: [
    'Something large moves on the floor below. I could hear it through the stone.',
    'The thing in the next chamber goes quiet when it hears you first. Don\'t let it hear you first.',
    'Follow the bones — they\'ll point the way to power.',
  ],
}

export const FRIGHTENED_MOUSE: NpcScript = {
  archetypeId: 'frightened-mouse',
  portraitId: 'frightened-mouse',
  dismissalLines: [
    'You were kind before. I won\'t forget.',
    'I\'ve calmed down now. I\'ll be all right.',
    'Still here. Still hiding. I\'ll move on soon.',
  ],
  rootNode: 'root',
  nodes: {
    root: {
      npcLine: 'Oh! Sorry — I didn\'t hear you. I\'ve been hiding here a while.',
      responses: [
        {
          label: '[Reassure them]',
          check: {
            title: 'Offer Comfort',
            approaches: ['yellow', 'green'],
            difficulty: 2,
            stakeSuccess: 'They relax and share something.',
            stakeCost: 'They calm a little, but have nothing left.',
            stakeFail: 'They stay frightened and won\'t speak.',
            successLine: 'Oh. You\'re… you\'re kind. Here, take this — I won\'t need it now.',
            costLine: 'I… thank you. I\'ve nothing left to give, but — thank you.',
            failLine: 'Sorry. I can\'t. I\'m sorry.',
            critLine: 'You\'re the first kind voice in days. Take this, and — there\'s something you should know.',
          },
          nextSuccess: 'success-outcome',
          nextCost: 'cost-outcome',
          nextFail: 'fail-outcome',
          nextCrit: 'crit-outcome',
        },
        {
          label: 'Sorry to bother you.',
          isLeave: true,
        },
      ],
    },
    'success-outcome': {
      npcLine: 'Oh. You\'re… you\'re kind. Here, take this — I won\'t need it now.',
      responses: [
        {
          label: 'Stay safe.',
          isTerminal: true,
          reward: { item: 'cheese-crumb' },
        },
      ],
    },
    'cost-outcome': {
      npcLine: 'I… thank you. I\'ve nothing left to give, but — thank you.',
      responses: [
        {
          label: 'Be well.',
          isTerminal: true,
        },
      ],
    },
    'fail-outcome': {
      npcLine: 'Sorry. I can\'t. I\'m sorry.',
      responses: [
        {
          label: 'It\'s all right.',
          isTerminal: true,
        },
      ],
    },
    'crit-outcome': {
      npcLine: 'You\'re the first kind voice in days. Take this, and — there\'s something you should know.',
      responses: [
        {
          label: 'I\'m listening.',
          isTerminal: true,
          reward: { item: 'cheese-crumb', hint: 'The passage walls glow with an old light. Watch your step.' },
        },
      ],
    },
  },
  hintPool: [
    'The passage walls glow with an old light. Watch your step.',
    'I heard something moving in the deeper dark. It had too many legs.',
    'There\'s a warmth coming from below. The air smells like stone and age.',
  ],
}

export const OLD_HERMIT: NpcScript = {
  archetypeId: 'old-hermit',
  portraitId: 'old-hermit',
  dismissalLines: [
    'We\'ve spoken. The rest is yours to find.',
    'I\'ve given you what I can.',
    'You know what you know. Go use it.',
  ],
  rootNode: 'root',
  nodes: {
    root: {
      npcLine: 'You\'re the third one through here this moon. The others didn\'t ask the right questions.',
      responses: [
        {
          label: 'What are the right questions?',
          check: {
            title: 'Seek Wisdom',
            approaches: ['blue', 'red'],
            difficulty: 3,
            stakeSuccess: 'Something specific about what lies ahead.',
            stakeCost: 'Something partial and cryptic.',
            stakeFail: 'Nothing useful — they dismiss you.',
            successLine: 'Ah. Yes. That one.',
            costLine: 'Closer. Think about what casts a long shadow on the floor below.',
            failLine: 'That wasn\'t it.',
            critLine: 'Very good. Sit. I\'ll tell you what I know — and what to watch for.',
          },
          nextSuccess: 'success-outcome',
          nextCost: 'cost-outcome',
          nextFail: 'fail-outcome',
          nextCrit: 'crit-outcome',
        },
        {
          label: 'Interesting.',
          isLeave: true,
        },
      ],
    },
    'success-outcome': {
      npcLine: 'Ah. Yes. That one.',
      responses: [
        {
          label: 'Thank you.',
          isTerminal: true,
          reward: { hint: 'The one who rules this place watches from above. Keep to the shadows.' },
        },
      ],
    },
    'cost-outcome': {
      npcLine: 'Closer. Think about what casts a long shadow on the floor below.',
      responses: [
        {
          label: 'I understand.',
          isTerminal: true,
          reward: { hint: 'Shadows move where the light doesn\'t reach.' },
        },
      ],
    },
    'fail-outcome': {
      npcLine: 'That wasn\'t it.',
      responses: [
        {
          label: 'My mistake.',
          isTerminal: true,
        },
      ],
    },
    'crit-outcome': {
      npcLine: 'Very good. Sit. I\'ll tell you what I know — and what to watch for.',
      responses: [
        {
          label: 'I\'m ready.',
          isTerminal: true,
          reward: { hint: 'The one who rules this place keeps its guard close. Follow the bones — they\'ll point the way.' },
        },
      ],
    },
  },
  hintPool: [
    'The one who rules this place watches from above. Keep to the shadows.',
    'Shadows move where the light doesn\'t reach.',
    'The bones never lie about where the strong ones nest.',
  ],
}

export const NPC_SCRIPTS: Record<string, NpcScript> = {
  'rat-scavenger': RAT_SCAVENGER,
  'frightened-mouse': FRIGHTENED_MOUSE,
  'old-hermit': OLD_HERMIT,
}
