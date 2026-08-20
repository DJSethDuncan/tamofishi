// Pure achievement definitions -- no DOM access, so this can be loaded and
// tested in isolation (see __tests__/achievement-conditions.test.js), same
// pattern as the entity files. The DOM-wiring runtime that consumes this
// (modal display, unlock persistence) lives in achievements.js instead.
//
// Entities being murdered or naturally dying aren't removed from the
// entities array immediately -- they linger for a fade-out animation (see
// fish.js's startDying / game.js's handleTap murder branch, both of which
// set e.dead to a countdown and leave the entity in place until it decays to
// 0). Every condition below is a live snapshot check ("N of these right
// now"), so a fading corpse still sitting in the array would otherwise be
// miscounted as present -- e.g. murdering down to 3 fish would still read as
// "10 creatures in the tank at once" for as long as the corpses take to fade.
// Filtering !e.dead first keeps every condition honest about what's actually
// alive in the tank at check time.
const aliveEntities = (entities) => entities.filter(e => !e.dead);

const ACHIEVEMENTS = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Add your first fish to the tank.',
    condition: (entities) => aliveEntities(entities).some(e => e.type === 'fish'),
  },
  {
    id: 'growing-family',
    name: 'Growing Family',
    description: 'Have 10 or more creatures in the tank at once.',
    condition: (entities) => {
      const liveCreatureTypes = ['fish', 'crab', 'shrimp', 'snail', 'turtle'];
      return aliveEntities(entities).filter(e => liveCreatureTypes.includes(e.type)).length >= 10;
    },
  },
  {
    id: 'full-house',
    name: 'Full House',
    description: 'Have at least one fish, crab, shrimp, snail, and turtle in the tank at the same time.',
    condition: (entities) => {
      const liveCreatureTypes = ['fish', 'crab', 'shrimp', 'snail', 'turtle'];
      const present = new Set(aliveEntities(entities).map(e => e.type));
      return liveCreatureTypes.every(t => present.has(t));
    },
  },
  {
    id: 'green-thumb',
    name: 'Green Thumb',
    description: 'Add a plant and a rock to the tank.',
    condition: (entities) => {
      const alive = aliveEntities(entities);
      return alive.some(e => e.type === 'plant') && alive.some(e => e.type === 'rock');
    },
  },
  {
    id: 'bubbly',
    name: 'Bubbly',
    description: 'Add a bubbler rock to the tank.',
    condition: (entities) => aliveEntities(entities).some(e => e.type === 'bubbler-rock'),
  },
];

// 'well-fed' has no condition -- it's event-driven (see game.js's feedAt,
// which calls Achievements.unlock('well-fed') directly) since "fed at
// least once" isn't observable from an entities snapshot alone.
ACHIEVEMENTS.push({ id: 'well-fed', name: 'Well Fed', description: 'Feed the fish for the first time.', condition: null });

// Concurrent-count achievements below check the *current* entities snapshot
// each time Achievements.check() runs (every 3s) -- once true at any check
// tick, unlock() locks it in permanently, so this correctly captures "N at
// once", not a running historical max that would need separate tracking.
const countOf = (entities, type) => aliveEntities(entities).filter(e => e.type === type).length;

[
  { id: 'escargogogo',     name: 'Escargogogo',        type: 'snail',        n: 25 },
  { id: 'checkers',        name: 'You Should Get Checked', type: 'crab',     n: 25 },
  { id: 'aerator-in-chief', name: 'Aerator in Chief',   type: 'bubbler-rock', n: 25 },
  { id: 'cocktail',        name: 'Cocktail',            type: 'shrimp',      n: 25 },
  { id: 'forest-for-trees', name: 'Forest for the Trees', type: 'plant',     n: 25 },
  { id: 'amaze-x3',        name: 'AMAZE AMAZE AMAZE',   type: 'rock',        n: 25 },
  { id: 'dwayne',          name: 'Dwayne',              type: 'rock',        n: 10 },
  { id: 'turtles-all-way-down', name: 'Turtles All the Way Down', type: 'turtle', n: 25 },
  { id: 'splinter',        name: 'Splinter',            type: 'turtle',      n: 4 },
  { id: 'shadows',         name: 'What We Do in the Shadows', type: 'duckweed', n: 50 },
].forEach(({ id, name, type, n }) => {
  ACHIEVEMENTS.push({
    id, name,
    description: `Have ${n} ${type === 'bubbler-rock' ? 'bubblers' : type + (n === 1 ? '' : 's')} in the tank at the same time.`,
    condition: (entities) => countOf(entities, type) >= n,
  });
});

