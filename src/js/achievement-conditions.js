// Pure achievement definitions -- no DOM access, so this can be loaded and
// tested in isolation (see __tests__/achievement-conditions.test.js), same
// pattern as the entity files. The DOM-wiring runtime that consumes this
// (modal display, unlock persistence) lives in achievements.js instead.
const ACHIEVEMENTS = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Add your first fish to the tank.',
    condition: (entities) => entities.some(e => e.type === 'fish'),
  },
  {
    id: 'growing-family',
    name: 'Growing Family',
    description: 'Have 10 or more creatures in the tank at once.',
    condition: (entities) => {
      const liveCreatureTypes = ['fish', 'crab', 'shrimp', 'snail', 'turtle'];
      return entities.filter(e => liveCreatureTypes.includes(e.type)).length >= 10;
    },
  },
  {
    id: 'full-house',
    name: 'Full House',
    description: 'Have at least one fish, crab, shrimp, snail, and turtle in the tank at the same time.',
    condition: (entities) => {
      const liveCreatureTypes = ['fish', 'crab', 'shrimp', 'snail', 'turtle'];
      const present = new Set(entities.map(e => e.type));
      return liveCreatureTypes.every(t => present.has(t));
    },
  },
  {
    id: 'green-thumb',
    name: 'Green Thumb',
    description: 'Add a plant and a rock to the tank.',
    condition: (entities) => entities.some(e => e.type === 'plant') && entities.some(e => e.type === 'rock'),
  },
  {
    id: 'bubbly',
    name: 'Bubbly',
    description: 'Add a bubbler rock to the tank.',
    condition: (entities) => entities.some(e => e.type === 'bubbler-rock'),
  },
];

// 'well-fed' has no condition -- it's event-driven (see game.js's feedAt,
// which calls Achievements.unlock('well-fed') directly) since "fed at
// least once" isn't observable from an entities snapshot alone.
ACHIEVEMENTS.push({ id: 'well-fed', name: 'Well Fed', description: 'Feed the fish for the first time.', condition: null });
