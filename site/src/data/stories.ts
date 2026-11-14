import { SILENT } from './silent';

export type StoryLine = [string, string];

export interface Story {
  lines: StoryLine[];
  sources: string[];
}

const REFLECTOR: Story = {
  lines: [
    ['Sent to', 'Bounce laser light straight back to Earth'],
    ['Found', 'The Moon drifts 3.8 cm farther away each year'],
    ['Now', 'Laser echoes still measure the distance to a centimeter'],
  ],
  sources: ['ilrs-lunar', 'nasa-apollo15-llrr'],
};

export const STORIES: Record<string, Story> = {
  voyager1: {
    lines: [
      ['Sent to', 'Fly past Jupiter and Saturn'],
      ['Found', 'The first signs of volcanoes on Io, in 1979'],
      ['Now', 'In interstellar space since August 2012'],
    ],
    sources: ['nasa-voyager1-mission', 'nasa-io-exploration'],
  },
  voyager2: {
    lines: [
      ['Sent to', 'Visit all four giant planets'],
      ['Found', 'The only close look at Uranus and Neptune'],
      ['Now', 'Also in interstellar space'],
    ],
    sources: ['nasa-voyager2-mission'],
  },
  newhorizons: {
    lines: [
      ['Sent to', 'Fly past Pluto'],
      ['Found', 'A heart shaped nitrogen glacier on Pluto'],
      ['Now', 'Past Arrokoth, the farthest object explored up close'],
    ],
    sources: ['nasa-new-horizons-mission'],
  },
  ingenuity: {
    lines: [
      ['Sent to', 'Try 5 test flights on another planet'],
      ['Found', 'Flight works in air 99% thinner than Earth’s'],
      ['Now', 'Grounded since rotor damage on flight 72'],
    ],
    sources: ['nasa-ingenuity-six-things', 'ingenuity-flight-72'],
  },
  a11: REFLECTOR,
  a14: REFLECTOR,
  a15: REFLECTOR,
  moon: REFLECTOR,
};

for (const s of SILENT) {
  STORIES[s.id] ??= {
    lines: [
      ['What', s.what],
      ['Found', s.found],
      ['End', s.statusLine],
    ],
    sources: s.sources,
  };
}

export function storyOf(id: string): Story | null {
  return STORIES[id] ?? null;
}