// Event-driven: incremented directly at the point of the real event (murder
// via game.js's handleTap, births in fish.js/shrimp.js, bubbles in
// bubblerrock.js) rather than derived from a live entities snapshot, since
// murdered/born/blown counts aren't observable from "what's in the tank
// right now" the way concurrent-count achievements above are.
[
  { n: 50,     id: 'fish-born-50',    name: 'Nursery' },
  { n: 100,    id: 'fish-born-100',   name: 'Baby Boom' },
  { n: 250,    id: 'fish-born-250',   name: 'Fish Factory' },
  { n: 1000,   id: 'fish-born-1000',  name: 'Population Explosion' },
  { n: 2500,   id: 'fish-born-2500',  name: 'Overflow' },
  { n: 10000,  id: 'fish-born-10000', name: 'The Big Bang' },
].forEach(({ n, id, name }) => {
  ACHIEVEMENTS.push({
    id, name,
    description: `${n.toLocaleString()} fish born in this tank.`,
    condition: (entities, stats) => (stats?.fishBorn ?? 0) >= n,
  });
});

[
  { n: 10,   id: 'fish-murdered-10',   name: 'First Blood' },
  { n: 25,   id: 'fish-murdered-25',   name: 'Serial Killer' },
  { n: 50,   id: 'fish-murdered-50',   name: 'Mass Murderer' },
  { n: 100,  id: 'fish-murdered-100',  name: 'Kingpin' },
  { n: 1000, id: 'fish-murdered-1000', name: 'Apex Predator' },
].forEach(({ n, id, name }) => {
  ACHIEVEMENTS.push({
    id, name,
    description: `${n.toLocaleString()} fish murdered.`,
    condition: (entities, stats) => (stats?.fishMurdered ?? 0) >= n,
  });
});

ACHIEVEMENTS.push({
  id: 'shredder',
  name: 'Shredder',
  description: '4 turtles murdered.',
  condition: (entities, stats) => (stats?.turtlesMurdered ?? 0) >= 4,
});

// The Hindenburg's hydrogen envelope held roughly 200,000 m^3 of gas -- not a
// literal bubble-for-bubble count, just the flavor threshold this achievement
// is named after. 10,000 matches the top tier of the fish-born ladder for a
// consistent "big round number" feel.
ACHIEVEMENTS.push({
  id: 'oh-the-humanity',
  name: 'Oh the Humanity',
  description: 'Enough bubbles blown to have flown the Hindenburg.',
  condition: (entities, stats) => (stats?.bubblesBlown ?? 0) >= 10000,
});

[
  { days: 1,    id: 'tank-age-1',    name: 'Day One' },
  { days: 7,    id: 'tank-age-7',    name: 'One Week Strong' },
  { days: 30,   id: 'tank-age-30',   name: 'Monthly Regular' },
  { days: 365,  id: 'tank-age-365',  name: 'Anniversary' },
  { days: 1000, id: 'tank-age-1000', name: 'Ancient Tank' },
].forEach(({ days, id, name }) => {
  ACHIEVEMENTS.push({
    id, name,
    description: `This tank is ${days.toLocaleString()} day${days === 1 ? '' : 's'} old.`,
    condition: (entities, stats) => stats?.tankCreatedAt != null
      && (Date.now() - stats.tankCreatedAt) / 86400000 >= days,
  });
});

ACHIEVEMENTS.push({
  id: 'no-future',
  name: 'No Future but What We Make',
  description: 'Clear a tank.',
  condition: (entities, stats) => (stats?.tankCleared ?? 0) >= 1,
});
